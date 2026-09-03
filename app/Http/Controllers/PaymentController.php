<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentBatch;
use App\Models\PnlPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);

        $search = trim((string) $request->get('q', ''));

        // Coming from a Dashboard aging bucket: that report spans every period
        // (it's "how old is this unpaid invoice", not period-scoped), so this
        // pulls the matching invoices across all periods instead of the usual
        // single-period view.
        $agingActive = $search === '' && ($request->has('aging_from') || $request->has('aging_to'));

        if ($search !== '') {
            // A single payment (e.g. one big check) commonly settles invoices
            // spread across several periods. Rather than making the user find
            // and switch to each invoice's period, searching by invoice no. or
            // customer looks across every period at once.
            $currentPeriod = null;
            $invoiceQuery = Invoice::with(['customer:id,name', 'period:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')->with('batch:id,check_no,bank_name')])
                ->where(function ($q) use ($search) {
                    $q->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
                })
                ->orderByDesc('invoice_date');
        } elseif ($agingActive) {
            $currentPeriod = null;
            $invoiceQuery = Invoice::with(['customer:id,name', 'period:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')->with('batch:id,check_no,bank_name')])
                ->whereIn('status', ['sent', 'partial', 'overdue'])
                ->whereRaw('DATEDIFF(NOW(), due_date) BETWEEN ? AND ?', [
                    $request->filled('aging_from') ? (int) $request->aging_from : -100000,
                    $request->filled('aging_to') ? (int) $request->aging_to : 100000,
                ])
                ->orderBy('due_date');
        } else {
            $currentPeriod = $request->period_id
                ? PnlPeriod::find($request->period_id)
                : $periods->first();

            $invoiceQuery = $currentPeriod
                ? Invoice::with(['customer:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')->with('batch:id,check_no,bank_name')])
                    ->where('pnl_period_id', $currentPeriod->id)
                    ->orderByRaw('CAST(invoice_no AS UNSIGNED) asc')
                    ->orderBy('invoice_no')
                : null;
        }

        $invoices = $invoiceQuery
            ? $invoiceQuery->get()->map(function (Invoice $invoice) {
                $invoice->items->each(function ($item) {
                    $item->paid = (float) $item->paymentItems->sum('amount');
                    $item->balance = round((float) $item->amount - $item->paid, 4);
                });
                return $invoice;
            })
            : collect();

        $agingFilter = $agingActive ? [
            'from' => $request->filled('aging_from') ? (int) $request->aging_from : null,
            'to'   => $request->filled('aging_to') ? (int) $request->aging_to : null,
        ] : null;

        return Inertia::render('Payments/Index', compact('periods', 'currentPeriod', 'invoices', 'agingFilter', 'search'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'invoice_id'                 => 'required|exists:invoices,id',
            'payment_date'                => 'required|date',
            'amount'                      => 'required|numeric|min:0.01',
            'tax_withheld'                => 'nullable|numeric|min:0',
            'wt_cert_no'                  => 'nullable|string|max:100',
            'wt_cert_date'                => 'nullable|date',
            'method'                      => 'nullable|string|max:50',
            'reference_no'                => 'nullable|string|max:100',
            'bank_name'                   => 'required_if:method,Check|nullable|string|max:150',
            'check_no'                    => 'required_if:method,Check|nullable|string|max:100',
            'check_date'                  => 'required_if:method,Check|nullable|date',
            'notes'                       => 'nullable|string',
            'allocations'                 => 'required|array|min:1',
            'allocations.*.invoice_item_id' => 'required|exists:invoice_items,id',
            'allocations.*.amount'        => 'required|numeric|min:0',
        ]);

        $taxWithheld = $validated['tax_withheld'] ?? 0;

        $invoice = Invoice::with('items.paymentItems')->findOrFail($validated['invoice_id']);
        abort_if($invoice->period?->is_closed, 403, 'Period is closed.');

        $allocations = collect($validated['allocations'])->filter(fn ($a) => $a['amount'] > 0)->values();

        // Allocations settle each item's balance, and can be funded either by
        // actual cash/check received (amount) or by tax the customer withheld
        // on your behalf (tax_withheld) — both reduce what the customer still
        // owes, so allocations must cover their combined total, not just cash.
        $this->validateAllocations($allocations, $validated['amount'] + $taxWithheld, $invoice);

        DB::transaction(function () use ($invoice, $validated, $taxWithheld, $allocations) {
            $payment = $invoice->payments()->create([
                'payment_date' => $validated['payment_date'],
                'amount'       => $validated['amount'],
                'tax_withheld' => $taxWithheld,
                'wt_cert_no'   => $validated['wt_cert_no'] ?? null,
                'wt_cert_date' => $validated['wt_cert_date'] ?? null,
                'method'       => $validated['method'] ?? null,
                'reference_no' => $validated['reference_no'] ?? null,
                'bank_name'    => $validated['bank_name'] ?? null,
                'check_no'     => $validated['check_no'] ?? null,
                'check_date'   => $validated['check_date'] ?? null,
                'notes'        => $validated['notes'] ?? null,
            ]);

            foreach ($allocations as $alloc) {
                $payment->items()->create([
                    'invoice_item_id' => $alloc['invoice_item_id'],
                    'amount'          => $alloc['amount'],
                ]);
            }

            $this->recomputeInvoice($invoice);
        });

        return back()->with('success', 'Payment recorded.');
    }

    public function destroy(Payment $payment): RedirectResponse
    {
        $invoice = $payment->invoice;
        abort_if($invoice->period?->is_closed, 403, 'Period is closed.');

        DB::transaction(function () use ($payment, $invoice) {
            $batch = $payment->batch;
            $payment->delete();
            $this->recomputeInvoice($invoice);

            // Deleting the last leg of a multi-invoice check leaves an empty
            // batch shell behind — clean it up so it doesn't linger unseen.
            if ($batch && $batch->payments()->doesntExist()) {
                $batch->delete();
            }
        });

        return back()->with('success', 'Payment deleted.');
    }

    /**
     * JSON lookup used by the multi-invoice payment picker: outstanding
     * invoices (any period) matching invoice no. or customer name, with
     * each item's current balance so allocations can be entered inline.
     */
    public function searchInvoices(Request $request): \Illuminate\Http\JsonResponse
    {
        $search = trim((string) $request->get('q', ''));

        $invoices = Invoice::with(['customer:id,name', 'period:id,name,is_closed', 'items.paymentItems'])
            ->whereIn('status', ['sent', 'partial', 'overdue'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($q) use ($search) {
                    $q->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('invoice_date')
            ->limit(20)
            ->get()
            ->map(function (Invoice $invoice) {
                $invoice->items->each(function ($item) {
                    $item->paid = (float) $item->paymentItems->sum('amount');
                    $item->balance = round((float) $item->amount - $item->paid, 4);
                });
                $invoice->balance = round((float) $invoice->total_amount - (float) $invoice->paid_amount, 4);
                return $invoice;
            })
            ->filter(fn ($invoice) => $invoice->balance > 0.0001 && ! $invoice->period?->is_closed)
            ->values();

        return response()->json($invoices);
    }

    /**
     * Records one real-world payment (typically a single check) that settles
     * multiple invoices at once. Creates one PaymentBatch header plus one
     * Payment per invoice — each invoice keeps exactly the same per-invoice
     * math (allocations, recompute) it would get from a single-invoice
     * payment, they just share the batch for grouped display/deletion.
     */
    public function storeBatch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payment_date'                          => 'required|date',
            'method'                                 => 'nullable|string|max:50',
            'reference_no'                            => 'nullable|string|max:100',
            'bank_name'                               => 'required_if:method,Check|nullable|string|max:150',
            'check_no'                                => 'required_if:method,Check|nullable|string|max:100',
            'check_date'                              => 'required_if:method,Check|nullable|date',
            'wt_cert_no'                               => 'nullable|string|max:100',
            'wt_cert_date'                             => 'nullable|date',
            'notes'                                   => 'nullable|string',
            'invoices'                                 => 'required|array|min:2',
            'invoices.*.invoice_id'                     => 'required|distinct|exists:invoices,id',
            'invoices.*.amount'                         => 'required|numeric|min:0.01',
            'invoices.*.tax_withheld'                   => 'nullable|numeric|min:0',
            'invoices.*.allocations'                    => 'required|array|min:1',
            'invoices.*.allocations.*.invoice_item_id'  => 'required|exists:invoice_items,id',
            'invoices.*.allocations.*.amount'           => 'required|numeric|min:0',
        ]);

        $invoiceIds = collect($validated['invoices'])->pluck('invoice_id');
        $invoices = Invoice::with('items.paymentItems', 'period')->whereIn('id', $invoiceIds)->get()->keyBy('id');

        foreach ($validated['invoices'] as $entry) {
            abort_if($invoices[$entry['invoice_id']]->period?->is_closed, 403, 'One of the selected invoices is in a closed period.');
        }

        DB::transaction(function () use ($validated, $invoices) {
            $batch = PaymentBatch::create([
                'payment_date'  => $validated['payment_date'],
                'method'        => $validated['method'] ?? null,
                'reference_no'  => $validated['reference_no'] ?? null,
                'bank_name'     => $validated['bank_name'] ?? null,
                'check_no'      => $validated['check_no'] ?? null,
                'check_date'    => $validated['check_date'] ?? null,
                'wt_cert_no'    => $validated['wt_cert_no'] ?? null,
                'wt_cert_date'  => $validated['wt_cert_date'] ?? null,
                'notes'         => $validated['notes'] ?? null,
            ]);

            foreach ($validated['invoices'] as $entry) {
                $invoice = $invoices[$entry['invoice_id']];
                $taxWithheld = $entry['tax_withheld'] ?? 0;
                $allocations = collect($entry['allocations'])->filter(fn ($a) => $a['amount'] > 0)->values();

                $this->validateAllocations($allocations, $entry['amount'] + $taxWithheld, $invoice);

                $payment = $invoice->payments()->create([
                    'payment_batch_id' => $batch->id,
                    'payment_date'      => $validated['payment_date'],
                    'amount'            => $entry['amount'],
                    'tax_withheld'      => $taxWithheld,
                    // The 2307 certificate is one document covering the whole
                    // batch (not per invoice), so every leg records the same
                    // cert no./date — same pattern as the shared check details.
                    'wt_cert_no'        => $taxWithheld > 0 ? ($validated['wt_cert_no'] ?? null) : null,
                    'wt_cert_date'      => $taxWithheld > 0 ? ($validated['wt_cert_date'] ?? null) : null,
                    'method'            => $validated['method'] ?? null,
                    'reference_no'      => $validated['reference_no'] ?? null,
                    'bank_name'         => $validated['bank_name'] ?? null,
                    'check_no'          => $validated['check_no'] ?? null,
                    'check_date'        => $validated['check_date'] ?? null,
                    'notes'             => $validated['notes'] ?? null,
                ]);

                foreach ($allocations as $alloc) {
                    $payment->items()->create([
                        'invoice_item_id' => $alloc['invoice_item_id'],
                        'amount'          => $alloc['amount'],
                    ]);
                }

                $this->recomputeInvoice($invoice);
            }
        });

        return back()->with('success', 'Payment recorded across '.count($validated['invoices']).' invoices.');
    }

    /**
     * Ensures allocations sum to the amount being settled (cash/check received
     * plus any tax withheld) and no item is allocated more than its own
     * remaining (unpaid) balance.
     */
    private function validateAllocations($allocations, float $settledAmount, Invoice $invoice): void
    {
        $sum = round($allocations->sum('amount'), 4);
        if ($sum !== round($settledAmount, 4)) {
            throw ValidationException::withMessages([
                'amount' => "Allocated amount (₱{$sum}) must equal the amount received plus tax withheld (₱{$settledAmount}).",
            ]);
        }

        $remainingByItem = $invoice->items->keyBy('id')->map(
            fn ($item) => (float) $item->amount - (float) $item->paymentItems->sum('amount')
        );

        foreach ($allocations as $alloc) {
            $remaining = $remainingByItem->get($alloc['invoice_item_id'], 0);
            if (round($alloc['amount'], 4) > round($remaining, 4) + 0.0001) {
                throw ValidationException::withMessages([
                    'allocations' => 'One of the allocated amounts exceeds that item\'s remaining balance.',
                ]);
            }
        }
    }

    private function recomputeInvoice(Invoice $invoice): void
    {
        // paid_amount reflects everything that settled the balance — actual
        // cash/check received plus any tax the customer withheld on your
        // behalf — not just money that landed in the bank.
        $paid = (float) $invoice->payments()->sum('amount')
              + (float) $invoice->payments()->sum('tax_withheld');
        $status = $paid <= 0 ? 'sent' : ($paid >= (float) $invoice->total_amount ? 'paid' : 'partial');

        $invoice->update(['paid_amount' => $paid, 'status' => $status]);
    }
}
