<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\PartnerShareRate;
use App\Models\PnlPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    public function index(): Response
    {
        $partners = Partner::with('rates')->orderByDesc('is_active')->orderByDesc('share_percentage')->get();

        // Share % is effective-dated, so "active total" is the sum of the rates in
        // effect today (inactive partners normally have 0% by now anyway).
        $today = now()->toDateString();

        return Inertia::render('Partners/Index', [
            'partners'     => $partners,
            'activeTotal'  => round($partners->sum(fn (Partner $p) => $p->shareOn($today)), 2),
            'firstPeriodStart' => PnlPeriod::min('start_date'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:100',
            'share_percentage' => 'required|numeric|min:0|max:100',
            'effective_from'   => 'required|date',
            'is_active'        => 'boolean',
        ]);

        DB::transaction(function () use ($validated) {
            $partner = Partner::create([
                'name'             => $validated['name'],
                'share_percentage' => $validated['share_percentage'],
                'is_active'        => $validated['is_active'] ?? true,
            ]);

            $partner->rates()->create([
                'share_percentage' => $validated['share_percentage'],
                'effective_from'   => $validated['effective_from'],
            ]);

            $partner->syncCurrentShare();
        });

        return back()->with('success', 'Partner added.');
    }

    /**
     * Name/active status update in place. A share % change never overwrites
     * history: it's recorded as a new rate starting on `effective_from`, so
     * dates before it keep the old rate on the P&L and in partner balances.
     */
    public function update(Request $request, Partner $partner): RedirectResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:100',
            'share_percentage' => 'required|numeric|min:0|max:100',
            'effective_from'   => 'required|date',
            'rate_notes'       => 'nullable|string|max:255',
            'is_active'        => 'boolean',
        ]);

        DB::transaction(function () use ($validated, $partner) {
            $partner->update([
                'name'      => $validated['name'],
                'is_active' => $validated['is_active'] ?? $partner->is_active,
            ]);

            $partner->load('rates');
            $effectiveFrom = date('Y-m-d', strtotime($validated['effective_from']));

            if ((float) $validated['share_percentage'] !== $partner->shareOn($effectiveFrom)) {
                $this->abortIfTouchesClosedPeriod($effectiveFrom);

                PartnerShareRate::updateOrCreate(
                    ['partner_id' => $partner->id, 'effective_from' => $effectiveFrom],
                    ['share_percentage' => $validated['share_percentage'], 'notes' => $validated['rate_notes'] ?? null],
                );
            }

            $partner->syncCurrentShare();
        });

        return back()->with('success', 'Partner updated.');
    }

    /** Remove a mistaken rate entry; the previous rate then applies again from that date. */
    public function destroyRate(Partner $partner, PartnerShareRate $rate): RedirectResponse
    {
        abort_unless((int) $rate->partner_id === (int) $partner->id, 404);
        if ($partner->rates()->count() <= 1) {
            return back()->with('error', "A partner's only share rate can't be deleted.");
        }
        try {
            $this->abortIfTouchesClosedPeriod($rate->effective_from->format('Y-m-d'));
        } catch (ValidationException $e) {
            return back()->with('error', 'Rate ' . $e->getMessage());
        }

        $rate->delete();
        $partner->syncCurrentShare();

        return back()->with('success', 'Share rate removed.');
    }

    /**
     * A rate change re-prices every date from $from onward, so it must not reach
     * back into a closed period — closed periods' numbers are final.
     */
    private function abortIfTouchesClosedPeriod(string $from): void
    {
        $closed = PnlPeriod::where('is_closed', true)->where('end_date', '>=', $from)->orderBy('start_date')->first();

        if ($closed) {
            throw ValidationException::withMessages([
                'effective_from' => "Falls in or before closed period \"{$closed->name}\" — pick a date after it ends.",
            ]);
        }
    }
}
