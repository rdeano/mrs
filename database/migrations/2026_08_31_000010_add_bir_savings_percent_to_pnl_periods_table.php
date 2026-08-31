<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Null = this period follows the live global BIR & Savings % setting.
     * Set = locked in at whatever the global rate was when the period was
     * closed, so changing the rate later never rewrites a closed period's
     * numbers. Cleared back to null on reopen (still-being-edited periods
     * follow the live rate again until re-closed).
     */
    public function up(): void
    {
        Schema::table('pnl_periods', function (Blueprint $table) {
            $table->decimal('bir_savings_percent', 5, 2)->nullable()->after('is_closed');
        });
    }

    public function down(): void
    {
        Schema::table('pnl_periods', function (Blueprint $table) {
            $table->dropColumn('bir_savings_percent');
        });
    }
};
