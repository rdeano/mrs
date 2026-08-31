<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ResekoEntry extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = [
        'pnl_period_id', 'pnl_line_item_id', 'purchase_item_id', 'item_name', 'unit', 'qty', 'cost_price', 'amount', 'reseko_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'reseko_date' => 'date:Y-m-d',
            'qty'         => 'decimal:4',
            'cost_price'  => 'decimal:4',
            'amount'      => 'decimal:4',
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

    public function pnlLineItem(): BelongsTo
    {
        return $this->belongsTo(PnlLineItem::class);
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class);
    }

    protected static function booted(): void
    {
        // Qty can go negative (more stock arrived than was purchased); amount follows.
        static::saving(function (ResekoEntry $entry) {
            $entry->amount = round((float) $entry->qty * (float) $entry->cost_price, 4);
        });
    }
}
