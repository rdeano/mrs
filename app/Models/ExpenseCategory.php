<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    protected $fillable = ['name', 'sort_order', 'pnl_line_item_id'];

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function pnlLineItem(): BelongsTo
    {
        return $this->belongsTo(PnlLineItem::class);
    }
}
