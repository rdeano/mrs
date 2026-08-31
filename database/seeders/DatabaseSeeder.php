<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\ExpenseCategory;
use App\Models\Partner;
use App\Models\PnlCategory;
use App\Models\PnlLineItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $admin   = Role::create(['name' => 'admin']);
        $manager = Role::create(['name' => 'manager']);
        $viewer  = Role::create(['name' => 'viewer']);

        $all = [
            'view dashboard',
            'view pnl', 'manage pnl',
            'view expenses', 'manage expenses',
            'view invoices', 'manage invoices',
            'view purchases', 'manage purchases',
            'view contacts', 'manage contacts',
            'view salaries', 'manage salaries',
            'view partners', 'manage partners',
            'view items', 'manage items',
            'view suppliers', 'manage suppliers',
            'view activity log',
            'manage users', 'manage roles', 'manage settings',
        ];

        foreach ($all as $perm) {
            Permission::create(['name' => $perm]);
        }

        $admin->givePermissionTo($all);
        $manager->givePermissionTo([
            'view dashboard', 'view pnl', 'manage pnl',
            'view expenses', 'manage expenses',
            'view invoices', 'manage invoices',
            'view purchases', 'manage purchases',
            'view contacts', 'manage contacts',
            'view salaries', 'manage salaries',
            'view partners', 'view activity log',
            'view items', 'manage items',
            'view suppliers', 'manage suppliers',
        ]);
        $viewer->givePermissionTo(['view dashboard', 'view pnl', 'view expenses', 'view invoices', 'view contacts']);

        $user = User::create([
            'name'     => 'Admin',
            'email'    => 'admin@mrs.local',
            'password' => Hash::make('password'),
        ]);
        $user->assignRole('admin');

        $this->seedPnlStructure();
        $this->seedExpenseCategories();

        Partner::updateOrCreate(['name' => 'Mam Beng'], ['share_percentage' => 33.34, 'is_active' => true]);
        Partner::updateOrCreate(['name' => 'Sir Jom'],  ['share_percentage' => 33.33, 'is_active' => true]);
        Partner::updateOrCreate(['name' => 'Maila'],    ['share_percentage' => 33.33, 'is_active' => true]);

        Supplier::insert([
            ['name' => 'Davao 666 Trading',    'phone' => '227-0766',    'contact_person' => null, 'notes' => '09173939118 / 09223006633 / 09989712906', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Sheng Kun Enterprises', 'phone' => '09561544540', 'contact_person' => null, 'notes' => '09606855860',                              'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Tap One',               'phone' => '220-1637',    'contact_person' => null, 'notes' => '221-0625 — Sugar',                         'created_at' => now(), 'updated_at' => now()],
        ]);

        Customer::insert([
            ['name' => 'BMC Corp',   'phone' => '09062118112', 'contact_person' => 'Ms. Arlene', 'type' => 'other', 'notes' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Blue Lutos', 'phone' => null,          'contact_person' => null,          'type' => 'other', 'notes' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dusit',      'phone' => '09613600388', 'contact_person' => 'Ms. Issa',    'type' => 'hotel', 'notes' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Employee::insert([
            ['name' => 'Josh',     'role' => 'Staff',  'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Driver 1', 'role' => 'Driver', 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Contact::insert([
            ['name' => 'Davao 666 Trading',     'type' => 'supplier', 'phone' => '227-0766',    'secondary_phone' => '09173939118', 'address' => null, 'notes' => 'Ahos bombay',   'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Sheng Kun Enterprises', 'type' => 'supplier', 'phone' => '09561544540', 'secondary_phone' => '09606855860', 'address' => null, 'notes' => 'Onion supplier', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Tap One',               'type' => 'supplier', 'phone' => '220-1637',    'secondary_phone' => '221-0625',    'address' => null, 'notes' => 'Sugar',          'created_at' => now(), 'updated_at' => now()],
            ['name' => 'BMC Corp',              'type' => 'customer', 'phone' => '09062118112', 'secondary_phone' => null,          'address' => null, 'notes' => 'Ms. Arlene',     'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Blue Lutos',            'type' => 'customer', 'phone' => null,          'secondary_phone' => null,          'address' => null, 'notes' => null,             'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dusit',                 'type' => 'customer', 'phone' => '09613600388', 'secondary_phone' => null,          'address' => null, 'notes' => 'Ms. Issa',       'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function seedPnlStructure(): void
    {
        $structure = [
            ['type' => 'revenue',       'name' => 'Sales',                 'calc' => false, 'formula' => null,
             'items' => ['Trading Products - Sales']],

            ['type' => 'cos',           'name' => 'Cost of Sales',         'calc' => false, 'formula' => null,
             'items' => [
                 'Trading Product Cost', 'Sales Return', 'Truck Rental',
                 'Truck Diesel/Cash Card/Parking', 'Trucks Maintenance/Motor',
                 'Delivery Truck Insurance', 'Packing Material & Store Supply',
                 'Wages on Call Helpers and Repacker', 'Cold Room Electricity',
                 'Airfreight Charges', 'Delivery/Bank Charges',
             ]],

            ['type' => 'gross_profit',  'name' => 'Gross Profit',          'calc' => true,  'formula' => 'revenue - cos',
             'items' => ['Wastages']],

            ['type' => 'sga',           'name' => 'SG&A Expenses',         'calc' => false, 'formula' => null,
             'items' => [
                 'Legal Fees', 'Audit Fee', 'Other Professional Fee',
                 'Taxes & Licenses', 'Bank Charges/Others', 'Meals', 'Toll Fee',
                 'Office Supplies', 'Ice/ Cellophone', 'Resiko', 'Rent', 'Representation',
                 'Telephone, Internet', 'Electricity & Water', 'Office Maintenance',
                 'Office Equipment', 'Staff Amenities/Last Pay', 'Transportation Expense',
                 'Bad Debts', 'Salaries and Wages', 'Employer Contribution/Separation Fee',
                 'Commission Payment', '13th Month Pay',
             ]],

            ['type' => 'operating_profit', 'name' => 'Operating Profit',   'calc' => true,  'formula' => 'gross_profit - sga',
             'items' => []],

            ['type' => 'other_income',  'name' => 'Other Income',          'calc' => false, 'formula' => null,
             'items' => ['Interest Income', 'Forex Exchange Gain (Loss)', 'Other Income']],

            ['type' => 'other_expense', 'name' => 'Other Expenses',        'calc' => false, 'formula' => null,
             'items' => ['Other Expenses Labor', 'Interest Expense', 'Other Expenses']],

            ['type' => 'net_profit',    'name' => 'Net Profit / (Loss)',   'calc' => true,  'formula' => 'operating_profit + other_income - other_expense',
             'items' => []],
        ];

        foreach ($structure as $sort => $cat) {
            $category = PnlCategory::create([
                'name'          => $cat['name'],
                'type'          => $cat['type'],
                'sort_order'    => $sort + 1,
                'is_calculated' => $cat['calc'],
                'formula'       => $cat['formula'],
                'is_active'     => true,
            ]);

            foreach ($cat['items'] as $itemSort => $itemName) {
                PnlLineItem::create([
                    'pnl_category_id' => $category->id,
                    'name'            => $itemName,
                    'sort_order'      => $itemSort + 1,
                    'is_active'       => true,
                ]);
            }
        }

        // Stable markers for line items sourced from other modules, rather than
        // looking them up by name at request time.
        PnlLineItem::where('name', 'Trading Product Cost')->update(['auto_source' => 'purchase']);
        PnlLineItem::where('name', 'Trading Products - Sales')->update(['auto_source' => 'invoice']);
        PnlLineItem::where('name', 'Wastages')->update(['auto_source' => 'wastage']);
        PnlLineItem::where('name', 'Salaries and Wages')->update(['auto_source' => 'salary']);
    }

    /**
     * One expense category per P&L line item that's meant to be logged as day-to-day
     * expenses. Trading Products - Sales (Invoices), Trading Product Cost (Purchases),
     * Sales Return, Wastages (WastageEntry), and Salaries and Wages (SalaryEntry) are
     * deliberately excluded — they're sourced elsewhere or stay manual.
     */
    private function seedExpenseCategories(): void
    {
        $excluded = ['Trading Products - Sales', 'Trading Product Cost', 'Sales Return', 'Salaries and Wages'];

        $lineItems = PnlLineItem::whereHas('category', fn($q) => $q->whereIn('type', ['cos', 'sga', 'other_expense']))
            ->where('name', '!=', 'Wastages')
            ->whereNotIn('name', $excluded)
            ->orderBy('sort_order')
            ->get();

        foreach ($lineItems as $sort => $item) {
            ExpenseCategory::create([
                'name'            => $item->name,
                'sort_order'      => $sort + 1,
                'pnl_line_item_id'=> $item->id,
            ]);
        }
    }
}
