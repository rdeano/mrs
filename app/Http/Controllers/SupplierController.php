<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(): Response
    {
        $suppliers = Supplier::orderBy('name')->get();

        return Inertia::render('Suppliers/Index', compact('suppliers'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:150',
            'phone'           => 'nullable|string|max:50',
            'contact_person'  => 'nullable|string|max:150',
            'notes'           => 'nullable|string',
        ]);

        Supplier::create($validated);

        return back()->with('success', 'Supplier added.');
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:150',
            'phone'           => 'nullable|string|max:50',
            'contact_person'  => 'nullable|string|max:150',
            'notes'           => 'nullable|string',
        ]);

        $supplier->update($validated);

        return back()->with('success', 'Supplier updated.');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();
        return back()->with('success', 'Supplier deleted.');
    }
}
