<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE invoices MODIFY status ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("UPDATE invoices SET status = 'paid' WHERE status = 'cancelled'");
        DB::statement("ALTER TABLE invoices MODIFY status ENUM('draft', 'sent', 'partial', 'paid', 'overdue') DEFAULT 'draft'");
    }
};
