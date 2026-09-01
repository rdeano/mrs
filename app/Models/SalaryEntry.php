<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SalaryEntry extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = ['employee_id', 'pnl_period_id', 'pnl_line_item_id', 'amount', 'payment_date', 'notes'];

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

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PnlPeriod::class, 'pnl_period_id');
    }

    public function pnlLineItem(): BelongsTo
    {
        return $this->belongsTo(PnlLineItem::class);
    }
}
