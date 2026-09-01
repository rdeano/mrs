<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_id')->constrained()->cascadeOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 4);
            $table->decimal('tax_withheld', 15, 4)->default(0);
            $table->string('method')->nullable();
            $table->string('reference_no')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('check_no')->nullable();
            $table->date('check_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_payments');
    }
};
