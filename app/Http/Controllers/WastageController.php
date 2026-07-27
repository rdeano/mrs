<?php

namespace App\Http\Controllers;

use App\Models\PnlPeriod;
use App\Models\WastageEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WastageController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $entries = $currentPeriod
            ? WastageEntry::where('pnl_period_id', $currentPeriod->id)
                ->orderBy('wastage_date')
                ->orderBy('id')
                ->get()
            : collect();

        $total = $entries->sum('amount');

        return Inertia::render('Wastages/Index', compact('periods', 'currentPeriod', 'entries', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id' => 'required|exists:pnl_periods,id',
            'item_name'     => 'required|string|max:200',
            'unit'          => 'nullable|string|max:50',
            'qty'           => 'required|numeric|min:0',
            'cost_price'    => 'required|numeric|min:0',
            'wastage_date'  => 'required|date',
            'notes'         => 'nullable|string',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        WastageEntry::create($validated);

        return back()->with('success', 'Wastage entry added.');
    }

    public function update(Request $request, WastageEntry $wastage): RedirectResponse
    {
        $validated = $request->validate([
            'item_name'    => 'required|string|max:200',
            'unit'         => 'nullable|string|max:50',
            'qty'          => 'required|numeric|min:0',
            'cost_price'   => 'required|numeric|min:0',
            'wastage_date' => 'required|date',
            'notes'        => 'nullable|string',
        ]);

        abort_if($wastage->period?->is_closed, 403, 'Period is closed.');

        $wastage->update($validated);

        return back()->with('success', 'Wastage entry updated.');
    }

    public function destroy(WastageEntry $wastage): RedirectResponse
    {
        abort_if($wastage->period?->is_closed, 403, 'Period is closed.');
        $wastage->delete();
        return back()->with('success', 'Wastage entry deleted.');
    }
}
