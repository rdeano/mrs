<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reseko_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pnl_period_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('pnl_line_item_id')->nullable()->constrained('pnl_line_items')->nullOnDelete();
            // Which purchase line this shortage was found against. Kept nullable +
            // nullOnDelete (not cascade) so editing/removing that purchase's items
            // doesn't silently wipe reseko history — it just loses the live link.
            $table->foreignId('purchase_item_id')->nullable()->constrained('purchase_items')->nullOnDelete();
            // Snapshot of the item/unit at entry time, so the row still reads
            // correctly even if the purchase_item link above goes null later.
            $table->string('item_name');
            $table->string('unit')->nullable();
            // Can go negative: more stock arrived than was purchased.
            $table->decimal('qty', 10, 4)->default(0);
            $table->decimal('cost_price', 15, 4)->default(0);
            $table->decimal('amount', 15, 4)->default(0);
            $table->date('reseko_date');
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reseko_entries');
    }
};
