<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\PartnerPayment;
use App\Models\PnlPeriod;
use App\Services\PnlRollupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartnerPaymentController extends Controller
{
    public function __construct(private readonly PnlRollupService $rollup)
    {
    }

    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'is_closed']);
        $search  = trim((string) $request->get('q', ''));
        $crossPeriod = $search !== '';

        if ($crossPeriod) {
            $currentPeriod = null;

            $entries = PartnerPayment::with(['partner:id,name', 'period:id,name'])
                ->where(function ($q) use ($search) {
                    $q->where('reference_no', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%")
                        ->orWhereHas('partner', fn ($p) => $p->where('name', 'like', "%{$search}%"));
                })
                ->orderByDesc('payment_date')
                ->get();
        } else {
            $currentPeriod = $request->period_id
                ? PnlPeriod::find($request->period_id)
                : $periods->first();

            $entries = $currentPeriod
                ? PartnerPayment::with('partner:id,name')
                    ->where('pnl_period_id', $currentPeriod->id)
                    ->orderBy('payment_date')
                    ->orderBy('id')
                    ->get()
                : collect();
        }

        $partners = Partner::where('is_active', true)->orderByDesc('share_percentage')->get(['id', 'name', 'share_percentage']);

        $totalsByPartner = $entries->groupBy('partner_id')->map(fn ($rows) => [
            'partner' => $rows->first()->partner?->name ?? 'Unknown',
            'total'   => $rows->sum('amount'),
        ])->values();

        $total = $entries->sum('amount');

        // Entitlement = all-time Net Profit x each partner's CURRENT share % —
        // the same rule the P&L page itself applies to every period (including
        // closed/historical ones): there's no persisted per-period share snapshot,
        // so a rate change today retroactively re-prices every past period here
        // exactly as it already does there. All-time, not period-scoped, because
        // "how much has this partner earned/drawn overall" is the useful question,
        // independent of whatever period happens to be selected in the list below.
        $allTimeNetProfit = $this->rollup->allTimeNetProfit();

        $paidByPartner = PartnerPayment::selectRaw('partner_id, SUM(amount) as total')
            ->groupBy('partner_id')
            ->pluck('total', 'partner_id');

        $partnerBalances = $partners->map(function (Partner $p) use ($allTimeNetProfit, $paidByPartner) {
            $entitled = round($allTimeNetProfit * (float) $p->share_percentage / 100, 2);
            $paid     = (float) ($paidByPartner[$p->id] ?? 0);

            return [
                'partner'         => $p->name,
                'share_percentage'=> (float) $p->share_percentage,
                'entitled'        => $entitled,
                'paid'            => $paid,
                'balance'         => round($entitled - $paid, 2),
            ];
        });

        return Inertia::render('PartnerPayments/Index', compact(
            'periods', 'currentPeriod', 'entries', 'partners', 'total', 'totalsByPartner', 'search',
            'partnerBalances', 'allTimeNetProfit'
        ));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'partner_id'    => 'required|exists:partners,id',
            'pnl_period_id' => 'nullable|exists:pnl_periods,id',
            'amount'        => 'required|numeric|min:0.01',
            'payment_date'  => 'required|date',
            'method'        => 'nullable|string|max:50',
            'reference_no'  => 'nullable|string|max:100',
            'notes'         => 'nullable|string',
        ]);

        if ($validated['pnl_period_id'] ?? null) {
            $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
            abort_if($period->is_closed, 403, 'Period is closed.');
        }

        PartnerPayment::create($validated);

        return back()->with('success', 'Partner payment recorded.');
    }

    public function update(Request $request, PartnerPayment $partnerPayment): RedirectResponse
    {
        $validated = $request->validate([
            'partner_id'   => 'required|exists:partners,id',
            'amount'       => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'method'       => 'nullable|string|max:50',
            'reference_no' => 'nullable|string|max:100',
            'notes'        => 'nullable|string',
        ]);

        abort_if($partnerPayment->period?->is_closed, 403, 'Period is closed.');

        $partnerPayment->update($validated);

        return back()->with('success', 'Partner payment updated.');
    }

    public function destroy(PartnerPayment $partnerPayment): RedirectResponse
    {
        abort_if($partnerPayment->period?->is_closed, 403, 'Period is closed.');

        $partnerPayment->delete();

        return back()->with('success', 'Partner payment deleted.');
    }
}
