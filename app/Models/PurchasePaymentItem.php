<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchasePaymentItem extends Model
{
    protected $fillable = ['purchase_payment_id', 'purchase_item_id', 'amount'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
        ];
    }

    public function purchasePayment(): BelongsTo
    {
        return $this->belongsTo(PurchasePayment::class);
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class);
    }
}
