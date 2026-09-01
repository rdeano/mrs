<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Models\PurchasePayment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchasePaymentController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'purchase_order_id'              => 'required|exists:purchase_orders,id',
            'payment_date'                    => 'required|date',
            'amount'                          => 'required|numeric|min:0.01',
            'tax_withheld'                    => 'nullable|numeric|min:0',
            'method'                          => 'nullable|string|max:50',
            'reference_no'                    => 'nullable|string|max:100',
            'bank_name'                       => 'required_if:method,Check|nullable|string|max:150',
            'check_no'                        => 'required_if:method,Check|nullable|string|max:100',
            'check_date'                      => 'required_if:method,Check|nullable|date',
            'notes'                           => 'nullable|string',
            'allocations'                     => 'required|array|min:1',
            'allocations.*.purchase_item_id'  => 'required|exists:purchase_items,id',
            'allocations.*.amount'            => 'required|numeric|min:0',
        ]);

        $taxWithheld = $validated['tax_withheld'] ?? 0;

        $purchase = PurchaseOrder::with('items.paymentItems')->findOrFail($validated['purchase_order_id']);
        abort_if($purchase->period?->is_closed, 403, 'Period is closed.');

        $allocations = collect($validated['allocations'])->filter(fn ($a) => $a['amount'] > 0)->values();

        $this->validateAllocations($allocations, $validated['amount'] + $taxWithheld, $purchase);

        DB::transaction(function () use ($purchase, $validated, $taxWithheld, $allocations) {
            $payment = $purchase->payments()->create([
                'payment_date' => $validated['payment_date'],
                'amount'       => $validated['amount'],
                'tax_withheld' => $taxWithheld,
                'method'       => $validated['method'] ?? null,
                'reference_no' => $validated['reference_no'] ?? null,
                'bank_name'    => $validated['bank_name'] ?? null,
                'check_no'     => $validated['check_no'] ?? null,
                'check_date'   => $validated['check_date'] ?? null,
                'notes'        => $validated['notes'] ?? null,
            ]);

            foreach ($allocations as $alloc) {
                $payment->items()->create([
                    'purchase_item_id' => $alloc['purchase_item_id'],
                    'amount'           => $alloc['amount'],
                ]);
            }

            $this->recomputePurchase($purchase);
        });

        return back()->with('success', 'Payment recorded.');
    }

    public function destroy(PurchasePayment $purchasePayment): RedirectResponse
    {
        $purchase = $purchasePayment->purchaseOrder;
        abort_if($purchase->period?->is_closed, 403, 'Period is closed.');

        DB::transaction(function () use ($purchasePayment, $purchase) {
            $purchasePayment->delete();
            $this->recomputePurchase($purchase);
        });

        return back()->with('success', 'Payment deleted.');
    }

    private function validateAllocations($allocations, float $settledAmount, PurchaseOrder $purchase): void
    {
        $sum = round($allocations->sum('amount'), 4);
        if ($sum !== round($settledAmount, 4)) {
            throw ValidationException::withMessages([
                'amount' => "Allocated amount (₱{$sum}) must equal the amount paid plus tax withheld (₱{$settledAmount}).",
            ]);
        }

        $remainingByItem = $purchase->items->keyBy('id')->map(
            fn ($item) => (float) $item->amount - (float) $item->paymentItems->sum('amount')
        );

        foreach ($allocations as $alloc) {
            $remaining = $remainingByItem->get($alloc['purchase_item_id'], 0);
            if (round($alloc['amount'], 4) > round($remaining, 4) + 0.0001) {
                throw ValidationException::withMessages([
                    'allocations' => 'One of the allocated amounts exceeds that item\'s remaining balance.',
                ]);
            }
        }
    }

    private function recomputePurchase(PurchaseOrder $purchase): void
    {
        $paid = (float) $purchase->payments()->sum('amount')
              + (float) $purchase->payments()->sum('tax_withheld');
        $status = $paid <= 0 ? 'unpaid' : ($paid >= (float) $purchase->total_amount ? 'paid' : 'partial');

        $purchase->update(['paid_amount' => $paid, 'status' => $status]);
    }
}
