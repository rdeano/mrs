<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PnlEntry extends Model
{
    use LogsActivity;

    protected $fillable = ['pnl_period_id', 'pnl_line_item_id', 'entry_date', 'amount', 'notes'];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date:Y-m-d',
            'amount' => 'decimal:4',
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

    public function lineItem(): BelongsTo
    {
        return $this->belongsTo(PnlLineItem::class, 'pnl_line_item_id');
    }
}
