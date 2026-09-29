<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Effective-dated share % history. A partner's share on any given date is
        // the row with the latest effective_from <= that date (none = 0%), so a
        // rate change only re-prices dates from its effective_from onward and
        // never rewrites earlier periods.
        Schema::create('partner_share_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->decimal('share_percentage', 5, 2);
            $table->date('effective_from');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['partner_id', 'effective_from']);
        });

        // Backfill: each partner's current rate applies from the very first period,
        // which reproduces exactly what the P&L showed before this change.
        $from = DB::table('pnl_periods')->min('start_date') ?? now()->toDateString();

        foreach (DB::table('partners')->get() as $partner) {
            DB::table('partner_share_rates')->insert([
                'partner_id'       => $partner->id,
                'share_percentage' => $partner->share_percentage,
                'effective_from'   => $from,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_share_rates');
    }
};
