<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PnlPeriod extends Model
{
    use LogsActivity;

    protected $fillable = ['name', 'start_date', 'end_date', 'is_closed', 'notes'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_closed' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function entries(): HasMany
    {
        return $this->hasMany(PnlEntry::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function salaryEntries(): HasMany
    {
        return $this->hasMany(SalaryEntry::class);
    }

    public function partnerShares(): HasMany
    {
        return $this->hasMany(PartnerShare::class);
    }
}
