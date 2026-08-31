<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\PurchaseOrder;
use App\Models\ResekoEntry;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $entries = $currentPeriod
            ? PurchaseOrder::with(['supplier:id,name', 'items'])
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderBy('po_date')
                ->orderBy('id')
                ->get()
            : collect();

        $suppliers   = Supplier::orderBy('name')->get(['id', 'name']);
        $itemOptions = Item::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'default_price']);
        $total       = $entries->sum('total_amount');

        return Inertia::render('Purchases/Index', compact('periods', 'currentPeriod', 'entries', 'suppliers', 'itemOptions', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id'          => 'required|exists:pnl_periods,id',
            'supplier_id'            => 'required|exists:suppliers,id',
            'po_date'                => 'required|date',
            'notes'                  => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.item_name'      => 'required|string|max:255',
            'items.*.qty'            => 'required|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        DB::transaction(function () use ($validated) {
            $lineItems = array_map(fn ($row) => [
                'item_name'  => $row['item_name'],
                'qty'        => $row['qty'],
                'unit_price' => $row['unit_price'],
                'amount'     => round($row['qty'] * $row['unit_price'], 4),
            ], $validated['items']);

            $total = array_sum(array_column($lineItems, 'amount'));

            $purchase = PurchaseOrder::create([
                'pnl_period_id'    => $validated['pnl_period_id'],
                'supplier_id'      => $validated['supplier_id'],
                'po_date'          => $validated['po_date'],
                'notes'            => $validated['notes'] ?? null,
                'pnl_line_item_id' => $this->tradingProductCostId(),
                'total_amount'     => $total,
            ]);

            $purchase->items()->createMany($lineItems);
        });

        return back()->with('success', 'Purchase added.');
    }

    public function update(Request $request, PurchaseOrder $purchase): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id'            => 'required|exists:suppliers,id',
            'po_date'                => 'required|date',
            'notes'                  => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.item_name'      => 'required|string|max:255',
            'items.*.qty'            => 'required|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
        ]);

        abort_if($purchase->period?->is_closed, 403, 'Period is closed.');
        abort_if(
            ResekoEntry::whereIn('purchase_item_id', $purchase->items()->pluck('id'))->exists(),
            422,
            'This purchase has Reseko entries recorded against its items — delete them first before changing the items.'
        );

        DB::transaction(function () use ($purchase, $validated) {
            $lineItems = array_map(fn ($row) => [
                'item_name'  => $row['item_name'],
                'qty'        => $row['qty'],
                'unit_price' => $row['unit_price'],
                'amount'     => round($row['qty'] * $row['unit_price'], 4),
            ], $validated['items']);

            $total = array_sum(array_column($lineItems, 'amount'));

            $purchase->update([
                'supplier_id'  => $validated['supplier_id'],
                'po_date'      => $validated['po_date'],
                'notes'        => $validated['notes'] ?? null,
                'total_amount' => $total,
            ]);

            $purchase->items()->delete();
            $purchase->items()->createMany($lineItems);
        });

        return back()->with('success', 'Purchase updated.');
    }

    public function destroy(PurchaseOrder $purchase): RedirectResponse
    {
        abort_if($purchase->period?->is_closed, 403, 'Period is closed.');
        $purchase->delete();
        return back()->with('success', 'Purchase deleted.');
    }

    private function tradingProductCostId(): ?int
    {
        return PnlLineItem::where('auto_source', 'purchase')->value('id');
    }
}
