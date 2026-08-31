<?php

namespace App\Http\Controllers;

use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\PurchaseItem;
use App\Models\ResekoEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResekoController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $entries = $currentPeriod
            ? ResekoEntry::with('purchaseItem.purchaseOrder.supplier:id,name')
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderBy('reseko_date')
                ->orderBy('id')
                ->get()
                ->map(function (ResekoEntry $entry) {
                    $entry->supplier_name = $entry->purchaseItem?->purchaseOrder?->supplier?->name;
                    return $entry;
                })
            : collect();

        $purchaseLines = PurchaseItem::pickerOptionsForPeriod($currentPeriod?->id);

        $total = $entries->sum('amount');

        return Inertia::render('Reseko/Index', compact('periods', 'currentPeriod', 'entries', 'purchaseLines', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id'    => 'required|exists:pnl_periods,id',
            'purchase_item_id' => 'required|exists:purchase_items,id',
            'qty'              => 'required|numeric',
            'reseko_date'      => 'required|date',
            'notes'            => 'nullable|string',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        $purchaseItem = PurchaseItem::findOrFail($validated['purchase_item_id']);

        ResekoEntry::create([
            'pnl_period_id'    => $validated['pnl_period_id'],
            'purchase_item_id' => $purchaseItem->id,
            'item_name'        => $purchaseItem->item_name,
            'unit'             => $purchaseItem->unit,
            'qty'              => $validated['qty'],
            'cost_price'       => $purchaseItem->unit_price,
            'reseko_date'      => $validated['reseko_date'],
            'notes'            => $validated['notes'] ?? null,
            'pnl_line_item_id' => $this->resekoLineItemId(),
        ]);

        return back()->with('success', 'Reseko entry added.');
    }

    public function update(Request $request, ResekoEntry $reseko): RedirectResponse
    {
        $validated = $request->validate([
            'purchase_item_id' => 'required|exists:purchase_items,id',
            'qty'              => 'required|numeric',
            'reseko_date'      => 'required|date',
            'notes'            => 'nullable|string',
        ]);

        abort_if($reseko->period?->is_closed, 403, 'Period is closed.');

        $purchaseItem = PurchaseItem::findOrFail($validated['purchase_item_id']);

        $reseko->update([
            'purchase_item_id' => $purchaseItem->id,
            'item_name'        => $purchaseItem->item_name,
            'unit'             => $purchaseItem->unit,
            'qty'              => $validated['qty'],
            'cost_price'       => $purchaseItem->unit_price,
            'reseko_date'      => $validated['reseko_date'],
            'notes'            => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Reseko entry updated.');
    }

    public function destroy(ResekoEntry $reseko): RedirectResponse
    {
        abort_if($reseko->period?->is_closed, 403, 'Period is closed.');
        $reseko->delete();
        return back()->with('success', 'Reseko entry deleted.');
    }

    private function resekoLineItemId(): ?int
    {
        return PnlLineItem::where('auto_source', 'reseko')->value('id');
    }
}
