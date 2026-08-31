<?php

use App\Models\Invoice;
use App\Models\PurchaseOrder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Receivables and Purchases used to be a single total_amount per record;
     * they're now itemized (item_name/qty/unit_price via invoice_items /
     * purchase_items). Any records created before that change have no item
     * rows, so this backfills one line item per record from its total_amount
     * (matching what was done ad-hoc on the local dev database).
     *
     * Also flips any invoice still stuck on the old 'draft' default to 'sent'
     * — invoices never actually transition out of 'draft' otherwise, which
     * was silently excluding them from the Dashboard's AR totals/aging
     * (those only count sent/partial/overdue).
     */
    public function up(): void
    {
        Invoice::doesntHave('items')->get()->each(function (Invoice $invoice) {
            $invoice->items()->create([
                'item_name'  => 'Trading Products',
                'qty'        => 1,
                'unit_price' => $invoice->total_amount,
                'amount'     => $invoice->total_amount,
            ]);
        });

        Invoice::where('status', 'draft')->update(['status' => 'sent']);

        PurchaseOrder::doesntHave('items')->get()->each(function (PurchaseOrder $purchase) {
            $purchase->items()->create([
                'item_name'  => 'Trading Product Cost',
                'qty'        => 1,
                'unit_price' => $purchase->total_amount,
                'amount'     => $purchase->total_amount,
            ]);
        });
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
