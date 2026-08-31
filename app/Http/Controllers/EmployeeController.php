<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(): Response
    {
        $employees = Employee::orderBy('name')->get();

        return Inertia::render('Employees/Index', compact('employees'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:150',
            'role'      => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        Employee::create($validated);

        return back()->with('success', 'Employee added.');
    }

    public function update(Request $request, Employee $employee): RedirectResponse
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:150',
            'role'      => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $employee->update($validated);

        return back()->with('success', 'Employee updated.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $employee->delete();
        return back()->with('success', 'Employee deleted.');
    }
}
