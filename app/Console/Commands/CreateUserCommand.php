<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class CreateUserCommand extends Command
{
    protected $signature = 'user:create
        {--name= : Full name}
        {--email= : Login email}
        {--role= : Role to assign (admin, manager, viewer)}';

    protected $description = 'Create a login user interactively — nothing typed here is ever written to a file or committed to the repo.';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Name');

        $email = $this->option('email') ?: $this->ask('Email');
        $emailError = $this->validateEmail($email);
        while ($emailError) {
            $this->error($emailError);
            $email = $this->ask('Email');
            $emailError = $this->validateEmail($email);
        }

        $roles = Role::pluck('name')->all();
        $role = $this->option('role') ?: $this->choice('Role', $roles, array_search('admin', $roles) ?: 0);
        if (! in_array($role, $roles, true)) {
            $this->error("Role \"{$role}\" doesn't exist. Available: " . implode(', ', $roles));
            return self::FAILURE;
        }

        $password = $this->secret('Password (input hidden, min 8 characters)');
        $confirm  = $this->secret('Confirm password');

        if ($password !== $confirm) {
            $this->error('Passwords did not match.');
            return self::FAILURE;
        }

        $validator = Validator::make(['password' => $password], ['password' => 'required|string|min:8']);
        if ($validator->fails()) {
            $this->error(implode(' ', $validator->errors()->all()));
            return self::FAILURE;
        }

        $user = User::create([
            'name'     => $name,
            'email'    => $email,
            'password' => Hash::make($password),
        ]);
        $user->assignRole($role);

        $this->info("Created \"{$user->name}\" <{$user->email}> with role \"{$role}\".");

        return self::SUCCESS;
    }

    private function validateEmail(?string $email): ?string
    {
        $validator = Validator::make(['email' => $email], ['email' => 'required|email|unique:users,email']);
        return $validator->fails() ? implode(' ', $validator->errors()->all()) : null;
    }
}
