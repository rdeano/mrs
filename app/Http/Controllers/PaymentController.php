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
            $invoiceQuery = Invoice::with(['customer:id,name,payment_terms_days,allow_zero_payment', 'period:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')->with('batch:id,check_no,bank_name')])
                ->where(function ($q) use ($search) {
                    $q->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
                })
                ->orderByDesc('invoice_date');
        } elseif ($agingActive) {
            $currentPeriod = null;
            // Due date is computed (invoice_date + the customer's current
            // payment_terms_days), not stored — see Invoice::dueDate().
            $invoiceQuery = Invoice::with(['customer:id,name,payment_terms_days,allow_zero_payment', 'period:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')->with('batch:id,check_no,bank_name')])
                ->whereIn('status', ['sent', 'partial', 'overdue'])
                ->leftJoin('customers', 'customers.id', '=', 'invoices.customer_id')
                ->whereRaw('DATEDIFF(NOW(), DATE_ADD(invoices.invoice_date, INTERVAL COALESCE(customers.payment_terms_days, 30) DAY)) BETWEEN ? AND ?', [
                    $request->filled('aging_from') ? (int) $request->aging_from : -100000,
                    $request->filled('aging_to') ? (int) $request->aging_to : 100000,
                ])
                ->select('invoices.*')
                ->orderByRaw('DATE_ADD(invoices.invoice_date, INTERVAL COALESCE(customers.payment_terms_days, 30) DAY)');
        } else {
            $currentPeriod = $request->period_id
                ? PnlPeriod::find($request->period_id)
                : $periods->first();

            $invoiceQuery = $currentPeriod
                ? Invoice::with(['customer:id,name,payment_terms_days,allow_zero_payment', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')->with('batch:id,check_no,bank_name')])
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
            'amount'                      => 'required|numeric|min:0',
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

        $invoice = Invoice::with('items.paymentItems', 'customer')->findOrFail($validated['invoice_id']);
        abort_if($invoice->period?->is_closed, 403, 'Period is closed.');

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages([
                'amount' => 'This invoice is already cancelled — delete that ₱0 entry from its payment history first to reopen it.',
            ]);
        }

        // Amount must normally be a real cash/check receipt (> 0). The one
        // exception: a customer flagged "allow ₱0 payments" can record a ₱0
        // entry to explicitly close out a cancelled order — recomputeInvoice()
        // reads that as "write this off" and marks the invoice Cancelled
        // rather than leaving it to sit as Unpaid forever.
        if ($validated['amount'] <= 0 && $taxWithheld <= 0 && ! $invoice->customer?->allow_zero_payment) {
            throw ValidationException::withMessages([
                'amount' => 'Amount received must be greater than 0. To close out a cancelled order with ₱0, enable "Allow ₱0 payments" for this customer.',
            ]);
        }

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

        $invoices = Invoice::with(['customer:id,name,payment_terms_days', 'period:id,name,is_closed', 'items.paymentItems'])
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
            if ($invoices[$entry['invoice_id']]->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'invoices' => 'One of the selected invoices is cancelled and can\'t be paid.',
                ]);
            }
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

        if ($paid <= 0 && $invoice->customer?->allow_zero_payment && $invoice->payments()->exists()) {
            // A ₱0 payment was explicitly recorded against a customer that
            // allows it — that's the "write this off, nothing is coming in"
            // signal, so it reads as Cancelled rather than Unpaid.
            $status = 'cancelled';
        } else {
            $status = $paid <= 0 ? 'sent' : (round($paid, 4) >= round((float) $invoice->total_amount, 4) ? 'paid' : 'partial');
        }

        $invoice->update(['paid_amount' => $paid, 'status' => $status]);
    }
}
