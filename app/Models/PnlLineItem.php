<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PnlLineItem extends Model
{
    use LogsActivity;

    protected $fillable = ['pnl_category_id', 'name', 'sort_order', 'is_active', 'auto_source'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PnlCategory::class, 'pnl_category_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(PnlEntry::class);
    }

    public function expenseCategories(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function wastageEntries(): HasMany
    {
        return $this->hasMany(WastageEntry::class);
    }

    public function resekoEntries(): HasMany
    {
        return $this->hasMany(ResekoEntry::class);
    }

    public function salaryEntries(): HasMany
    {
        return $this->hasMany(SalaryEntry::class);
    }

    /**
     * Where this line item's numbers come from, or null if it's plain manual entry.
     * 'purchase'/'invoice'/'wastage'/'salary' are fixed at the item level (auto_source
     * column); 'expense' is inferred from having a linked ExpenseCategory (config data,
     * not dependent on any Expense rows actually existing yet).
     */
    public function autoSource(): ?array
    {
        $fixed = [
            'wastage'  => ['type' => 'wastage',  'label' => 'Wastages',  'link' => '/wastages'],
            'purchase' => ['type' => 'purchase', 'label' => 'Purchases', 'link' => '/purchases'],
            'invoice'  => ['type' => 'invoice',  'label' => 'Receivables', 'link' => '/receivables'],
            'salary'   => ['type' => 'salary',   'label' => 'Salaries',  'link' => '/salaries'],
            'reseko'   => ['type' => 'reseko',   'label' => 'Reseko',    'link' => '/reseko'],
        ];

        if ($this->auto_source && isset($fixed[$this->auto_source])) {
            return $fixed[$this->auto_source];
        }

        $hasExpenseCategory = $this->relationLoaded('expenseCategories')
            ? $this->expenseCategories->isNotEmpty()
            : (isset($this->expense_categories_count)
                ? $this->expense_categories_count > 0
                : $this->expenseCategories()->exists());

        return $hasExpenseCategory ? ['type' => 'expense', 'label' => 'Expenses', 'link' => '/expenses'] : null;
    }
}
