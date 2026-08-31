<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(): Response
    {
        $items = Item::orderBy('name')->get();

        return Inertia::render('Items/Index', compact('items'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:150|unique:items,name',
            'unit'          => 'nullable|string|max:50',
            'default_price' => 'nullable|numeric|min:0',
            'is_active'     => 'boolean',
        ]);

        Item::create($validated);

        return back()->with('success', 'Item added.');
    }

    public function update(Request $request, Item $item): RedirectResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:150', Rule::unique('items', 'name')->ignore($item->id)],
            'unit'          => 'nullable|string|max:50',
            'default_price' => 'nullable|numeric|min:0',
            'is_active'     => 'boolean',
        ]);

        $item->update($validated);

        return back()->with('success', 'Item updated.');
    }

    public function destroy(Item $item): RedirectResponse
    {
        $item->delete();
        return back()->with('success', 'Item deleted.');
    }
}
