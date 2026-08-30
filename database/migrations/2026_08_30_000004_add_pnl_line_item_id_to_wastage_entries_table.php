<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wastage_entries', function (Blueprint $table) {
            $table->foreignId('pnl_line_item_id')->nullable()->after('pnl_period_id')
                ->constrained('pnl_line_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('wastage_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pnl_line_item_id');
        });
    }
};
