<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PartnerPayment extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = ['partner_id', 'pnl_period_id', 'amount', 'payment_date', 'method', 'reference_no', 'notes'];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date:Y-m-d',
            'amount' => 'decimal:4',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PnlPeriod::class, 'pnl_period_id');
    }
}
