<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * A single check/transfer that was applied across more than one invoice.
 * Each affected invoice still gets its own Payment row (unchanged math,
 * unchanged per-invoice history) — this just groups those rows together
 * so they can be viewed and deleted as one real-world transaction.
 */
class PaymentBatch extends Model
{
    use LogsActivity;

    protected $fillable = [
        'payment_date', 'method', 'reference_no', 'bank_name', 'check_no', 'check_date',
        'wt_cert_no', 'wt_cert_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date:Y-m-d',
            'check_date' => 'date:Y-m-d',
            'wt_cert_date' => 'date:Y-m-d',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
