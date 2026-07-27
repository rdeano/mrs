<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pnl_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', [
                'revenue', 'cos', 'gross_profit', 'sga',
                'other_income', 'other_expense', 'net_profit',
            ]);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_calculated')->default(false);
            $table->string('formula')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pnl_categories');
    }
};
