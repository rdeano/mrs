<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Item;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            ? Invoice::with(['customer:id,name', 'items'])
                ->where('pnl_period_id', $currentPeriod->id)
                ->orderByRaw('CAST(invoice_no AS UNSIGNED) asc')
                ->orderBy('invoice_no')
                ->get()
            : collect();

        $customers   = Customer::orderBy('name')->get(['id', 'name']);
        $itemOptions = Item::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'default_price']);
        $total       = $entries->sum('total_amount');

        return Inertia::render('Receivables/Index', compact('periods', 'currentPeriod', 'entries', 'customers', 'itemOptions', 'total'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id'          => 'required|exists:pnl_periods,id',
            'customer_id'            => 'required|exists:customers,id',
            'invoice_no'             => ['required', 'string', 'max:50', Rule::unique('invoices', 'invoice_no')->whereNull('deleted_at')],
            'invoice_date'           => 'required|date',
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

            $invoice = Invoice::create([
                'pnl_period_id'    => $validated['pnl_period_id'],
                'customer_id'      => $validated['customer_id'],
                'invoice_no'       => $validated['invoice_no'],
                'invoice_date'     => $validated['invoice_date'],
                'due_date'         => $this->computeDueDate($validated['invoice_date'], $validated['customer_id']),
                'notes'            => $validated['notes'] ?? null,
                'pnl_line_item_id' => $this->salesLineItemId(),
                'status'           => 'sent',
                'total_amount'     => $total,
                'paid_amount'      => 0,
            ]);

            $invoice->items()->createMany($lineItems);
        });

        return back()->with('success', 'Invoice added.');
    }

    public function update(Request $request, Invoice $invoice): RedirectResponse
    {
        $validated = $request->validate([
            'customer_id'            => 'required|exists:customers,id',
            'invoice_no'             => ['required', 'string', 'max:50', Rule::unique('invoices', 'invoice_no')->whereNull('deleted_at')->ignore($invoice->id)],
            'invoice_date'           => 'required|date',
            'notes'                  => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.item_name'      => 'required|string|max:255',
            'items.*.qty'            => 'required|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
        ]);

        abort_if($invoice->period?->is_closed, 403, 'Period is closed.');
        abort_if($invoice->payments()->exists(), 422, 'This invoice already has payments recorded — delete them first before changing its items.');

        DB::transaction(function () use ($invoice, $validated) {
            $lineItems = array_map(fn ($row) => [
                'item_name'  => $row['item_name'],
                'qty'        => $row['qty'],
                'unit_price' => $row['unit_price'],
                'amount'     => round($row['qty'] * $row['unit_price'], 4),
            ], $validated['items']);

            $total = array_sum(array_column($lineItems, 'amount'));

            $invoice->update([
                'customer_id'  => $validated['customer_id'],
                'invoice_no'   => $validated['invoice_no'],
                'invoice_date' => $validated['invoice_date'],
                'due_date'     => $this->computeDueDate($validated['invoice_date'], $validated['customer_id']),
                'notes'        => $validated['notes'] ?? null,
                'total_amount' => $total,
            ]);

            $invoice->items()->delete();
            $invoice->items()->createMany($lineItems);
        });

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

    /**
     * due_date is always derived, not entered by hand: invoice_date plus
     * that customer's payment terms (falling back to 30 days if unset).
     */
    private function computeDueDate(string $invoiceDate, int $customerId): string
    {
        $days = Customer::whereKey($customerId)->value('payment_terms_days') ?? 30;

        return Carbon::parse($invoiceDate)->addDays($days)->toDateString();
    }
}
