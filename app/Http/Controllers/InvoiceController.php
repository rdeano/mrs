<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $entries = $currentPeriod
            ? Invoice::with('customer:id,name')
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderBy('invoice_date')
                ->orderBy('id')
                ->get()
            : collect();

        $customers = Customer::orderBy('name')->get(['id', 'name']);
        $total     = $entries->sum('total_amount');

        return Inertia::render('Receivables/Index', compact('periods', 'currentPeriod', 'entries', 'customers', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id' => 'required|exists:pnl_periods,id',
            'customer_id'   => 'required|exists:customers,id',
            'invoice_no'    => 'required|string|max:50|unique:invoices,invoice_no',
            'invoice_date'  => 'required|date',
            'total_amount'  => 'required|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        $validated['pnl_line_item_id'] = $this->salesLineItemId();
        $validated['status']           = 'draft';
        $validated['paid_amount']      = 0;

        Invoice::create($validated);

        return back()->with('success', 'Invoice added.');
    }

    public function update(Request $request, Invoice $invoice): RedirectResponse
    {
        $validated = $request->validate([
            'customer_id'  => 'required|exists:customers,id',
            'invoice_no'   => ['required', 'string', 'max:50', Rule::unique('invoices', 'invoice_no')->ignore($invoice->id)],
            'invoice_date' => 'required|date',
            'total_amount' => 'required|numeric|min:0',
            'notes'        => 'nullable|string',
        ]);

        abort_if($invoice->period?->is_closed, 403, 'Period is closed.');

        $invoice->update($validated);

        return back()->with('success', 'Invoice updated.');
    }

    public function destroy(Invoice $invoice): RedirectResponse
    {
        abort_if($invoice->period?->is_closed, 403, 'Period is closed.');
        $invoice->delete();
        return back()->with('success', 'Invoice deleted.');
    }

    private function salesLineItemId(): ?int
    {
        return PnlLineItem::where('auto_source', 'invoice')->value('id');
    }
}
