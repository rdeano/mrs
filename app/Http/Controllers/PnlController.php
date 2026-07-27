<?php

namespace App\Http\Controllers;

use App\Models\PnlCategory;
use App\Models\PnlEntry;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\WastageEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PnlController extends Controller
{
    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'start_date', 'end_date', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $categories = [];
        $dates      = [];

        if ($currentPeriod) {
            $dates = $this->getPeriodDates($currentPeriod);

            // Manual P&L entries keyed by line_item_id
            $entries = PnlEntry::where('pnl_period_id', $currentPeriod->id)
                ->get()
                ->groupBy('pnl_line_item_id');

            // Wastage amounts keyed by date string
            $wastageByDate = WastageEntry::where('pnl_period_id', $currentPeriod->id)
                ->get()
                ->groupBy(fn($w) => $w->wastage_date->format('Y-m-d'))
                ->map(fn($g) => (float) $g->sum('amount'));

            $wastageItemId = PnlLineItem::where('name', 'Wastages')->value('id');

            // ── Step 1: build raw category data ──────────────────────────
            $raw = PnlCategory::with([
                    'lineItems' => fn($q) => $q->where('is_active', true)->orderBy('sort_order'),
                ])
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(function (PnlCategory $cat) use ($entries, $dates, $wastageByDate, $wastageItemId) {
                    $lineItems = $cat->lineItems->map(function ($item) use ($entries, $dates, $wastageByDate, $wastageItemId) {
                        $isWastage = $item->id === $wastageItemId;

                        if ($isWastage) {
                            $byDate = collect($dates)
                                ->mapWithKeys(fn($d) => [$d => (float) ($wastageByDate[$d] ?? 0)])
                                ->filter(fn($v) => $v > 0);
                        } else {
                            $itemEntries = $entries->get($item->id, collect());
                            $byDate      = $itemEntries
                                ->keyBy(fn($e) => $e->entry_date->format('Y-m-d'))
                                ->map(fn($e) => (float) $e->amount);
                        }

                        return [
                            'id'         => $item->id,
                            'name'       => $item->name,
                            'is_formula' => $isWastage,
                            'entries'    => $byDate,
                        ];
                    });

                    // Sum of line items per date (used as raw input for formula categories)
                    $dateSums  = [];
                    $lineTotal = 0;
                    foreach ($dates as $d) {
                        $sum         = $lineItems->sum(fn($i) => (float) ($i['entries'][$d] ?? 0));
                        $dateSums[$d] = $sum;
                        $lineTotal   += $sum;
                    }

                    return [
                        'id'            => $cat->id,
                        'name'          => $cat->name,
                        'type'          => $cat->type,
                        'is_calculated' => $cat->is_calculated,
                        'formula'       => $cat->formula,
                        'line_items'    => $lineItems,
                        'date_sums'     => $dateSums,   // raw sum of own line items
                        'line_total'    => $lineTotal,
                    ];
                });

            // ── Step 2: build per-type date maps ─────────────────────────
            // type => [date => sum_of_line_items]
            $byType = $raw->keyBy('type');

            $sumByDate = function (string $type) use ($byType, $dates): array {
                $cat = $byType->get($type);
                if (! $cat) {
                    return array_fill_keys($dates, 0.0);
                }
                return $cat['date_sums'];
            };

            $revByDate   = $sumByDate('revenue');
            $cosByDate   = $sumByDate('cos');
            $wastByDate  = $sumByDate('gross_profit');  // Wastages lives here
            $sgaByDate   = $sumByDate('sga');
            $oinByDate   = $sumByDate('other_income');
            $oexByDate   = $sumByDate('other_expense');

            // ── Step 3: compute derived totals ───────────────────────────
            // gross_profit_before_wastage[d] = revenue[d] - cos[d]
            $gpbwByDate = [];
            foreach ($dates as $d) {
                $gpbwByDate[$d] = ($revByDate[$d] ?? 0) - ($cosByDate[$d] ?? 0);
            }

            // gross_profit[d] = revenue[d] - cos[d] - wastages[d]
            $gpByDate = [];
            foreach ($dates as $d) {
                $gpByDate[$d] = ($gpbwByDate[$d]) - ($wastByDate[$d] ?? 0);
            }

            // net_profit[d] = gross_profit[d] - sga[d] + other_income[d] - other_expense[d]
            $npByDate = [];
            foreach ($dates as $d) {
                $npByDate[$d] = ($gpByDate[$d] ?? 0)
                    - ($sgaByDate[$d] ?? 0)
                    + ($oinByDate[$d] ?? 0)
                    - ($oexByDate[$d] ?? 0);
            }

            // ── Step 4: assemble final categories for the view ───────────
            $categories = $raw->map(function ($cat) use ($dates, $gpbwByDate, $gpByDate, $npByDate) {
                // For calculated categories, override date_totals & total
                if ($cat['type'] === 'gross_profit') {
                    // Inject a virtual "Gross Profit before Wastage" row before Wastages
                    $gpbwEntries = collect($dates)
                        ->mapWithKeys(fn($d) => [$d => $gpbwByDate[$d]])
                        ->filter(fn($v) => $v != 0);

                    $virtualRow = [
                        'id'         => 'gpbw',
                        'name'       => 'Gross Profit before Wastage',
                        'is_formula' => true,
                        'is_subtotal'=> true,
                        'entries'    => $gpbwEntries,
                    ];

                    $lineItems = collect([$virtualRow])->concat($cat['line_items']);

                    return array_merge($cat, [
                        'line_items'  => $lineItems,
                        'date_totals' => $gpByDate,
                        'total'       => array_sum($gpByDate),
                    ]);
                }

                if ($cat['type'] === 'net_profit') {
                    return array_merge($cat, [
                        'line_items'  => collect(),
                        'date_totals' => $npByDate,
                        'total'       => array_sum($npByDate),
                    ]);
                }

                // Regular categories: total = sum of own line items
                return array_merge($cat, [
                    'date_totals' => $cat['date_sums'],
                    'total'       => $cat['line_total'],
                ]);
            });
        }

        return Inertia::render('PNL/Index', compact('periods', 'currentPeriod', 'categories', 'dates'));
    }

    public function storeEntry(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id'    => 'required|exists:pnl_periods,id',
            'pnl_line_item_id' => 'required|exists:pnl_line_items,id',
            'entry_date'       => 'required|date',
            'amount'           => 'required|numeric',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        $wastageItemId = PnlLineItem::where('name', 'Wastages')->value('id');
        abort_if((int) $validated['pnl_line_item_id'] === (int) $wastageItemId, 422, 'Wastages is formula-driven.');

        PnlEntry::updateOrCreate(
            [
                'pnl_period_id'    => $validated['pnl_period_id'],
                'pnl_line_item_id' => $validated['pnl_line_item_id'],
                'entry_date'       => $validated['entry_date'],
            ],
            ['amount' => $validated['amount']]
        );

        return back()->with('success', 'Entry saved.');
    }

    public function toggleClose(PnlPeriod $period): RedirectResponse
    {
        $period->update(['is_closed' => ! $period->is_closed]);
        return back()->with('success', $period->is_closed ? 'Period closed.' : 'Period reopened.');
    }

    public function createPeriod(): Response
    {
        return Inertia::render('PNL/CreatePeriod');
    }

    public function storePeriod(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'notes'      => 'nullable|string',
        ]);

        $period = PnlPeriod::create($validated);

        return redirect('/pnl?period_id=' . $period->id)->with('success', 'Period created.');
    }

    private function getPeriodDates(PnlPeriod $period): array
    {
        $dates   = [];
        $current = $period->start_date->copy();
        while ($current->lte($period->end_date)) {
            $dates[] = $current->format('Y-m-d');
            $current->addDay();
        }
        return $dates;
    }
}
