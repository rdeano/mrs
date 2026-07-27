<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PnlController;
use App\Http\Controllers\WastageController;
use Illuminate\Support\Facades\Route;

// Redirect root to dashboard
Route::get('/', fn() => redirect('/dashboard'));

// Auth
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');

// Authenticated routes
Route::middleware('auth')->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // P&L
    Route::get('/pnl', [PnlController::class, 'index'])->name('pnl.index');
    Route::post('/pnl/entries', [PnlController::class, 'storeEntry'])->name('pnl.entries.store');
    Route::post('/pnl/periods/{period}/toggle-close', [PnlController::class, 'toggleClose'])->name('pnl.periods.toggle-close');
    Route::get('/pnl/periods/create', [PnlController::class, 'createPeriod'])->name('pnl.periods.create');
    Route::post('/pnl/periods', [PnlController::class, 'storePeriod'])->name('pnl.periods.store');

    // Wastages
    Route::get('/wastages', [WastageController::class, 'index'])->name('wastages.index');
    Route::post('/wastages', [WastageController::class, 'store'])->name('wastages.store');
    Route::put('/wastages/{wastage}', [WastageController::class, 'update'])->name('wastages.update');
    Route::delete('/wastages/{wastage}', [WastageController::class, 'destroy'])->name('wastages.destroy');

});
