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

        // All partners, not just active ones — a partner who has left may still be
        // owed (or paid out) their share from before they left.
        $partners = Partner::with('rates')->orderByDesc('is_active')->orderByDesc('share_percentage')->get();

        $total = $entries->sum('amount');

        // Earned = sum over every date of that date's Net Profit x the share % in
        // effect on that date — the same rule the P&L grid applies — so a rate
        // change only affects profit from its effective date onward.
        $npByDate = $this->rollup->allTimeNetProfitByDate();
        $allTimeNetProfit = array_sum($npByDate);

        $allPeriods = PnlPeriod::orderBy('start_date')->get(['id', 'name', 'start_date', 'end_date', 'is_closed']);

        // [partner_id][period_id|'none'] => total paid
        $paid = [];
        foreach (PartnerPayment::selectRaw('partner_id, pnl_period_id, SUM(amount) as total')->groupBy('partner_id', 'pnl_period_id')->get() as $row) {
            $paid[$row->partner_id][$row->pnl_period_id ?? 'none'] = (float) $row->total;
        }

        // Per period: net profit, and each partner's rate(s), earnings and payments.
        $periodBreakdown = $allPeriods->map(function (PnlPeriod $period) use ($npByDate, $partners, $paid) {
            $from = $period->start_date->format('Y-m-d');
            $to   = $period->end_date->format('Y-m-d');
            $periodNp = array_filter($npByDate, fn ($d) => $d >= $from && $d <= $to, ARRAY_FILTER_USE_KEY);

            return [
                'id'         => $period->id,
                'name'       => $period->name,
                'is_closed'  => $period->is_closed,
                'net_profit' => round(array_sum($periodNp), 2),
                'partners'   => $partners->mapWithKeys(function (Partner $p) use ($periodNp, $period, $paid, $from, $to) {
                    $earned = 0.0;
                    foreach ($periodNp as $d => $np) {
                        $earned += $np * $p->shareOn($d) / 100;
                    }

                    return [$p->id => [
                        'rates'  => $this->ratesDuring($p, $from, $to),
                        'earned' => round($earned, 2),
                        'paid'   => $paid[$p->id][$period->id] ?? 0.0,
                    ]];
                }),
            ];
        })->reverse()->values();

        $partnerBalances = $partners->map(function (Partner $p) use ($periodBreakdown, $paid) {
            $earned  = round($periodBreakdown->sum(fn ($row) => $row['partners'][$p->id]['earned']), 2);
            $paidSum = array_sum($paid[$p->id] ?? []);

            // Rate timeline, e.g. 33.33% (07/24/2026 – 09/15/2026) then 0% (from 09/16/2026).
            $rates = $p->rates->values();
            $timeline = $rates->map(fn ($r, $i) => [
                'share_percentage' => (float) $r->share_percentage,
                'from'             => $r->effective_from->format('Y-m-d'),
                'to'               => isset($rates[$i + 1]) ? $rates[$i + 1]->effective_from->copy()->subDay()->format('Y-m-d') : null,
                'notes'            => $r->notes,
            ]);

            // Share ended = latest rate is 0% after having been non-zero.
            $last = $timeline->last();
            $endedOn = $last && $last['share_percentage'] == 0 && $timeline->count() > 1 ? $last['from'] : null;

            return [
                'id'               => $p->id,
                'partner'          => $p->name,
                'is_active'        => $p->is_active,
                'share_percentage' => (float) $p->share_percentage,
                'timeline'         => $timeline,
                'share_ended_on'   => $endedOn,
                'ended_note'       => $endedOn ? $last['notes'] : null,
                'entitled'         => $earned,
                'paid'             => $paidSum,
                'unassigned_paid'  => $paid[$p->id]['none'] ?? 0.0,
                'balance'          => round($earned - $paidSum, 2),
            ];
        })->filter(fn ($row) => $row['is_active'] || $row['entitled'] != 0 || $row['paid'] != 0)->values();

        // Only keep breakdown columns for partners shown in the balances.
        $shownIds = $partnerBalances->pluck('id')->all();
        $periodBreakdown = $periodBreakdown->map(fn ($row) => array_merge($row, [
            'partners' => collect($row['partners'])->only($shownIds),
        ]));

        // Date ranges where the partners' shares don't add up to 100% — almost
        // always a rate change entered for one partner but not the others.
        $changeDates = $partners->flatMap(fn (Partner $p) => $p->rates->map(fn ($r) => $r->effective_from->format('Y-m-d')))
            ->unique()->sort()->values();
        $splitWarnings = [];
        foreach ($changeDates as $i => $from) {
            $totalPct = round($partners->sum(fn (Partner $p) => $p->shareOn($from)), 2);
            if (abs($totalPct - 100) > 0.05) {
                $next = $changeDates[$i + 1] ?? null;
                $splitWarnings[] = [
                    'from'  => $from,
                    'to'    => $next ? date('Y-m-d', strtotime($next . ' -1 day')) : null,
                    'total' => $totalPct,
                ];
            }
        }

        $partners = $partners->map->only(['id', 'name', 'share_percentage', 'is_active'])->values();

        return Inertia::render('PartnerPayments/Index', compact(
            'periods', 'currentPeriod', 'entries', 'partners', 'total', 'search',
            'partnerBalances', 'allTimeNetProfit', 'periodBreakdown', 'splitWarnings'
        ));
    }

    /**
     * Distinct share rates a partner had within [$from, $to], each with the
     * first date it applied there — e.g. [33.33% from 09/12, 0% from 09/16].
     */
    private function ratesDuring(Partner $partner, string $from, string $to): array
    {
        $out = [];
        $prev = null;
        for ($d = $from; $d <= $to; $d = date('Y-m-d', strtotime($d . ' +1 day'))) {
            $pct = $partner->shareOn($d);
            if ($pct !== $prev) {
                $out[] = ['share_percentage' => $pct, 'from' => $d];
                $prev = $pct;
            }
        }
        return $out;
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
