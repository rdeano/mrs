<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\PnlEntry;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\PurchaseOrder;
use App\Models\ResekoEntry;
use App\Models\SalaryEntry;
use App\Models\Setting;
use App\Models\WastageEntry;
use Illuminate\Support\Collection;

/**
 * Resolves, per P&L line item, whether its numbers are auto-computed from
 * another module (Expenses/Purchases/Invoices/Wastages/Salaries) or plain manual entry —
 * and if auto, aggregates that module's rows for the period into a per-date map.
 * This generalizes the app's original Wastages-only rollup to every module.
 */
class PnlRollupService
{
    /**
     * @param  string[]  $dates  Y-m-d date strings covering the period
     * @return Collection<int, array{by_date: Collection<string, float>, is_auto: bool, source_label: ?string, source_link: ?string}>
     *         keyed by pnl_line_item_id
     */
    public function forPeriod(PnlPeriod $period, array $dates): Collection
    {
        $lineItems = PnlLineItem::withCount('expenseCategories')
            ->where('is_active', true)
            ->get();

        $manualByItem = PnlEntry::where('pnl_period_id', $period->id)
            ->get()
            ->groupBy('pnl_line_item_id')
            ->map(fn($rows) => $rows->keyBy(fn($e) => $e->entry_date->format('Y-m-d'))
                ->map(fn($e) => (float) $e->amount));

        $categoryToLineItem = ExpenseCategory::whereNotNull('pnl_line_item_id')->pluck('pnl_line_item_id', 'id');

        $expenseSums = Expense::where('pnl_period_id', $period->id)
            ->whereNotNull('expense_category_id')
            ->get()
            ->groupBy(fn($e) => $categoryToLineItem[$e->expense_category_id] ?? 0)
            ->map(fn($rows) => $this->sumByDate($rows, 'expense_date'));

        $purchaseSums = PurchaseOrder::where('pnl_period_id', $period->id)
            ->whereNotNull('pnl_line_item_id')
            ->get()
            ->groupBy('pnl_line_item_id')
            ->map(fn($rows) => $this->sumByDate($rows, 'po_date', 'total_amount'));

        $invoiceSums = Invoice::where('pnl_period_id', $period->id)
            ->whereNotNull('pnl_line_item_id')
            ->get()
            ->groupBy('pnl_line_item_id')
            ->map(fn($rows) => $this->sumByDate($rows, 'invoice_date', 'total_amount'));

        $wastageSums = WastageEntry::where('pnl_period_id', $period->id)
            ->whereNotNull('pnl_line_item_id')
            ->get()
            ->groupBy('pnl_line_item_id')
            ->map(fn($rows) => $this->sumByDate($rows, 'wastage_date'));

        $salarySums = SalaryEntry::where('pnl_period_id', $period->id)
            ->whereNotNull('pnl_line_item_id')
            ->get()
            ->groupBy('pnl_line_item_id')
            ->map(fn($rows) => $this->sumByDate($rows, 'payment_date'));

        $resekoSums = ResekoEntry::where('pnl_period_id', $period->id)
            ->whereNotNull('pnl_line_item_id')
            ->get()
            ->groupBy('pnl_line_item_id')
            ->map(fn($rows) => $this->sumByDate($rows, 'reseko_date'));

        return $lineItems->mapWithKeys(function (PnlLineItem $item) use (
            $dates, $manualByItem, $expenseSums, $purchaseSums, $invoiceSums, $wastageSums, $salarySums, $resekoSums
        ) {
            $auto = $item->autoSource();

            $source = match ($auto['type'] ?? null) {
                'expense'  => $expenseSums->get($item->id),
                'purchase' => $purchaseSums->get($item->id),
                'invoice'  => $invoiceSums->get($item->id),
                'wastage'  => $wastageSums->get($item->id),
                'salary'   => $salarySums->get($item->id),
                'reseko'   => $resekoSums->get($item->id),
                default    => null,
            };

            $byDate = $auto
                ? collect($dates)
                    ->mapWithKeys(fn($d) => [$d => (float) ($source[$d] ?? 0)])
                    ->filter(fn($v) => $v != 0)
                : $manualByItem->get($item->id, collect());

            return [$item->id => [
                'by_date'      => $byDate,
                'is_auto'      => (bool) $auto,
                'source_type'  => $auto['type'] ?? null,
                'source_label' => $auto['label'] ?? null,
                'source_link'  => $auto['link'] ?? null,
            ]];
        });
    }

    private function sumByDate(Collection $rows, string $dateField, string $amountField = 'amount'): Collection
    {
        return $rows->groupBy(fn($row) => $row->{$dateField}->format('Y-m-d'))
            ->map(fn($group) => (float) $group->sum($amountField));
    }

    /**
     * Net Profit summed across every period, after BIR & Savings — same formula
     * DashboardController and PnlController each compute inline for their own
     * needs (a per-period breakdown for trends/charts, and per-date grid rows,
     * respectively). This is the plain scalar total, for callers that only need
     * the bottom-line figure (e.g. partner profit-share entitlement).
     */
    public function allTimeNetProfit(): float
    {
        $periods = PnlPeriod::orderBy('start_date')->get();
        $lineItems = PnlLineItem::with('category')->where('is_active', true)->get();
        $defaultBirPct = (float) Setting::get('bir_savings_percent', 25);

        $preBirTotal = $birTotal = 0.0;

        foreach ($periods as $period) {
            $dates  = $this->periodDatesFor($period);
            $rollup = $this->forPeriod($period, $dates);

            $sumByType = fn (string $type) => $lineItems
                ->filter(fn (PnlLineItem $item) => $item->category?->type === $type)
                ->sum(fn (PnlLineItem $item) => $rollup->get($item->id, ['by_date' => collect()])['by_date']->sum());

            $revenue = $sumByType('revenue');
            $cos     = $sumByType('cos');
            $sga     = $sumByType('sga');
            $wastage = $sumByType('gross_profit'); // Wastages line lives in this category
            $otherIn = $sumByType('other_income');
            $otherEx = $sumByType('other_expense');

            $preBir = ($revenue - $cos - $wastage) - $sga + $otherIn - $otherEx;
            $birPct = $period->bir_savings_percent !== null ? (float) $period->bir_savings_percent : $defaultBirPct;

            $preBirTotal += $preBir;
            $birTotal    += round($preBir * $birPct / 100, 2);
        }

        return $preBirTotal - $birTotal;
    }

    private function periodDatesFor(PnlPeriod $period): array
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
