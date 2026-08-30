<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\PnlPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $entries = $currentPeriod
            ? Expense::with('category:id,name,pnl_line_item_id')
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderBy('expense_date')
                ->orderBy('id')
                ->get()
            : collect();

        $categories = ExpenseCategory::with('pnlLineItem:id,name')
            ->orderBy('sort_order')
            ->get(['id', 'name', 'sort_order', 'pnl_line_item_id']);

        $total = $entries->sum('amount');

        return Inertia::render('Expenses/Index', compact('periods', 'currentPeriod', 'entries', 'categories', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id'       => 'required|exists:pnl_periods,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'description'         => 'nullable|string|max:255',
            'amount'              => 'required|numeric|min:0',
            'expense_date'        => 'required|date',
            'reference_no'        => 'nullable|string|max:100',
            'paid_by'             => 'nullable|string|max:100',
            'notes'               => 'nullable|string',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        Expense::create($validated);

        return back()->with('success', 'Expense added.');
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $validated = $request->validate([
            'expense_category_id' => 'required|exists:expense_categories,id',
            'description'         => 'nullable|string|max:255',
            'amount'              => 'required|numeric|min:0',
            'expense_date'        => 'required|date',
            'reference_no'        => 'nullable|string|max:100',
            'paid_by'             => 'nullable|string|max:100',
            'notes'               => 'nullable|string',
        ]);

        abort_if($expense->period?->is_closed, 403, 'Period is closed.');

        $expense->update($validated);

        return back()->with('success', 'Expense updated.');
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        abort_if($expense->period?->is_closed, 403, 'Period is closed.');
        $expense->delete();
        return back()->with('success', 'Expense deleted.');
    }
}
