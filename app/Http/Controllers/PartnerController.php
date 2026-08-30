<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    public function index(): Response
    {
        $partners = Partner::orderByDesc('share_percentage')->get();

        return Inertia::render('Partners/Index', [
            'partners'      => $partners,
            'activeTotal'   => $partners->where('is_active', true)->sum('share_percentage'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:100',
            'share_percentage' => 'required|numeric|min:0|max:100',
            'is_active'        => 'boolean',
        ]);

        Partner::create($validated);

        return back()->with('success', 'Partner added.');
    }

    public function update(Request $request, Partner $partner): RedirectResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:100',
            'share_percentage' => 'required|numeric|min:0|max:100',
            'is_active'        => 'boolean',
        ]);

        $partner->update($validated);

        return back()->with('success', 'Partner updated.');
    }
}
