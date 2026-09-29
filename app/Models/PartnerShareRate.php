<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PartnerShareRate extends Model
{
    use LogsActivity;

    protected $fillable = ['partner_id', 'share_percentage', 'effective_from', 'notes'];

    protected function casts(): array
    {
        return [
            'share_percentage' => 'decimal:2',
            'effective_from'   => 'date:Y-m-d',
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
}
