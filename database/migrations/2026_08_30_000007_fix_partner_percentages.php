<?php

use App\Models\Partner;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Real split: Mam Beng 33.34%, Sir Jom 33.33%, Maila 33.33%.
        Partner::whereIn('name', ['JA', 'Mam Maila'])->delete();
        Partner::updateOrCreate(['name' => 'Mam Beng'], ['share_percentage' => 33.34, 'is_active' => true]);
        Partner::updateOrCreate(['name' => 'Sir Jom'],  ['share_percentage' => 33.33, 'is_active' => true]);
        Partner::updateOrCreate(['name' => 'Maila'],    ['share_percentage' => 33.33, 'is_active' => true]);
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
