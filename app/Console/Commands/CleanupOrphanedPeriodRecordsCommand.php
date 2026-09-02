<?php

namespace App\Console\Commands;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\PnlPeriod;
use App\Models\PurchaseOrder;
use App\Models\SalaryEntry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupOrphanedPeriodRecordsCommand extends Command
{
    protected $signature = 'pnl:cleanup-orphaned-period-records {--dry-run : List affected records without deleting them}';

    protected $description = 'Soft-delete invoices/expenses/purchase orders/salary entries left behind by periods deleted before PnlController::destroyPeriod started cascading (commit e3098cf)';

    private const MODELS = [
        'Invoice'        => Invoice::class,
        'Expense'        => Expense::class,
        'PurchaseOrder'  => PurchaseOrder::class,
        'SalaryEntry'    => SalaryEntry::class,
    ];

    public function handle(): int
    {
        $deletedPeriodIds = PnlPeriod::onlyTrashed()->pluck('id');

        if ($deletedPeriodIds->isEmpty()) {
            $this->info('No soft-deleted periods found. Nothing to do.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $total = 0;

        DB::transaction(function () use ($deletedPeriodIds, $dryRun, &$total) {
            foreach (self::MODELS as $label => $class) {
                $rows = $class::whereIn('pnl_period_id', $deletedPeriodIds)->get();

                foreach ($rows as $row) {
                    $this->line(($dryRun ? '[dry-run] would delete ' : 'Deleting ')."{$label} #{$row->id} (period_id={$row->pnl_period_id})");
                    $total++;

                    if (! $dryRun) {
                        $row->delete();
                    }
                }
            }
        });

        $this->info($dryRun
            ? "Dry run complete. {$total} record(s) would be soft-deleted."
            : "Done. {$total} record(s) soft-deleted.");

        return self::SUCCESS;
    }
}
