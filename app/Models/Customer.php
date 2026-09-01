<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Customer extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = ['name', 'phone', 'contact_person', 'type', 'payment_terms_days', 'notes'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
