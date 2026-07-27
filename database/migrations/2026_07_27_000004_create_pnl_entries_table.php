<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pnl_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pnl_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pnl_line_item_id')->constrained()->cascadeOnDelete();
            $table->date('entry_date');
            $table->decimal('amount', 15, 4)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['pnl_period_id', 'pnl_line_item_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pnl_entries');
    }
};
