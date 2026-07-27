<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pnl_period_id')->constrained()->cascadeOnDelete();
            $table->decimal('net_profit', 15, 4)->default(0);
            $table->decimal('share_amount', 15, 4)->default(0);
            $table->timestamps();

            $table->unique(['partner_id', 'pnl_period_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_shares');
    }
};
