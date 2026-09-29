<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Data fix: record the real share history (from the activity log) now that
     * rates are effective-dated. Before this, editing a partner's % re-priced
     * every period, so the single current value couldn't represent it.
     *
     *   - up to 2026-09-15: Mam Bing / Sir Jom / Maila at 33.33% each
     *   - from 2026-09-16 (Sir Jom resigned 09/15): Sir Jom 0%, Mam Bing 50%, Maila 50%
     *   - "bir & savings" was only ever a test partner (BIR & Savings is its own
     *     P&L row), so 0% throughout.
     */
    public function up(): void
    {
        $from = DB::table('partner_share_rates')->min('effective_from')
            ?? DB::table('pnl_periods')->min('start_date')
            ?? '2026-01-01';

        $history = [
            'Mam Bing'      => [[$from, 33.33], ['2026-09-16', 50.00]],
            'Sir Jom'       => [[$from, 33.33], ['2026-09-16', 0.00]],
            'Maila'         => [[$from, 33.33], ['2026-09-16', 50.00]],
            'bir & savings' => [[$from, 0.00]],
        ];

        foreach ($history as $name => $rates) {
            $partner = DB::table('partners')->where('name', $name)->first();
            if (! $partner) {
                continue;
            }

            DB::table('partner_share_rates')->where('partner_id', $partner->id)->delete();

            foreach ($rates as [$date, $pct]) {
                DB::table('partner_share_rates')->insert([
                    'partner_id'       => $partner->id,
                    'share_percentage' => $pct,
                    'effective_from'   => $date,
                    'notes'            => $name === 'Sir Jom' && $pct == 0 ? 'Resigned 09/15/2026' : null,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
            }

            // Cached current rate = latest rate in effect today.
            $current = DB::table('partner_share_rates')
                ->where('partner_id', $partner->id)
                ->where('effective_from', '<=', now()->toDateString())
                ->orderByDesc('effective_from')
                ->value('share_percentage') ?? 0;

            DB::table('partners')->where('id', $partner->id)->update(['share_percentage' => $current]);
        }
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
