<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Services\PnlRollupService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly PnlRollupService $rollup)
    {
    }

    public function index(): Response
    {
        $periods = PnlPeriod::orderBy('start_date')->get();

        // Every other dashboard figure (Total Receivables, Aging, Recent
        // Receivables) is already all-time, not scoped to one period — these
        // three used to only reflect the single latest period, which read as
        // "the business did nothing" whenever that period was light or empty
        // while older periods held real activity. Summing every period's
        // rollup instead makes all four stat cards consistently all-time.
        $lineItems = PnlLineItem::with('category')->where('is_active', true)->get();

        $revenue = $cos = $sga = $wastage = $otherIn = $otherEx = 0.0;

        foreach ($periods as $period) {
            $dates  = $this->periodDates($period);
            $rollup = $this->rollup->forPeriod($period, $dates);

            $sumByType = fn (string $type) => $lineItems
                ->filter(fn (PnlLineItem $item) => $item->category?->type === $type)
                ->sum(fn (PnlLineItem $item) => $rollup->get($item->id, ['by_date' => collect()])['by_date']->sum());

            $revenue += $sumByType('revenue');
            $cos     += $sumByType('cos');
            $sga     += $sumByType('sga');
            $wastage += $sumByType('gross_profit'); // Wastages line lives in this category
            $otherIn += $sumByType('other_income');
            $otherEx += $sumByType('other_expense');
        }

        $gross = $revenue - $cos - $wastage;
        $net   = $gross - $sga + $otherIn - $otherEx;

        $stats = [
            'total_sales'  => $revenue,
            'gross_profit' => $gross,
            'net_profit'   => $net,
            'total_ar'     => Invoice::whereIn('status', ['sent', 'partial', 'overdue'])->sum('total_amount')
                            - Invoice::whereIn('status', ['sent', 'partial', 'overdue'])->sum('paid_amount'),
        ];

        $dateRange = $periods->isNotEmpty() ? [
            'start' => $periods->first()->start_date->format('Y-m-d'),
            'end'   => $periods->last()->end_date->format('Y-m-d'),
        ] : null;

        $recentInvoices = Invoice::with('customer')
            ->latest('invoice_date')
            ->take(8)
            ->get(['id', 'invoice_no', 'customer_id', 'pnl_period_id', 'invoice_date', 'status', 'total_amount', 'paid_amount']);

        $receivablesAging = [
            ['bucket' => 'Not yet due',        'amount' => $this->agingAmount(null, 0),  'from' => null, 'to' => 0],
            ['bucket' => '1–30 days overdue',  'amount' => $this->agingAmount(1, 30),    'from' => 1,    'to' => 30],
            ['bucket' => '31–60 days overdue', 'amount' => $this->agingAmount(31, 60),   'from' => 31,   'to' => 60],
            ['bucket' => '60+ days overdue',   'amount' => $this->agingAmount(61, null), 'from' => 61,   'to' => null],
        ];

        return Inertia::render('Dashboard/Index', compact('dateRange', 'stats', 'recentInvoices', 'receivablesAging'));
    }

    /**
     * Buckets by days past due_date (now auto-calculated per invoice from its
     * customer's payment terms). $from/$to are inclusive; null means unbounded
     * on that side, so (null, 0) covers "not yet due" (including due today)
     * and (61, null) covers everything more than 60 days overdue.
     *
     * The SUM is aliased as "amount_due" rather than "balance": Invoice has a
     * getBalanceAttribute() accessor, and aliasing a raw select as "balance"
     * makes Eloquent's magic getter call that accessor (which reads the
     * model's own total_amount/paid_amount, both absent from this select)
     * instead of returning the raw SUM — silently producing 0 every time.
     */
    private function agingAmount(?int $from, ?int $to): float
    {
        return Invoice::whereIn('status', ['sent', 'partial', 'overdue'])
            ->whereRaw(
                'DATEDIFF(NOW(), due_date) BETWEEN ? AND ?',
                [$from ?? -100000, $to ?? 100000]
            )
            ->selectRaw('SUM(total_amount - paid_amount) as amount_due')
            ->value('amount_due') ?? 0;
    }

    private function periodDates(PnlPeriod $period): array
    {
        $dates   = [];
        $current = $period->start_date->copy();
        while ($current->lte($period->end_date)) {
            $dates[] = $current->format('Y-m-d');
            $current->addDay();
        }
        return $dates;
    }
}
