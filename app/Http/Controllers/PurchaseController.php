<?php

namespace App\Http\Controllers;

use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ? PurchaseOrder::with('supplier:id,name')
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderBy('po_date')
                ->orderBy('id')
                ->get()
            : collect();

        $suppliers = Supplier::orderBy('name')->get(['id', 'name']);
        $total     = $entries->sum('total_amount');

        return Inertia::render('Purchases/Index', compact('periods', 'currentPeriod', 'entries', 'suppliers', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id' => 'required|exists:pnl_periods,id',
            'supplier_id'   => 'required|exists:suppliers,id',
            'po_date'       => 'required|date',
            'total_amount'  => 'required|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        $validated['pnl_line_item_id'] = $this->tradingProductCostId();

        PurchaseOrder::create($validated);

        return back()->with('success', 'Purchase added.');
    }

    public function update(Request $request, PurchaseOrder $purchase): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id'  => 'required|exists:suppliers,id',
            'po_date'      => 'required|date',
            'total_amount' => 'required|numeric|min:0',
            'notes'        => 'nullable|string',
        ]);

        abort_if($purchase->period?->is_closed, 403, 'Period is closed.');

        $purchase->update($validated);

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
