<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
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

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $invoices = $currentPeriod
            ? Invoice::with(['customer:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')])
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderBy('invoice_date')
                ->orderBy('id')
                ->get()
                ->map(function (Invoice $invoice) {
                    $invoice->items->each(function ($item) {
                        $item->paid = (float) $item->paymentItems->sum('amount');
                        $item->balance = round((float) $item->amount - $item->paid, 4);
                    });
                    return $invoice;
                })
            : collect();

        return Inertia::render('Payments/Index', compact('periods', 'currentPeriod', 'invoices'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'invoice_id'                 => 'required|exists:invoices,id',
            'payment_date'                => 'required|date',
            'amount'                      => 'required|numeric|min:0.01',
            'method'                      => 'nullable|string|max:50',
            'reference_no'                => 'nullable|string|max:100',
            'notes'                       => 'nullable|string',
            'allocations'                 => 'required|array|min:1',
            'allocations.*.invoice_item_id' => 'required|exists:invoice_items,id',
            'allocations.*.amount'        => 'required|numeric|min:0',
        ]);

        $invoice = Invoice::with('items.paymentItems')->findOrFail($validated['invoice_id']);
        abort_if($invoice->period?->is_closed, 403, 'Period is closed.');

        $allocations = collect($validated['allocations'])->filter(fn ($a) => $a['amount'] > 0)->values();

        $this->validateAllocations($allocations, $validated['amount'], $invoice);

        DB::transaction(function () use ($invoice, $validated, $allocations) {
            $payment = $invoice->payments()->create([
                'payment_date' => $validated['payment_date'],
                'amount'       => $validated['amount'],
                'method'       => $validated['method'] ?? null,
                'reference_no' => $validated['reference_no'] ?? null,
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
            $payment->delete();
            $this->recomputeInvoice($invoice);
        });

        return back()->with('success', 'Payment deleted.');
    }

    /**
     * Ensures allocations sum to the payment amount and no item is allocated
     * more than its own remaining (unpaid) balance.
     */
    private function validateAllocations($allocations, float $amount, Invoice $invoice): void
    {
        $sum = round($allocations->sum('amount'), 4);
        if ($sum !== round($amount, 4)) {
            throw ValidationException::withMessages([
                'amount' => "Allocated amount (₱{$sum}) must equal the payment amount (₱{$amount}).",
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
        $paid = (float) $invoice->payments()->sum('amount');
        $status = $paid <= 0 ? 'sent' : ($paid >= (float) $invoice->total_amount ? 'paid' : 'partial');

        $invoice->update(['paid_amount' => $paid, 'status' => $status]);
    }
}
