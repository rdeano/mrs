<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * due_date was a snapshot taken at invoice-creation time, so it went stale
     * whenever a customer's payment_terms_days changed afterward (invoices
     * showing overdue in the aging report when they weren't under current
     * terms). It's now computed on the fly from invoice_date + the customer's
     * current payment_terms_days instead of stored.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('due_date');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->date('due_date')->nullable();
        });
    }
};
