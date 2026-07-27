<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PnlCategory extends Model
{
    use LogsActivity;

    protected $fillable = ['name', 'type', 'sort_order', 'is_calculated', 'formula', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_calculated' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(PnlLineItem::class)->orderBy('sort_order');
    }
}
