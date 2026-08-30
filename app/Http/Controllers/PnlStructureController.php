<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use App\Models\PnlCategory;
use App\Models\PnlLineItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PnlStructureController extends Controller
{
    public function index(): Response
    {
        $categories = PnlCategory::with(['lineItems' => fn($q) => $q->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get()
            ->map(function (PnlCategory $cat) {
                return [
                    'id'            => $cat->id,
                    'name'          => $cat->name,
                    'type'          => $cat->type,
                    'is_calculated' => $cat->is_calculated,
                    'is_active'     => $cat->is_active,
                    'sort_order'    => $cat->sort_order,
                    'line_items'    => $cat->lineItems->map(function (PnlLineItem $item) {
                        $auto = $item->autoSource();
                        return [
                            'id'            => $item->id,
                            'name'          => $item->name,
                            'is_active'     => $item->is_active,
                            'sort_order'    => $item->sort_order,
                            'pnl_category_id' => $item->pnl_category_id,
                            'auto_source'   => $item->auto_source,
                            'is_locked'     => in_array($item->auto_source, ['purchase', 'invoice', 'wastage', 'salary']),
                            'source_label'  => $auto['label'] ?? null,
                        ];
                    }),
                ];
            });

        $expenseCategories = ExpenseCategory::with('pnlLineItem:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'pnl_line_item_id']);

        return Inertia::render('Settings/PnlStructure/Index', [
            'categories'        => $categories,
            'expenseCategories' => $expenseCategories,
            'editableCategoryIds' => PnlCategory::where('is_calculated', false)->pluck('id'),
        ]);
    }

    public function updateCategory(Request $request, PnlCategory $category): RedirectResponse
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:100',
            'is_active' => 'required|boolean',
        ]);

        $category->update($validated);

        return back()->with('success', 'Category updated.');
    }

    public function moveCategory(Request $request, PnlCategory $category): RedirectResponse
    {
        $validated = $request->validate(['direction' => 'required|in:up,down']);

        abort_if($category->is_calculated, 422, 'This category is a calculated row and cannot be reordered.');

        $siblings = PnlCategory::where('is_calculated', false)->orderBy('sort_order')->get();
        $this->swapSortOrder($siblings, $category, $validated['direction']);

        return back()->with('success', 'Category reordered.');
    }

    public function storeLineItem(Request $request): RedirectResponse
    {
        $validated = $this->validateLineItem($request);

        $category = PnlCategory::findOrFail($validated['pnl_category_id']);
        abort_if($category->is_calculated, 422, 'Cannot add line items to a calculated category.');

        $nextSort = (int) PnlLineItem::where('pnl_category_id', $category->id)->max('sort_order');

        $item = PnlLineItem::create([
            'pnl_category_id' => $category->id,
            'name'            => $validated['name'],
            'sort_order'      => $nextSort + 1,
            'is_active'       => true,
        ]);

        $this->applySource($item, $validated);

        return back()->with('success', 'Line item added.');
    }

    public function updateLineItem(Request $request, PnlLineItem $item): RedirectResponse
    {
        $locked = in_array($item->auto_source, ['purchase', 'invoice', 'wastage', 'salary']);

        if ($locked) {
            $validated = $request->validate([
                'name'      => 'required|string|max:150',
                'is_active' => 'required|boolean',
            ]);
            $item->update($validated);

            return back()->with('success', 'Line item updated.');
        }

        $validated = $this->validateLineItem($request, $item);

        $category = PnlCategory::findOrFail($validated['pnl_category_id']);
        abort_if($category->is_calculated, 422, 'Line items cannot belong to a calculated category.');

        $item->update([
            'name'             => $validated['name'],
            'pnl_category_id'  => $category->id,
            'is_active'        => $validated['is_active'] ?? $item->is_active,
        ]);

        $this->applySource($item, $validated);

        return back()->with('success', 'Line item updated.');
    }

    public function moveLineItem(Request $request, PnlLineItem $item): RedirectResponse
    {
        $validated = $request->validate(['direction' => 'required|in:up,down']);

        $siblings = PnlLineItem::where('pnl_category_id', $item->pnl_category_id)->orderBy('sort_order')->get();
        $this->swapSortOrder($siblings, $item, $validated['direction']);

        return back()->with('success', 'Line item reordered.');
    }

    private function validateLineItem(Request $request, ?PnlLineItem $item = null): array
    {
        return $request->validate([
            'pnl_category_id' => [
                'required',
                Rule::exists('pnl_categories', 'id')->where('is_calculated', false),
            ],
            'name'                     => 'required|string|max:150',
            'is_active'                => 'boolean',
            'source'                   => 'required|in:manual,existing,new',
            'expense_category_id'      => 'required_if:source,existing|nullable|exists:expense_categories,id',
            'new_expense_category_name' => 'required_if:source,new|nullable|string|max:150',
        ]);
    }

    /**
     * Reassign which ExpenseCategory (if any) feeds this line item. The admin-facing
     * model is 1:1 even though the DB relation is hasMany, so any other ExpenseCategory
     * previously pointing here gets unlinked (falls back to manual) when reassigned.
     */
    private function applySource(PnlLineItem $item, array $validated): void
    {
        DB::transaction(function () use ($item, $validated) {
            ExpenseCategory::where('pnl_line_item_id', $item->id)->update(['pnl_line_item_id' => null]);

            if ($validated['source'] === 'existing') {
                ExpenseCategory::whereKey($validated['expense_category_id'])->update(['pnl_line_item_id' => $item->id]);
            } elseif ($validated['source'] === 'new') {
                $nextSort = (int) ExpenseCategory::max('sort_order');
                ExpenseCategory::create([
                    'name'             => $validated['new_expense_category_name'],
                    'sort_order'       => $nextSort + 1,
                    'pnl_line_item_id' => $item->id,
                ]);
            }
        });
    }

    private function swapSortOrder($siblings, $model, string $direction): void
    {
        $index = $siblings->search(fn($s) => $s->id === $model->id);
        if ($index === false) {
            return;
        }

        $targetIndex = $direction === 'up' ? $index - 1 : $index + 1;
        if ($targetIndex < 0 || $targetIndex >= $siblings->count()) {
            return;
        }

        $target = $siblings[$targetIndex];
        $modelClass = get_class($model);

        DB::transaction(function () use ($modelClass, $model, $target) {
            $modelSort  = $model->sort_order;
            $targetSort = $target->sort_order;
            $modelClass::whereKey($model->id)->update(['sort_order' => $targetSort]);
            $modelClass::whereKey($target->id)->update(['sort_order' => $modelSort]);
        });
    }
}
