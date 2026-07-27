<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PnlLineItem extends Model
{
    use LogsActivity;

    protected $fillable = ['pnl_category_id', 'name', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PnlCategory::class, 'pnl_category_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(PnlEntry::class);
    }
}
