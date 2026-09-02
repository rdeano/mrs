<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pnl_period_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 15, 4);
            $table->date('payment_date');
            $table->string('method', 50)->nullable();
            $table->string('reference_no', 100)->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_payments');
    }
};
