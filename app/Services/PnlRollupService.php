<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\PnlEntry;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\PurchaseOrder;
use App\Models\SalaryEntry;
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

        return $lineItems->mapWithKeys(function (PnlLineItem $item) use (
            $dates, $manualByItem, $expenseSums, $purchaseSums, $invoiceSums, $wastageSums, $salarySums
        ) {
            $auto = $item->autoSource();

            $source = match ($auto['type'] ?? null) {
                'expense'  => $expenseSums->get($item->id),
                'purchase' => $purchaseSums->get($item->id),
                'invoice'  => $invoiceSums->get($item->id),
                'wastage'  => $wastageSums->get($item->id),
                'salary'   => $salarySums->get($item->id),
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
}
