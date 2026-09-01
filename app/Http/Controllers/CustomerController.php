<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(): Response
    {
        $customers = Customer::orderBy('name')->get();

        return Inertia::render('Customers/Index', compact('customers'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:150',
            'type'                => ['required', Rule::in(['hotel', 'restaurant', 'distributor', 'other'])],
            'phone'               => 'nullable|string|max:50',
            'contact_person'      => 'nullable|string|max:150',
            'address'             => 'nullable|string|max:255',
            'payment_terms_days'  => 'required|integer|min:0|max:365',
            'notes'               => 'nullable|string',
        ]);

        Customer::create($validated);

        return back()->with('success', 'Customer added.');
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:150',
            'type'                => ['required', Rule::in(['hotel', 'restaurant', 'distributor', 'other'])],
            'phone'               => 'nullable|string|max:50',
            'contact_person'      => 'nullable|string|max:150',
            'address'             => 'nullable|string|max:255',
            'payment_terms_days'  => 'required|integer|min:0|max:365',
            'notes'               => 'nullable|string',
        ]);

        $customer->update($validated);

        return back()->with('success', 'Customer updated.');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->delete();
        return back()->with('success', 'Customer deleted.');
    }
}
