<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The DB-level unique constraint on invoice_no doesn't know about soft
     * deletes — a deleted invoice's number still physically occupies the
     * unique slot, permanently blocking that number from ever being reused.
     * Uniqueness among *active* invoices is enforced in InvoiceController's
     * validation instead (scoped to whereNull('deleted_at')); this stays a
     * plain index for lookup performance, not a hard constraint.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('invoices_invoice_no_unique');
            $table->index('invoice_no');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['invoice_no']);
            $table->unique('invoice_no');
        });
    }
};
