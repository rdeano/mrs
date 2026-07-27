<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WastageEntry extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = [
        'pnl_period_id', 'item_name', 'unit', 'qty', 'cost_price', 'amount', 'wastage_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'wastage_date' => 'date',
            'qty'          => 'decimal:4',
            'cost_price'   => 'decimal:4',
            'amount'       => 'decimal:4',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PnlPeriod::class, 'pnl_period_id');
    }

    protected static function booted(): void
    {
        // Keep amount in sync whenever qty or cost_price changes
        static::saving(function (WastageEntry $entry) {
            $entry->amount = round((float) $entry->qty * (float) $entry->cost_price, 4);
        });
    }
}
