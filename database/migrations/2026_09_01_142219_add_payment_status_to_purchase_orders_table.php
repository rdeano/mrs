<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->enum('status', ['unpaid', 'partial', 'paid'])->default('unpaid')->after('total_amount');
            $table->decimal('paid_amount', 15, 4)->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['status', 'paid_amount']);
        });
    }
};
