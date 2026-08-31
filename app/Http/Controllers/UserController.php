<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::with('roles:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'created_at'])
            ->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email,
                'created_at' => $u->created_at->format('Y-m-d'),
                'role' => $u->roles->first()?->name,
            ]);

        $roles = Role::orderBy('name')->pluck('name');

        return Inertia::render('Settings/Users/Index', compact('users', 'roles'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:150',
            'email'    => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role'     => 'required|string|exists:roles,name',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);
        $user->assignRole($validated['role']);

        return back()->with('success', 'User added.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:150',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role'  => 'required|string|exists:roles,name',
        ]);

        $this->guardLastAdmin($request, $user, $validated['role']);

        $user->update(['name' => $validated['name'], 'email' => $validated['email']]);
        $user->syncRoles([$validated['role']]);

        return back()->with('success', 'User updated.');
    }

    public function updatePassword(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->update(['password' => Hash::make($validated['password'])]);

        return back()->with('success', "Password updated for {$user->name}.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot delete your own account.');
        $this->guardLastAdmin($request, $user, null);

        $user->delete();

        return back()->with('success', 'User deleted.');
    }

    /**
     * Blocks removing admin access from (or deleting) the last remaining admin,
     * so the team can never accidentally lock everyone out of user management.
     */
    private function guardLastAdmin(Request $request, User $user, ?string $newRole): void
    {
        if (! $user->hasRole('admin')) {
            return;
        }
        if ($newRole === 'admin') {
            return;
        }
        abort_if(User::role('admin')->count() <= 1, 422, 'Cannot remove the last remaining admin.');
    }
}
