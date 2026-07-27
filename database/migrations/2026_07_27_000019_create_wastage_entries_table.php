<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wastage_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pnl_period_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_name');
            $table->string('unit')->nullable();
            $table->decimal('qty', 10, 4)->default(0);
            $table->decimal('cost_price', 15, 4)->default(0);
            $table->decimal('amount', 15, 4)->default(0);
            $table->date('wastage_date');
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wastage_entries');
    }
};
