<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Payment extends Model
{
    use LogsActivity;

    protected $fillable = [
        'invoice_id', 'payment_batch_id', 'payment_date', 'amount', 'tax_withheld', 'wt_cert_no', 'wt_cert_date',
        'method', 'reference_no', 'bank_name', 'check_no', 'check_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date:Y-m-d',
            'amount' => 'decimal:4',
            'tax_withheld' => 'decimal:4',
            'check_date' => 'date:Y-m-d',
            'wt_cert_date' => 'date:Y-m-d',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PaymentBatch::class, 'payment_batch_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PaymentItem::class);
    }
}
