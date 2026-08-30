<?php

use App\Models\ExpenseCategory;
use App\Models\PnlLineItem;
use App\Models\SalaryEntry;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $item = PnlLineItem::where('name', 'Salaries and Wages')->first();

        if ($item) {
            $item->update(['auto_source' => 'salary']);

            // Salaries is now the sole source for this line item — an Expense Category
            // pointing here too would silently go unrolled-up (rollup only reads one
            // source per item). Delete it outright rather than just unlink it, so it
            // doesn't linger as a dead-end option on the Expenses form (any Expense
            // rows already using it fall back to expense_category_id = null, safely).
            ExpenseCategory::where('pnl_line_item_id', $item->id)->delete();

            SalaryEntry::whereNull('pnl_line_item_id')->update(['pnl_line_item_id' => $item->id]);
        }
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
