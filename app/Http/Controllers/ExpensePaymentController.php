<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpensePayment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExpensePaymentController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'expense_id'    => 'required|exists:expenses,id',
            'payment_date'  => 'required|date',
            'amount'        => 'required|numeric|min:0.01',
            'tax_withheld'  => 'nullable|numeric|min:0',
            'method'        => 'nullable|string|max:50',
            'reference_no'  => 'nullable|string|max:100',
            'bank_name'     => 'required_if:method,Check|nullable|string|max:150',
            'check_no'      => 'required_if:method,Check|nullable|string|max:100',
            'check_date'    => 'required_if:method,Check|nullable|date',
            'notes'         => 'nullable|string',
        ]);

        $taxWithheld = $validated['tax_withheld'] ?? 0;

        $expense = Expense::findOrFail($validated['expense_id']);
        abort_if($expense->period?->is_closed, 403, 'Period is closed.');

        $settled  = round($validated['amount'] + $taxWithheld, 4);
        $remaining = round((float) $expense->amount - (float) $expense->paid_amount, 4);

        if ($settled > $remaining + 0.0001) {
            throw ValidationException::withMessages([
                'amount' => "Amount paid plus tax withheld (₱{$settled}) exceeds the remaining balance (₱{$remaining}).",
            ]);
        }

        DB::transaction(function () use ($expense, $validated, $taxWithheld) {
            $expense->payments()->create([
                'payment_date' => $validated['payment_date'],
                'amount'       => $validated['amount'],
                'tax_withheld' => $taxWithheld,
                'method'       => $validated['method'] ?? null,
                'reference_no' => $validated['reference_no'] ?? null,
                'bank_name'    => $validated['bank_name'] ?? null,
                'check_no'     => $validated['check_no'] ?? null,
                'check_date'   => $validated['check_date'] ?? null,
                'notes'        => $validated['notes'] ?? null,
            ]);

            $this->recomputeExpense($expense);
        });

        return back()->with('success', 'Payment recorded.');
    }

    public function destroy(ExpensePayment $expensePayment): RedirectResponse
    {
        $expense = $expensePayment->expense;
        abort_if($expense->period?->is_closed, 403, 'Period is closed.');

        DB::transaction(function () use ($expensePayment, $expense) {
            $expensePayment->delete();
            $this->recomputeExpense($expense);
        });

        return back()->with('success', 'Payment deleted.');
    }

    private function recomputeExpense(Expense $expense): void
    {
        $paid = (float) $expense->payments()->sum('amount')
              + (float) $expense->payments()->sum('tax_withheld');
        $status = $paid <= 0 ? 'unpaid' : ($paid >= (float) $expense->amount ? 'paid' : 'partial');

        $expense->update(['paid_amount' => $paid, 'status' => $status]);
    }
}
