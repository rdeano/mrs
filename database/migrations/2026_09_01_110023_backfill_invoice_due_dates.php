<?php

use App\Models\Invoice;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * due_date was never populated before payment terms existed. Backfill it
     * from each invoice's own invoice_date + its customer's payment_terms_days
     * (falling back to 30 days for invoices with no customer), matching the
     * same rule InvoiceController now applies when creating new invoices.
     */
    public function up(): void
    {
        Invoice::with('customer:id,payment_terms_days')
            ->whereNull('due_date')
            ->get()
            ->each(function (Invoice $invoice) {
                $days = $invoice->customer?->payment_terms_days ?? 30;
                $invoice->update([
                    'due_date' => $invoice->invoice_date->copy()->addDays($days),
                ]);
            });
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
