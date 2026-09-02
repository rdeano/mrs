<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Partner extends Model
{
    use LogsActivity;

    protected $fillable = ['name', 'share_percentage', 'is_active'];

    protected function casts(): array
    {
        return [
            'share_percentage' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function shares(): HasMany
    {
        return $this->hasMany(PartnerShare::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PartnerPayment::class);
    }
}
