<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\PurchaseOrder;
use App\Models\Setting;
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
        $preBirTotal = $birSavingsTotal = 0.0;
        $defaultBirPct = (float) Setting::get('bir_savings_percent', 25);
        $perPeriod = [];

        foreach ($periods as $period) {
            $dates  = $this->periodDates($period);
            $rollup = $this->rollup->forPeriod($period, $dates);

            $sumByType = fn (string $type) => $lineItems
                ->filter(fn (PnlLineItem $item) => $item->category?->type === $type)
                ->sum(fn (PnlLineItem $item) => $rollup->get($item->id, ['by_date' => collect()])['by_date']->sum());

            $periodRevenue  = $sumByType('revenue');
            $periodCos      = $sumByType('cos');
            $periodSga      = $sumByType('sga');
            $periodWastage  = $sumByType('gross_profit'); // Wastages line lives in this category
            $periodOtherIn  = $sumByType('other_income');
            $periodOtherEx  = $sumByType('other_expense');

            $revenue += $periodRevenue;
            $cos     += $periodCos;
            $sga     += $periodSga;
            $wastage += $periodWastage;
            $otherIn += $periodOtherIn;
            $otherEx += $periodOtherEx;

            // BIR & Savings, same formula as PnlController: applied per period at that
            // period's own effective rate — a closed period's rate is locked in at close
            // time, so summing across periods can't be done from the aggregate totals
            // above (different periods can carry different rates).
            $periodPreBir = ($periodRevenue - $periodCos - $periodWastage) - $periodSga + $periodOtherIn - $periodOtherEx;
            $periodBirPct = $period->bir_savings_percent !== null ? (float) $period->bir_savings_percent : $defaultBirPct;
            $periodBir    = round($periodPreBir * $periodBirPct / 100, 2);

            $preBirTotal      += $periodPreBir;
            $birSavingsTotal  += $periodBir;

            // Kept per period (not just summed) so the KPI strip can show each metric's
            // change vs. the immediately preceding period — that comparison can't be
            // reconstructed from the running totals above.
            $perPeriod[$period->id] = [
                'revenue' => $periodRevenue,
                'gross'   => $periodRevenue - $periodCos - $periodWastage,
                'bir'     => $periodBir,
                'net'     => $periodPreBir - $periodBir,
            ];
        }

        $gross = $revenue - $cos - $wastage;
        $net   = $preBirTotal - $birSavingsTotal; // after BIR & Savings, matching the P&L page's "Net Profit"

        // Compares against the previous period that actually has activity — not just
        // the previous one chronologically, which is often an empty scaffold period
        // created ahead of time and would otherwise permanently hide every trend badge.
        $activePeriods = $periods->filter(
            fn (PnlPeriod $p) => collect($perPeriod[$p->id] ?? [])->sum(fn ($v) => abs($v)) > 0
        )->values();

        $trendOf = function (string $metric) use ($activePeriods, $perPeriod): ?float {
            if ($activePeriods->count() < 2) {
                return null;
            }
            $current  = $perPeriod[$activePeriods->last()->id][$metric] ?? 0.0;
            $previous = $perPeriod[$activePeriods->slice(-2, 1)->first()->id][$metric] ?? 0.0;

            if ($previous == 0.0) {
                return null; // no meaningful "% change" off a zero base
            }
            return round((($current - $previous) / abs($previous)) * 100, 1);
        };

        $expensesOutstanding = Expense::whereIn('status', ['unpaid', 'partial'])->sum('amount')
                             - Expense::whereIn('status', ['unpaid', 'partial'])->sum('paid_amount');
        $purchasesOutstanding = PurchaseOrder::whereIn('status', ['unpaid', 'partial'])->sum('total_amount')
                              - PurchaseOrder::whereIn('status', ['unpaid', 'partial'])->sum('paid_amount');

        $stats = [
            'total_sales'  => $revenue,
            'gross_profit' => $gross,
            'net_profit'   => $net,
            'bir_savings'  => $birSavingsTotal,
            'trends'       => [
                'total_sales'  => $trendOf('revenue'),
                'gross_profit' => $trendOf('gross'),
                'bir_savings'  => $trendOf('bir'),
                'net_profit'   => $trendOf('net'),
            ],
            'total_ar'     => Invoice::whereIn('status', ['sent', 'partial', 'overdue'])->sum('total_amount')
                            - Invoice::whereIn('status', ['sent', 'partial', 'overdue'])->sum('paid_amount'),
            'total_ap'     => $expensesOutstanding + $purchasesOutstanding,
        ];

        // Payables has no due_date to bucket by age the way receivables does, so this
        // mirrors Receivables Aging with what payables actually can show: the split
        // between the two sources of what the company owes.
        $payablesBreakdown = [
            ['bucket' => 'Expenses',        'amount' => $expensesOutstanding,  'tab' => 'expenses'],
            ['bucket' => 'Purchase Orders', 'amount' => $purchasesOutstanding, 'tab' => 'purchases'],
        ];

        // Expenses by category, all-time — top 8 folded into "Other" so a growing
        // category list can't turn this into an unreadable wall of bars.
        $categoryTotals = Expense::selectRaw('expense_category_id, SUM(amount) as total')
            ->groupBy('expense_category_id')
            ->with('category:id,name')
            ->orderByDesc('total')
            ->get();

        $otherTotal = (float) $categoryTotals->slice(8)->sum('total');

        $expensesByCategory = $categoryTotals->take(8)
            ->map(fn ($row) => ['category' => $row->category->name ?? 'Uncategorized', 'amount' => (float) $row->total])
            ->when($otherTotal > 0, fn ($rows) => $rows->push(['category' => 'Other', 'amount' => $otherTotal]))
            ->values();

        // Trend chart: last 8 periods with actual activity, oldest first, so an
        // empty scaffold period created ahead of time doesn't show up as a flat
        // zero bar in the middle of the series.
        $periodTrend = $activePeriods->slice(-8)->values()->map(fn (PnlPeriod $p) => [
            'label'        => $p->name,
            'total_sales'  => $perPeriod[$p->id]['revenue'],
            'gross_profit' => $perPeriod[$p->id]['gross'],
            'net_profit'   => $perPeriod[$p->id]['net'],
        ]);

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

        return Inertia::render('Dashboard/Index', compact(
            'dateRange', 'stats', 'recentInvoices', 'receivablesAging', 'periodTrend',
            'payablesBreakdown', 'expensesByCategory'
        ));
    }

    /**
     * Buckets by days past due date, computed on the fly as invoice_date +
     * the customer's CURRENT payment_terms_days (never a stored due_date, so
     * it can't go stale when a customer's terms change after the invoice was
     * created). $from/$to are inclusive; null means unbounded on that side,
     * so (null, 0) covers "not yet due" (including due today) and (61, null)
     * covers everything more than 60 days overdue.
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
            ->leftJoin('customers', 'customers.id', '=', 'invoices.customer_id')
            ->whereRaw(
                'DATEDIFF(NOW(), DATE_ADD(invoices.invoice_date, INTERVAL COALESCE(customers.payment_terms_days, 30) DAY)) BETWEEN ? AND ?',
                [$from ?? -100000, $to ?? 100000]
            )
            ->selectRaw('SUM(invoices.total_amount - invoices.paid_amount) as amount_due')
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
