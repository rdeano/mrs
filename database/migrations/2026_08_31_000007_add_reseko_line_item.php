<?php

use App\Models\PnlCategory;
use App\Models\PnlLineItem;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * "Reseko" (shrinkage between qty purchased and qty actually delivered,
     * valued at cost) is real in the source Expenses sheet, tracked per
     * purchase batch — but as its own figure, not a named P&L line there.
     * It's placed alongside Wastages (same gross_profit section) since it's
     * the same kind of thing: purchased-stock shrinkage valued at cost,
     * reducing Gross Profit — not a manually-picked SG&A expense category.
     */
    public function up(): void
    {
        if (PnlLineItem::where('name', 'Reseko')->exists()) {
            return;
        }

        $category = PnlCategory::where('type', 'gross_profit')->first();
        if (! $category) {
            return;
        }

        PnlLineItem::create([
            'pnl_category_id' => $category->id,
            'name'            => 'Reseko',
            'sort_order'      => (int) PnlLineItem::where('pnl_category_id', $category->id)->max('sort_order') + 1,
            'is_active'       => true,
            'auto_source'     => 'reseko',
        ]);
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
