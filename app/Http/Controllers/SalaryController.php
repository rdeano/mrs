<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\SalaryEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalaryController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $entries = $currentPeriod
            ? SalaryEntry::with('employee:id,name,role')
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderBy('payment_date')
                ->orderBy('id')
                ->get()
            : collect();

        $employees = Employee::where('is_active', true)->orderBy('name')->get(['id', 'name', 'role']);
        $total     = $entries->sum('amount');

        return Inertia::render('Salaries/Index', compact('periods', 'currentPeriod', 'entries', 'employees', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id' => 'required|exists:pnl_periods,id',
            'employee_id'   => 'required|exists:employees,id',
            'amount'        => 'required|numeric|min:0',
            'payment_date'  => 'required|date',
            'notes'         => 'nullable|string',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        $validated['pnl_line_item_id'] = $this->salariesLineItemId();

        SalaryEntry::create($validated);

        return back()->with('success', 'Salary entry added.');
    }

    public function update(Request $request, SalaryEntry $salary): RedirectResponse
    {
        $validated = $request->validate([
            'employee_id'  => 'required|exists:employees,id',
            'amount'       => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'notes'        => 'nullable|string',
        ]);

        abort_if($salary->period?->is_closed, 403, 'Period is closed.');

        $salary->update($validated);

        return back()->with('success', 'Salary entry updated.');
    }

    public function destroy(SalaryEntry $salary): RedirectResponse
    {
        abort_if($salary->period?->is_closed, 403, 'Period is closed.');
        $salary->delete();
        return back()->with('success', 'Salary entry deleted.');
    }

    private function salariesLineItemId(): ?int
    {
        return PnlLineItem::where('auto_source', 'salary')->value('id');
    }
}
