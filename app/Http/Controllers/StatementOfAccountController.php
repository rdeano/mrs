<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatementOfAccountController extends Controller
{
    public function index(Request $request): Response
    {
        $customers = Customer::orderBy('name')->get(['id', 'name']);

        $customerId = $request->integer('customer_id') ?: null;
        $asOf  = $request->filled('as_of') ? Carbon::parse($request->string('as_of')) : now();
        $from  = $request->filled('period_from') ? Carbon::parse($request->string('period_from')) : $asOf->copy()->startOfMonth();

        $statement = $customerId ? $this->buildStatement($customerId, $from, $asOf) : null;

        return Inertia::render('StatementOfAccount/Index', [
            'customers'   => $customers,
            'customerId'  => $customerId,
            'asOf'        => $asOf->format('Y-m-d'),
            'periodFrom'  => $from->format('Y-m-d'),
            'statement'   => $statement,
        ]);
    }

    /**
     * Splits the customer's balance into "Previous Balance" (everything from
     * before the statement period) and "New Charges" (invoices dated inside
     * it), with "Credits" (payments received inside it, against any invoice)
     * bridging the two — Previous + New − Credits reconciles exactly to the
     * true total balance as of $asOf; see the itemized proof in the PR that
     * introduced this. Only invoices inside the period are itemized, matching
     * the paper-statement format this mirrors.
     */
    private function buildStatement(int $customerId, Carbon $from, Carbon $asOf): array
    {
        $customer = Customer::findOrFail($customerId);

        $previousInvoices = Invoice::where('customer_id', $customerId)
            ->whereDate('invoice_date', '<', $from)
            ->with(['payments' => fn ($q) => $q->whereDate('payment_date', '<', $from)])
            ->get();

        $previousBalance = $previousInvoices->sum(function (Invoice $invoice) {
            $paid = (float) $invoice->payments->sum('amount') + (float) $invoice->payments->sum('tax_withheld');
            return (float) $invoice->total_amount - $paid;
        });

        $credits = Payment::whereHas('invoice', fn ($q) => $q->where('customer_id', $customerId))
            ->whereDate('payment_date', '>=', $from)
            ->whereDate('payment_date', '<=', $asOf)
            ->get();
        $creditsTotal = (float) $credits->sum('amount') + (float) $credits->sum('tax_withheld');

        $periodInvoices = Invoice::where('customer_id', $customerId)
            ->whereDate('invoice_date', '>=', $from)
            ->whereDate('invoice_date', '<=', $asOf)
            ->with('items')
            ->orderBy('invoice_date')
            ->orderByRaw('CAST(invoice_no AS UNSIGNED) asc')
            ->orderBy('invoice_no')
            ->get()
            ->map(fn (Invoice $invoice) => [
                'id'           => $invoice->id,
                'invoice_no'   => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date->format('Y-m-d'),
                'total_amount' => (float) $invoice->total_amount,
                'status'       => $invoice->status,
                'items'        => $invoice->items->map(fn ($item) => [
                    'item_name' => $item->item_name,
                    'amount'    => (float) $item->amount,
                ])->values(),
            ]);

        $newCharges = $periodInvoices->sum('total_amount');

        return [
            'customer' => [
                'id'             => $customer->id,
                'name'           => $customer->name,
                'contact_person' => $customer->contact_person,
                'address'        => $customer->address,
                'phone'          => $customer->phone,
            ],
            'invoices'         => $periodInvoices->values(),
            'previous_balance' => round($previousBalance, 4),
            'new_charges'      => round($newCharges, 4),
            'credits'          => round($creditsTotal, 4),
            'total_balance'    => round($previousBalance + $newCharges - $creditsTotal, 4),
        ];
    }
}
