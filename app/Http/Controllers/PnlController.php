<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Item;
use App\Models\Partner;
use App\Models\PnlCategory;
use App\Models\PnlEntry;
use App\Models\PnlLineItem;
use App\Models\PnlPeriod;
use App\Models\PurchaseItem;
use App\Models\PurchaseOrder;
use App\Models\ResekoEntry;
use App\Models\SalaryEntry;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\WastageEntry;
use App\Services\PnlRollupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PnlController extends Controller
{
    public function __construct(private readonly PnlRollupService $rollup)
    {
    }

    public function index(Request $request): Response
    {
        $periods = PnlPeriod::orderByDesc('start_date')->get(['id', 'name', 'start_date', 'end_date', 'is_closed']);

        $currentPeriod = $request->period_id
            ? PnlPeriod::find($request->period_id)
            : $periods->first();

        $categories = [];
        $dates      = [];
        $profitDistribution = null;

        if ($currentPeriod) {
            $dates = $this->getPeriodDates($currentPeriod);

            // Per line item: where its numbers come from (auto-rollup or manual), by date.
            $rollup = $this->rollup->forPeriod($currentPeriod, $dates);

            // ── Step 1: build raw category data ──────────────────────────
            $raw = PnlCategory::with([
                    'lineItems' => fn($q) => $q->where('is_active', true)->orderBy('sort_order'),
                ])
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(function (PnlCategory $cat) use ($rollup, $dates) {
                    $lineItems = $cat->lineItems->map(function ($item) use ($rollup) {
                        $r = $rollup->get($item->id, [
                            'by_date' => collect(), 'is_auto' => false, 'source_type' => null, 'source_label' => null, 'source_link' => null,
                        ]);

                        return [
                            'id'            => $item->id,
                            'name'          => $item->name,
                            'is_auto'       => $r['is_auto'],
                            'source_type'   => $r['source_type'],
                            'source_label'  => $r['source_label'],
                            'source_link'   => $r['source_link'],
                            'entries'       => $r['by_date'],
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

            $revByDate  = $sumByDate('revenue');
            $cosByDate  = $sumByDate('cos');
            $wastByDate = $sumByDate('gross_profit');  // Wastages lives here
            $sgaByDate  = $sumByDate('sga');
            $oinByDate  = $sumByDate('other_income');
            $oexByDate  = $sumByDate('other_expense');

            // ── Step 3: compute derived totals ───────────────────────────
            // gross_profit_before_wastage[d] = revenue[d] - cos[d]
            $gpbwByDate = [];
            foreach ($dates as $d) {
                $gpbwByDate[$d] = ($revByDate[$d] ?? 0) - ($cosByDate[$d] ?? 0);
            }

            // gross_profit[d] = gross_profit_before_wastage[d] - wastages[d]
            $gpByDate = [];
            foreach ($dates as $d) {
                $gpByDate[$d] = ($gpbwByDate[$d]) - ($wastByDate[$d] ?? 0);
            }

            // operating_profit[d] = gross_profit[d] - sga[d]
            $opByDate = [];
            foreach ($dates as $d) {
                $opByDate[$d] = ($gpByDate[$d] ?? 0) - ($sgaByDate[$d] ?? 0);
            }

            // net_profit[d] = operating_profit[d] + other_income[d] - other_expense[d]
            $npByDate = [];
            foreach ($dates as $d) {
                $npByDate[$d] = ($opByDate[$d] ?? 0)
                    + ($oinByDate[$d] ?? 0)
                    - ($oexByDate[$d] ?? 0);
            }

            // Profit distribution: Net Profit, less BIR & Savings (dynamic %), split 3 ways.
            $netProfitTotal   = array_sum($npByDate);
            $birSavingsPct    = (float) Setting::get('bir_savings_percent', 25);
            $birSavingsAmount = round($netProfitTotal * $birSavingsPct / 100, 2);
            $afterBirSavings  = $netProfitTotal - $birSavingsAmount;

            $profitDistribution = [
                'net_profit'          => $netProfitTotal,
                'bir_savings_percent' => $birSavingsPct,
                'bir_savings_amount'  => $birSavingsAmount,
                'after_bir_savings'   => $afterBirSavings,
                'per_share'           => round($afterBirSavings / 3, 2),
            ];

            // Partner profit split — each active partner's cut of net profit, per date.
            // Not stored anywhere; computed live from net profit, same as the xlsx does.
            $partners = Partner::where('is_active', true)->orderByDesc('share_percentage')->get();

            // ── Step 4: assemble final categories for the view ───────────
            $categories = $raw->map(function ($cat) use ($dates, $gpbwByDate, $gpByDate, $opByDate, $npByDate, $partners) {
                // For calculated categories, override date_totals & total
                if ($cat['type'] === 'gross_profit') {
                    // Inject a virtual "Gross Profit before Wastage" row before Wastages
                    $gpbwEntries = collect($dates)
                        ->mapWithKeys(fn($d) => [$d => $gpbwByDate[$d]])
                        ->filter(fn($v) => $v != 0);

                    $virtualRow = [
                        'id'           => 'gpbw',
                        'name'         => 'Gross Profit before Wastage',
                        'is_auto'      => true,
                        'is_subtotal'  => true,
                        'source_label' => null,
                        'source_link'  => null,
                        'entries'      => $gpbwEntries,
                    ];

                    $lineItems = collect([$virtualRow])->concat($cat['line_items']);

                    return array_merge($cat, [
                        'line_items'  => $lineItems,
                        'date_totals' => $gpByDate,
                        'total'       => array_sum($gpByDate),
                    ]);
                }

                if ($cat['type'] === 'operating_profit') {
                    return array_merge($cat, [
                        'line_items'  => collect(),
                        'date_totals' => $opByDate,
                        'total'       => array_sum($opByDate),
                    ]);
                }

                if ($cat['type'] === 'net_profit') {
                    $partnerRows = $partners->map(function (Partner $partner) use ($dates, $npByDate) {
                        $share = (float) $partner->share_percentage / 100;

                        $entries = collect($dates)
                            ->mapWithKeys(fn($d) => [$d => $npByDate[$d] * $share])
                            ->filter(fn($v) => $v != 0);

                        return [
                            'id'           => 'partner-' . $partner->id,
                            'name'         => $partner->name . ' (' . rtrim(rtrim(number_format($partner->share_percentage, 2), '0'), '.') . '%)',
                            'is_auto'      => true,
                            'is_subtotal'  => true,
                            'source_label' => null,
                            'source_link'  => null,
                            'entries'      => $entries,
                        ];
                    });

                    return array_merge($cat, [
                        'line_items'  => $partnerRows,
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

        // Reference data for the quick-add dialogs (add an Expense/Purchase/Receivable/
        // Salary/Wastage entry directly from an auto-linked P&L cell without navigating away).
        $expenseCategories = ExpenseCategory::whereNotNull('pnl_line_item_id')->get(['id', 'name', 'pnl_line_item_id']);
        $suppliers         = Supplier::orderBy('name')->get(['id', 'name']);
        $customers         = Customer::orderBy('name')->get(['id', 'name']);
        $employees         = Employee::where('is_active', true)->orderBy('name')->get(['id', 'name', 'role']);
        $itemOptions       = Item::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'default_price']);
        $purchaseLines     = PurchaseItem::pickerOptionsForPeriod($currentPeriod?->id);

        return Inertia::render('PNL/Index', compact(
            'periods', 'currentPeriod', 'categories', 'dates',
            'expenseCategories', 'suppliers', 'customers', 'employees', 'itemOptions', 'purchaseLines',
            'profitDistribution'
        ));
    }

    public function updateBirSavingsPercent(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'bir_savings_percent' => 'required|numeric|min:0|max:100',
        ]);

        Setting::set('bir_savings_percent', $validated['bir_savings_percent']);

        return back()->with('success', 'BIR & Savings percentage updated.');
    }

    /**
     * Existing records feeding one specific auto-linked cell (line item + date), so the
     * quick-add dialog can list/edit/delete what's already there instead of blindly adding.
     * A cell can be the sum of more than one record, so this always returns a list.
     */
    public function cellEntries(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pnl_line_item_id' => 'required|exists:pnl_line_items,id',
            'pnl_period_id'    => 'required|exists:pnl_periods,id',
            'date'             => 'required|date',
        ]);

        $item = PnlLineItem::withCount('expenseCategories')->findOrFail($validated['pnl_line_item_id']);
        $type = $item->autoSource()['type'] ?? null;

        $entries = match ($type) {
            'expense' => Expense::where('pnl_period_id', $validated['pnl_period_id'])
                ->where('expense_date', $validated['date'])
                ->whereIn('expense_category_id', ExpenseCategory::where('pnl_line_item_id', $item->id)->pluck('id'))
                ->get()
                ->map(fn(Expense $e) => [
                    'id' => $e->id, 'amount' => (float) $e->amount, 'label' => $e->description ?: '(no description)',
                    'description' => $e->description, 'expense_date' => $e->expense_date->format('Y-m-d'),
                    'reference_no' => $e->reference_no, 'paid_by' => $e->paid_by, 'notes' => $e->notes,
                ]),
            'purchase' => PurchaseOrder::where('pnl_period_id', $validated['pnl_period_id'])
                ->where('pnl_line_item_id', $item->id)
                ->where('po_date', $validated['date'])
                ->with(['supplier:id,name', 'items'])
                ->get()
                ->map(fn(PurchaseOrder $p) => [
                    'id' => $p->id, 'amount' => (float) $p->total_amount, 'label' => $p->supplier?->name ?? '(no supplier)',
                    'supplier_id' => $p->supplier_id, 'total_amount' => (float) $p->total_amount,
                    'po_date' => $p->po_date->format('Y-m-d'), 'notes' => $p->notes,
                    'items' => $p->items->map(fn($it) => [
                        'item_name' => $it->item_name, 'qty' => (float) $it->qty, 'unit_price' => (float) $it->unit_price,
                    ]),
                ]),
            'invoice' => Invoice::where('pnl_period_id', $validated['pnl_period_id'])
                ->where('pnl_line_item_id', $item->id)
                ->where('invoice_date', $validated['date'])
                ->with(['customer:id,name', 'items'])
                ->get()
                ->map(fn(Invoice $i) => [
                    'id' => $i->id, 'amount' => (float) $i->total_amount,
                    'label' => ($i->customer?->name ?? '(no customer)') . ' — #' . $i->invoice_no,
                    'invoice_no' => $i->invoice_no, 'customer_id' => $i->customer_id, 'total_amount' => (float) $i->total_amount,
                    'invoice_date' => $i->invoice_date->format('Y-m-d'), 'notes' => $i->notes,
                    'items' => $i->items->map(fn($it) => [
                        'item_name' => $it->item_name, 'qty' => (float) $it->qty, 'unit_price' => (float) $it->unit_price,
                    ]),
                ]),
            'salary' => SalaryEntry::where('pnl_period_id', $validated['pnl_period_id'])
                ->where('pnl_line_item_id', $item->id)
                ->where('payment_date', $validated['date'])
                ->with('employee:id,name')
                ->get()
                ->map(fn(SalaryEntry $s) => [
                    'id' => $s->id, 'amount' => (float) $s->amount, 'label' => $s->employee?->name ?? '(no employee)',
                    'employee_id' => $s->employee_id, 'payment_date' => $s->payment_date->format('Y-m-d'), 'notes' => $s->notes,
                ]),
            'wastage' => WastageEntry::where('pnl_period_id', $validated['pnl_period_id'])
                ->where('pnl_line_item_id', $item->id)
                ->where('wastage_date', $validated['date'])
                ->get()
                ->map(fn(WastageEntry $w) => [
                    'id' => $w->id, 'amount' => (float) $w->amount, 'label' => $w->item_name,
                    'item_name' => $w->item_name, 'unit' => $w->unit, 'qty' => (float) $w->qty,
                    'cost_price' => (float) $w->cost_price, 'wastage_date' => $w->wastage_date->format('Y-m-d'), 'notes' => $w->notes,
                ]),
            'reseko' => ResekoEntry::where('pnl_period_id', $validated['pnl_period_id'])
                ->where('pnl_line_item_id', $item->id)
                ->where('reseko_date', $validated['date'])
                ->with('purchaseItem.purchaseOrder.supplier:id,name')
                ->get()
                ->map(fn(ResekoEntry $r) => [
                    'id' => $r->id, 'amount' => (float) $r->amount, 'label' => $r->item_name,
                    'item_name' => $r->item_name, 'unit' => $r->unit, 'qty' => (float) $r->qty,
                    'cost_price' => (float) $r->cost_price, 'reseko_date' => $r->reseko_date->format('Y-m-d'), 'notes' => $r->notes,
                    'purchase_item_id' => $r->purchase_item_id,
                    'supplier_name' => $r->purchaseItem?->purchaseOrder?->supplier?->name,
                ]),
            default => collect(),
        };

        return response()->json(['source_type' => $type, 'entries' => $entries->values()]);
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

        $this->assertManualEntryAllowed((int) $validated['pnl_line_item_id']);

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

    public function storeEntriesBatch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pnl_period_id'              => 'required|exists:pnl_periods,id',
            'entries'                    => 'required|array|min:1',
            'entries.*.pnl_line_item_id' => 'required|exists:pnl_line_items,id',
            'entries.*.entry_date'       => 'required|date',
            'entries.*.amount'           => 'required|numeric',
        ]);

        $period = PnlPeriod::findOrFail($validated['pnl_period_id']);
        abort_if($period->is_closed, 403, 'Period is closed.');

        foreach ($validated['entries'] as $entry) {
            $this->assertManualEntryAllowed((int) $entry['pnl_line_item_id']);
        }

        DB::transaction(function () use ($validated) {
            foreach ($validated['entries'] as $entry) {
                PnlEntry::updateOrCreate(
                    [
                        'pnl_period_id'    => $validated['pnl_period_id'],
                        'pnl_line_item_id' => $entry['pnl_line_item_id'],
                        'entry_date'       => $entry['entry_date'],
                    ],
                    ['amount' => $entry['amount']]
                );
            }
        });

        return back()->with('success', count($validated['entries']) . ' entries saved.');
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

    public function destroyPeriod(PnlPeriod $period): RedirectResponse
    {
        // Soft delete only — entries/expenses/purchases/invoices/salaries/wastages tied
        // to this period are left untouched in the database in case the data is needed
        // again later (e.g. restoring the period via tinker).
        $period->delete();

        return redirect('/pnl')->with('success', 'Period deleted.');
    }

    private function assertManualEntryAllowed(int $lineItemId): void
    {
        $item = PnlLineItem::withCount('expenseCategories')->findOrFail($lineItemId);
        $auto = $item->autoSource();

        if ($auto) {
            abort(422, "\"{$item->name}\" is auto-computed from {$auto['label']} and can't be entered manually.");
        }
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
