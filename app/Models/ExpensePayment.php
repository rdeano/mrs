<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ExpensePayment extends Model
{
    use LogsActivity;

    protected $fillable = [
        'expense_id', 'payment_date', 'amount', 'tax_withheld', 'method', 'reference_no',
        'bank_name', 'check_no', 'check_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date:Y-m-d',
            'amount' => 'decimal:4',
            'tax_withheld' => 'decimal:4',
            'check_date' => 'date:Y-m-d',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}
