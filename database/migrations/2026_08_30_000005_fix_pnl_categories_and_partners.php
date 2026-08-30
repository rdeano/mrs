<?php

use App\Models\PnlCategory;
use App\Models\PnlLineItem;
use App\Models\WastageEntry;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Allow the new 'operating_profit' category type.
        DB::statement("ALTER TABLE pnl_categories MODIFY type ENUM(
            'revenue', 'cos', 'gross_profit', 'sga', 'operating_profit',
            'other_income', 'other_expense', 'net_profit'
        ) NOT NULL");

        if (! Schema::hasColumn('pnl_line_items', 'auto_source')) {
            Schema::table('pnl_line_items', function (Blueprint $table) {
                $table->string('auto_source')->nullable()->after('is_active');
            });
        }

        // Stable markers for the line items sourced from Purchases/Invoices/Wastages —
        // set once here (and in the seeder for fresh installs) instead of being
        // looked up by name at request time.
        PnlLineItem::where('name', 'Trading Product Cost')->update(['auto_source' => 'purchase']);
        PnlLineItem::where('name', 'Trading Products - Sales')->update(['auto_source' => 'invoice']);
        PnlLineItem::where('name', 'Wastages')->update(['auto_source' => 'wastage']);

        // Real file has no "Resiko" line — that slot is "Ice/ Cellophone".
        PnlLineItem::where('name', 'Resiko')->update(['name' => 'Ice/ Cellophone']);

        // Add the missing "Other Expenses Labor" line item under Other Expenses.
        $otherExpenseCat = PnlCategory::where('type', 'other_expense')->first();
        if ($otherExpenseCat && ! PnlLineItem::where('pnl_category_id', $otherExpenseCat->id)->where('name', 'Other Expenses Labor')->exists()) {
            PnlLineItem::create([
                'pnl_category_id' => $otherExpenseCat->id,
                'name'            => 'Other Expenses Labor',
                'sort_order'      => 0,
                'is_active'       => true,
            ]);
        }

        // Insert "Operating Profit" between SG&A and Other Income, bumping later categories down.
        if (! PnlCategory::where('type', 'operating_profit')->exists()) {
            $sga = PnlCategory::where('type', 'sga')->first();
            $insertAt = $sga ? $sga->sort_order + 1 : 5;

            PnlCategory::where('sort_order', '>=', $insertAt)->increment('sort_order');

            PnlCategory::create([
                'name'          => 'Operating Profit',
                'type'          => 'operating_profit',
                'sort_order'    => $insertAt,
                'is_calculated' => true,
                'formula'       => 'gross_profit - sga',
                'is_active'     => true,
            ]);
        }

        // Partner percentages are fixed by migration 2026_08_30_000007 (unconditional
        // updateOrCreate — safe to run whether this DB was already seeded or not).

        // Backfill the Wastages FK on any wastage entries created before this column existed.
        $wastageItemId = PnlLineItem::where('name', 'Wastages')->value('id');
        if ($wastageItemId) {
            WastageEntry::whereNull('pnl_line_item_id')->update(['pnl_line_item_id' => $wastageItemId]);
        }
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
