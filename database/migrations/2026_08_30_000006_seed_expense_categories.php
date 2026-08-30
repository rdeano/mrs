<?php

use App\Models\ExpenseCategory;
use App\Models\PnlLineItem;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $excluded = ['Trading Products - Sales', 'Trading Product Cost', 'Sales Return'];

        $lineItems = PnlLineItem::whereHas('category', fn($q) => $q->whereIn('type', ['cos', 'sga', 'other_expense']))
            ->where('name', '!=', 'Wastages')
            ->whereNotIn('name', $excluded)
            ->orderBy('sort_order')
            ->get();

        $nextSort = (int) ExpenseCategory::max('sort_order');

        foreach ($lineItems as $item) {
            if (ExpenseCategory::where('pnl_line_item_id', $item->id)->exists()) {
                continue;
            }

            ExpenseCategory::create([
                'name'             => $item->name,
                'sort_order'       => ++$nextSort,
                'pnl_line_item_id' => $item->id,
            ]);
        }
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
