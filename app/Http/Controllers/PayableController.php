<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\PnlPeriod;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayableController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);
        $search  = trim((string) $request->get('q', ''));
        $crossPeriod = $search !== '';

        if ($crossPeriod) {
            $currentPeriod = null;

            $expenseQuery = Expense::with(['category:id,name', 'period:id,name', 'payments' => fn ($q) => $q->orderByDesc('payment_date')])
                ->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhere('reference_no', 'like', "%{$search}%")
                        ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$search}%"));
                })
                ->orderByDesc('expense_date');

            $purchaseQuery = PurchaseOrder::with(['supplier:id,name', 'period:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')])
                ->where(function ($q) use ($search) {
                    $q->where('notes', 'like', "%{$search}%")
                        ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', "%{$search}%"));
                })
                ->orderByDesc('po_date');
        } else {
            $currentPeriod = $request->period_id
                ? PnlPeriod::find($request->period_id)
                : $periods->first();

            $expenseQuery = $currentPeriod
                ? Expense::with(['category:id,name', 'payments' => fn ($q) => $q->orderByDesc('payment_date')])
                    ->where('pnl_period_id', $currentPeriod->id)
                    ->orderByDesc('expense_date')
                : null;

            $purchaseQuery = $currentPeriod
                ? PurchaseOrder::with(['supplier:id,name', 'items.paymentItems', 'payments' => fn ($q) => $q->orderByDesc('payment_date')])
                    ->where('pnl_period_id', $currentPeriod->id)
                    ->orderByDesc('po_date')
                : null;
        }

        $expenses = $expenseQuery ? $expenseQuery->get() : collect();

        $purchases = $purchaseQuery
            ? $purchaseQuery->get()->map(function (PurchaseOrder $po) {
                $po->items->each(function ($item) {
                    $item->paid = (float) $item->paymentItems->sum('amount');
                    $item->balance = round((float) $item->amount - $item->paid, 4);
                });
                return $po;
            })
            : collect();

        return Inertia::render('Payables/Index', compact('periods', 'currentPeriod', 'expenses', 'purchases', 'search'));
    }
}
