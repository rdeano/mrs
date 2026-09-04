<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Invoice extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = [
        'invoice_no', 'customer_id', 'pnl_period_id', 'pnl_line_item_id', 'invoice_date',
        'status', 'total_amount', 'paid_amount', 'notes',
    ];

    protected $appends = ['due_date'];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date:Y-m-d',
            'total_amount' => 'decimal:4',
            'paid_amount' => 'decimal:4',
        ];
    }

    /**
     * Always derived from invoice_date + the customer's current
     * payment_terms_days, never stored — so it can't go stale when a
     * customer's terms change after the invoice was created. Requires the
     * customer relation's payment_terms_days to be eager-loaded (or it
     * lazy-loads per invoice).
     */
    protected function dueDate(): Attribute
    {
        return Attribute::make(
            // Plain 'Y-m-d' to match invoice_date's cast format — the frontend's
            // date formatters append 'T00:00:00' to this string themselves.
            get: fn () => $this->invoice_date?->copy()->addDays($this->customer?->payment_terms_days ?? 30)->toDateString(),
        )->shouldCache();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PnlPeriod::class, 'pnl_period_id');
    }

    public function pnlLineItem(): BelongsTo
    {
        return $this->belongsTo(PnlLineItem::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getBalanceAttribute(): float
    {
        return (float) $this->total_amount - (float) $this->paid_amount;
    }
}
