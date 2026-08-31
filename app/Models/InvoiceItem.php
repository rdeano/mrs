<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InvoiceItem extends Model
{
    protected $fillable = ['invoice_id', 'item_name', 'unit', 'qty', 'unit_price', 'amount'];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:4',
            'unit_price' => 'decimal:4',
            'amount' => 'decimal:4',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function paymentItems(): HasMany
    {
        return $this->hasMany(PaymentItem::class);
    }
}
