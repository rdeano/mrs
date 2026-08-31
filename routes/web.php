<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PnlController;
use App\Http\Controllers\PnlStructureController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ResekoController;
use App\Http\Controllers\SalaryController;
use App\Http\Controllers\SupplierController;
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
    Route::post('/pnl/entries/batch', [PnlController::class, 'storeEntriesBatch'])->name('pnl.entries.batch');
    Route::get('/pnl/cell-entries', [PnlController::class, 'cellEntries'])->name('pnl.cell-entries');
    Route::post('/pnl/periods/{period}/toggle-close', [PnlController::class, 'toggleClose'])->name('pnl.periods.toggle-close');
    Route::put('/pnl/bir-savings-percent', [PnlController::class, 'updateBirSavingsPercent'])->name('pnl.bir-savings-percent.update');
    Route::get('/pnl/periods/create', [PnlController::class, 'createPeriod'])->name('pnl.periods.create');
    Route::post('/pnl/periods', [PnlController::class, 'storePeriod'])->name('pnl.periods.store');
    Route::delete('/pnl/periods/{period}', [PnlController::class, 'destroyPeriod'])->name('pnl.periods.destroy');

    // Wastages
    Route::get('/wastages', [WastageController::class, 'index'])->name('wastages.index');
    Route::post('/wastages', [WastageController::class, 'store'])->name('wastages.store');
    Route::put('/wastages/{wastage}', [WastageController::class, 'update'])->name('wastages.update');
    Route::delete('/wastages/{wastage}', [WastageController::class, 'destroy'])->name('wastages.destroy');

    // Reseko (purchased-vs-delivered shrinkage, valued at cost)
    Route::get('/reseko', [ResekoController::class, 'index'])->name('reseko.index');
    Route::post('/reseko', [ResekoController::class, 'store'])->name('reseko.store');
    Route::put('/reseko/{reseko}', [ResekoController::class, 'update'])->name('reseko.update');
    Route::delete('/reseko/{reseko}', [ResekoController::class, 'destroy'])->name('reseko.destroy');

    // Expenses
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::put('/expenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update');
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');

    // Purchases
    Route::get('/purchases', [PurchaseController::class, 'index'])->name('purchases.index');
    Route::post('/purchases', [PurchaseController::class, 'store'])->name('purchases.store');
    Route::put('/purchases/{purchase}', [PurchaseController::class, 'update'])->name('purchases.update');
    Route::delete('/purchases/{purchase}', [PurchaseController::class, 'destroy'])->name('purchases.destroy');

    // Receivables (Invoice records, presented under the business's own term for this ledger)
    Route::get('/receivables', [InvoiceController::class, 'index'])->name('receivables.index');
    Route::post('/receivables', [InvoiceController::class, 'store'])->name('receivables.store');
    Route::put('/receivables/{invoice}', [InvoiceController::class, 'update'])->name('receivables.update');
    Route::delete('/receivables/{invoice}', [InvoiceController::class, 'destroy'])->name('receivables.destroy');

    // Payments (against receivables — invoice-level payment records, optionally
    // allocated across that invoice's specific line items)
    Route::get('/payments', [PaymentController::class, 'index'])->name('payments.index');
    Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::delete('/payments/{payment}', [PaymentController::class, 'destroy'])->name('payments.destroy');

    // Items (product catalog for Receivables / Purchases line items)
    Route::get('/items', [ItemController::class, 'index'])->name('items.index');
    Route::post('/items', [ItemController::class, 'store'])->name('items.store');
    Route::put('/items/{item}', [ItemController::class, 'update'])->name('items.update');
    Route::delete('/items/{item}', [ItemController::class, 'destroy'])->name('items.destroy');

    // Suppliers
    Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers.index');
    Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');

    // Customers
    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');

    // Activity Log
    Route::get('/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');

    // Contacts
    Route::get('/contacts', [ContactController::class, 'index'])->name('contacts.index');
    Route::post('/contacts', [ContactController::class, 'store'])->name('contacts.store');
    Route::put('/contacts/{contact}', [ContactController::class, 'update'])->name('contacts.update');
    Route::delete('/contacts/{contact}', [ContactController::class, 'destroy'])->name('contacts.destroy');

    // Salaries
    Route::get('/salaries', [SalaryController::class, 'index'])->name('salaries.index');
    Route::post('/salaries', [SalaryController::class, 'store'])->name('salaries.store');
    Route::put('/salaries/{salary}', [SalaryController::class, 'update'])->name('salaries.update');
    Route::delete('/salaries/{salary}', [SalaryController::class, 'destroy'])->name('salaries.destroy');

    // Employees
    Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');
    Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
    Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');

    // Partners
    Route::get('/partners', [PartnerController::class, 'index'])->name('partners.index');
    Route::post('/partners', [PartnerController::class, 'store'])->name('partners.store');
    Route::put('/partners/{partner}', [PartnerController::class, 'update'])->name('partners.update');

    // Settings — P&L structure
    Route::get('/settings/pnl-structure', [PnlStructureController::class, 'index'])->name('settings.pnl-structure.index');
    Route::put('/settings/pnl-categories/{category}', [PnlStructureController::class, 'updateCategory'])->name('settings.pnl-categories.update');
    Route::post('/settings/pnl-categories/{category}/move', [PnlStructureController::class, 'moveCategory'])->name('settings.pnl-categories.move');
    Route::post('/settings/pnl-line-items', [PnlStructureController::class, 'storeLineItem'])->name('settings.pnl-line-items.store');
    Route::put('/settings/pnl-line-items/{item}', [PnlStructureController::class, 'updateLineItem'])->name('settings.pnl-line-items.update');
    Route::post('/settings/pnl-line-items/{item}/move', [PnlStructureController::class, 'moveLineItem'])->name('settings.pnl-line-items.move');

});
