<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseItem extends Model
{
    protected $fillable = ['purchase_order_id', 'item_name', 'unit', 'qty', 'unit_price', 'amount'];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:4',
            'unit_price' => 'decimal:4',
            'amount' => 'decimal:4',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function resekoEntries(): HasMany
    {
        return $this->hasMany(ResekoEntry::class);
    }

    /**
     * Purchase lines for a period, formatted as pickable options for the
     * Reseko "which purchase does this shortage belong to" picker.
     */
    public static function pickerOptionsForPeriod(?int $periodId): \Illuminate\Support\Collection
    {
        if (! $periodId) {
            return collect();
        }

        return static::whereHas('purchaseOrder', fn ($q) => $q->where('pnl_period_id', $periodId))
            ->with('purchaseOrder.supplier:id,name')
            ->get()
            ->map(fn (PurchaseItem $pi) => [
                'id'         => $pi->id,
                'item_name'  => $pi->item_name,
                'unit'       => $pi->unit,
                'qty'        => (float) $pi->qty,
                'unit_price' => (float) $pi->unit_price,
                'po_date'    => $pi->purchaseOrder->po_date->format('Y-m-d'),
                'supplier'   => $pi->purchaseOrder->supplier?->name ?? '(no supplier)',
                'label'      => ($pi->purchaseOrder->supplier?->name ?? '(no supplier)') . ' — ' . $pi->item_name
                    . ' (' . rtrim(rtrim(number_format($pi->qty, 4), '0'), '.') . ($pi->unit ? ' ' . $pi->unit : '')
                    . ' @ ' . $pi->purchaseOrder->po_date->format('M j') . ')',
            ])
            ->values();
    }
}
