<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $type = $request->type;

        $contacts = Contact::when($type, fn($q) => $q->where('type', $type))
            ->orderBy('name')
            ->get();

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
            'type'     => $type,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:150',
            'type'            => ['required', Rule::in(['supplier', 'customer', 'both'])],
            'phone'           => 'nullable|string|max:50',
            'secondary_phone' => 'nullable|string|max:50',
            'address'         => 'nullable|string|max:255',
            'notes'           => 'nullable|string',
        ]);

        Contact::create($validated);

        return back()->with('success', 'Contact added.');
    }

    public function update(Request $request, Contact $contact): RedirectResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:150',
            'type'            => ['required', Rule::in(['supplier', 'customer', 'both'])],
            'phone'           => 'nullable|string|max:50',
            'secondary_phone' => 'nullable|string|max:50',
            'address'         => 'nullable|string|max:255',
            'notes'           => 'nullable|string',
        ]);

        $contact->update($validated);

        return back()->with('success', 'Contact updated.');
    }

    public function destroy(Contact $contact): RedirectResponse
    {
        $contact->delete();
        return back()->with('success', 'Contact deleted.');
    }
}
