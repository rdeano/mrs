<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * These permissions were originally only granted via an ad-hoc tinker
     * command against the local dev database, so any other environment
     * (e.g. a deployed site with its own database) never received them —
     * the Items/Suppliers/Customers nav links stay hidden there even though
     * the routes and pages exist, because the permission check silently
     * fails closed. This migration makes that grant idempotent and repeatable.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $newPermissions = [
            'view items', 'manage items',
            'view suppliers', 'manage suppliers',
            'view customers', 'manage customers',
        ];

        foreach ($newPermissions as $name) {
            Permission::firstOrCreate(['name' => $name]);
        }

        if ($admin = Role::where('name', 'admin')->first()) {
            $admin->givePermissionTo($newPermissions);
        }

        if ($manager = Role::where('name', 'manager')->first()) {
            $manager->givePermissionTo($newPermissions);
        }

        if ($viewer = Role::where('name', 'viewer')->first()) {
            $viewer->givePermissionTo(['view items', 'view suppliers', 'view customers']);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Data-fix migration; not reversible.
    }
};
