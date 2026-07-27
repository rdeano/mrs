<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PnlEntry;
use App\Models\PnlPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $period = PnlPeriod::latest('start_date')->first();

        $stats = [
            'total_sales' => 0,
            'gross_profit' => 0,
            'net_profit' => 0,
            'total_ar' => 0,
        ];

        if ($period) {
            $entries = PnlEntry::where('pnl_period_id', $period->id)
                ->with('lineItem.category')
                ->get();

            $byType = $entries->groupBy(fn($e) => $e->lineItem?->category?->type);

            $revenue = $byType->get('revenue', collect())->sum('amount');
            $cos     = $byType->get('cos', collect())->sum('amount');
            $sga     = $byType->get('sga', collect())->sum('amount');
            $wastage = $byType->get('gross_profit', collect())->sum('amount');
            $otherIn = $byType->get('other_income', collect())->sum('amount');
            $otherEx = $byType->get('other_expense', collect())->sum('amount');

            $gross = $revenue - $cos - $wastage;
            $net   = $gross - $sga + $otherIn - $otherEx;

            $stats = [
                'total_sales'  => $revenue,
                'gross_profit' => $gross,
                'net_profit'   => $net,
                'total_ar'     => Invoice::whereIn('status', ['sent', 'partial', 'overdue'])->sum('total_amount')
                                - Invoice::whereIn('status', ['sent', 'partial', 'overdue'])->sum('paid_amount'),
            ];
        }

        $recentInvoices = Invoice::with('customer')
            ->latest('invoice_date')
            ->take(8)
            ->get(['id', 'invoice_no', 'customer_id', 'invoice_date', 'status', 'total_amount', 'paid_amount']);

        $now = now();
        $receivablesAging = [
            ['bucket' => 'Current (0–30 days)',  'amount' => $this->agingAmount(0, 30)],
            ['bucket' => '31–60 days',           'amount' => $this->agingAmount(31, 60)],
            ['bucket' => '61–90 days',           'amount' => $this->agingAmount(61, 90)],
            ['bucket' => '90+ days',             'amount' => $this->agingAmount(91, 9999)],
        ];

        return Inertia::render('Dashboard/Index', compact('period', 'stats', 'recentInvoices', 'receivablesAging'));
    }

    private function agingAmount(int $from, int $to): float
    {
        return Invoice::whereIn('status', ['sent', 'partial', 'overdue'])
            ->whereRaw('DATEDIFF(NOW(), due_date) BETWEEN ? AND ?', [$from, $to])
            ->selectRaw('SUM(total_amount - paid_amount) as balance')
            ->value('balance') ?? 0;
    }
}
