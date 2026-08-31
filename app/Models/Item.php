<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Item extends Model
{
    use LogsActivity;

    protected $fillable = ['name', 'unit', 'default_price', 'is_active'];

    protected function casts(): array
    {
        return [
            'default_price' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable();
    }
}
