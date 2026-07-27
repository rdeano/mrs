<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerShare extends Model
{
    protected $fillable = ['partner_id', 'pnl_period_id', 'net_profit', 'share_amount'];

    protected function casts(): array
    {
        return [
            'net_profit' => 'decimal:4',
            'share_amount' => 'decimal:4',
        ];
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
