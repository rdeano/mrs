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

    /** Share % history, oldest first. `share_percentage` above is just the rate in effect today. */
    public function rates(): HasMany
    {
        return $this->hasMany(PartnerShareRate::class)->orderBy('effective_from');
    }

    /**
     * Share % in effect on a given date (Y-m-d): the latest rate whose
     * effective_from is on or before it, or 0 before the partner's first rate.
     * Uses the loaded `rates` relation — eager-load it when calling in a loop.
     */
    public function shareOn(string $date): float
    {
        $rate = $this->rates
            ->filter(fn (PartnerShareRate $r) => $r->effective_from->format('Y-m-d') <= $date)
            ->last();

        return $rate ? (float) $rate->share_percentage : 0.0;
    }

    /** Re-derive the cached `share_percentage` column from the rate history as of today. */
    public function syncCurrentShare(): void
    {
        $this->load('rates');
        $this->update(['share_percentage' => $this->shareOn(now()->toDateString())]);
    }
}
