<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_batches', function (Blueprint $table) {
            $table->id();
            $table->date('payment_date');
            $table->string('method')->nullable();
            $table->string('reference_no')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('check_no')->nullable();
            $table->date('check_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('payment_batch_id')->nullable()->after('invoice_id')
                ->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_batch_id');
        });

        Schema::dropIfExists('payment_batches');
    }
};
