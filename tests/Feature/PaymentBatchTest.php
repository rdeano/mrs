<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\PaymentBatch;
use App\Models\PnlPeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentBatchTest extends TestCase
{
    use RefreshDatabase;

    private function makeInvoice(string $invoiceNo, float $amount, bool $periodClosed = false): Invoice
    {
        $customer = Customer::create(['name' => "Customer {$invoiceNo}"]);
        $period = PnlPeriod::create([
            'name' => "Period {$invoiceNo}",
            'start_date' => '2026-01-01',
            'end_date' => '2026-01-31',
            'is_closed' => $periodClosed,
        ]);

        $invoice = Invoice::create([
            'invoice_no' => $invoiceNo,
            'customer_id' => $customer->id,
            'pnl_period_id' => $period->id,
            'invoice_date' => '2026-01-05',
            'due_date' => '2026-02-05',
            'status' => 'sent',
            'total_amount' => $amount,
            'paid_amount' => 0,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'item_name' => 'Pork Belly',
            'unit' => 'kg',
            'qty' => 1,
            'unit_price' => $amount,
            'amount' => $amount,
        ]);

        return $invoice->fresh('items');
    }

    public function test_it_records_one_check_across_multiple_invoices(): void
    {
        $user = User::factory()->create();
        $invoiceA = $this->makeInvoice('INV-A', 1000);
        $invoiceB = $this->makeInvoice('INV-B', 500);

        $response = $this->actingAs($user)->post('/payments/batch', [
            'payment_date' => '2026-01-10',
            'method' => 'Check',
            'bank_name' => 'BDO',
            'check_no' => 'CHK-001',
            'check_date' => '2026-01-09',
            'invoices' => [
                [
                    'invoice_id' => $invoiceA->id,
                    'amount' => 1000,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceA->items->first()->id, 'amount' => 1000],
                    ],
                ],
                [
                    'invoice_id' => $invoiceB->id,
                    'amount' => 500,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceB->items->first()->id, 'amount' => 500],
                    ],
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertSame(1, PaymentBatch::count());
        $batch = PaymentBatch::first();
        $this->assertSame('CHK-001', $batch->check_no);
        $this->assertSame(2, $batch->payments()->count());

        $invoiceA->refresh();
        $invoiceB->refresh();
        $this->assertSame('1000.0000', $invoiceA->paid_amount);
        $this->assertSame('paid', $invoiceA->status);
        $this->assertSame('500.0000', $invoiceB->paid_amount);
        $this->assertSame('paid', $invoiceB->status);

        $this->assertSame(2, Payment::whereNotNull('payment_batch_id')->count());
    }

    public function test_it_splits_one_withholding_tax_certificate_across_invoices(): void
    {
        $user = User::factory()->create();
        $invoiceA = $this->makeInvoice('INV-WT-A', 800);
        $invoiceB = $this->makeInvoice('INV-WT-B', 200);

        $response = $this->actingAs($user)->post('/payments/batch', [
            'payment_date' => '2026-01-10',
            'method' => 'Check',
            'bank_name' => 'BDO',
            'check_no' => 'CHK-WT',
            'check_date' => '2026-01-09',
            'wt_cert_no' => '2307-00456',
            'wt_cert_date' => '2026-01-09',
            'invoices' => [
                [
                    'invoice_id' => $invoiceA->id,
                    'amount' => 760,
                    'tax_withheld' => 40,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceA->items->first()->id, 'amount' => 800],
                    ],
                ],
                [
                    'invoice_id' => $invoiceB->id,
                    'amount' => 190,
                    'tax_withheld' => 10,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceB->items->first()->id, 'amount' => 200],
                    ],
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $invoiceA->refresh();
        $invoiceB->refresh();
        $this->assertSame('paid', $invoiceA->status);
        $this->assertSame('paid', $invoiceB->status);

        $paymentA = Payment::where('invoice_id', $invoiceA->id)->firstOrFail();
        $paymentB = Payment::where('invoice_id', $invoiceB->id)->firstOrFail();

        $this->assertSame('40.0000', $paymentA->tax_withheld);
        $this->assertSame('2307-00456', $paymentA->wt_cert_no);
        $this->assertSame('10.0000', $paymentB->tax_withheld);
        $this->assertSame('2307-00456', $paymentB->wt_cert_no);
        $this->assertSame($paymentA->wt_cert_date->toDateString(), $paymentB->wt_cert_date->toDateString());
    }

    public function test_it_rejects_a_batch_with_fewer_than_two_invoices(): void
    {
        $user = User::factory()->create();
        $invoiceA = $this->makeInvoice('INV-C', 1000);

        $response = $this->actingAs($user)->post('/payments/batch', [
            'payment_date' => '2026-01-10',
            'method' => 'Cash',
            'invoices' => [
                [
                    'invoice_id' => $invoiceA->id,
                    'amount' => 1000,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceA->items->first()->id, 'amount' => 1000],
                    ],
                ],
            ],
        ]);

        $response->assertSessionHasErrors('invoices');
        $this->assertSame(0, PaymentBatch::count());
    }

    public function test_it_rejects_mismatched_allocations(): void
    {
        $user = User::factory()->create();
        $invoiceA = $this->makeInvoice('INV-D', 1000);
        $invoiceB = $this->makeInvoice('INV-E', 500);

        $response = $this->actingAs($user)->post('/payments/batch', [
            'payment_date' => '2026-01-10',
            'method' => 'Cash',
            'invoices' => [
                [
                    'invoice_id' => $invoiceA->id,
                    'amount' => 1000,
                    'allocations' => [
                        // allocated less than amount received
                        ['invoice_item_id' => $invoiceA->items->first()->id, 'amount' => 400],
                    ],
                ],
                [
                    'invoice_id' => $invoiceB->id,
                    'amount' => 500,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceB->items->first()->id, 'amount' => 500],
                    ],
                ],
            ],
        ]);

        $response->assertSessionHasErrors('amount');
        $this->assertSame(0, PaymentBatch::count());
        $this->assertSame(0, Payment::count());
    }

    public function test_it_rejects_a_batch_touching_a_closed_period(): void
    {
        $user = User::factory()->create();
        $invoiceA = $this->makeInvoice('INV-F', 1000);
        $invoiceB = $this->makeInvoice('INV-G', 500, periodClosed: true);

        $response = $this->actingAs($user)->post('/payments/batch', [
            'payment_date' => '2026-01-10',
            'method' => 'Cash',
            'invoices' => [
                [
                    'invoice_id' => $invoiceA->id,
                    'amount' => 1000,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceA->items->first()->id, 'amount' => 1000],
                    ],
                ],
                [
                    'invoice_id' => $invoiceB->id,
                    'amount' => 500,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceB->items->first()->id, 'amount' => 500],
                    ],
                ],
            ],
        ]);

        $response->assertForbidden();
        $this->assertSame(0, PaymentBatch::count());
        $this->assertSame(0, Payment::count());
    }

    public function test_deleting_every_leg_of_a_batch_removes_the_batch(): void
    {
        $user = User::factory()->create();
        $invoiceA = $this->makeInvoice('INV-H', 1000);
        $invoiceB = $this->makeInvoice('INV-I', 500);

        $this->actingAs($user)->post('/payments/batch', [
            'payment_date' => '2026-01-10',
            'method' => 'Cash',
            'invoices' => [
                [
                    'invoice_id' => $invoiceA->id,
                    'amount' => 1000,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceA->items->first()->id, 'amount' => 1000],
                    ],
                ],
                [
                    'invoice_id' => $invoiceB->id,
                    'amount' => 500,
                    'allocations' => [
                        ['invoice_item_id' => $invoiceB->items->first()->id, 'amount' => 500],
                    ],
                ],
            ],
        ]);

        $batch = PaymentBatch::firstOrFail();
        $payments = $batch->payments;
        $this->assertSame(2, $payments->count());

        $this->actingAs($user)->delete("/payments/{$payments[0]->id}");
        $this->assertSame(1, PaymentBatch::count());

        $this->actingAs($user)->delete("/payments/{$payments[1]->id}");
        $this->assertSame(0, PaymentBatch::count());

        $invoiceA->refresh();
        $invoiceB->refresh();
        $this->assertSame('0.0000', $invoiceA->paid_amount);
        $this->assertSame('0.0000', $invoiceB->paid_amount);
    }
}
