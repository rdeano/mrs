<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('wt_cert_no')->nullable()->after('tax_withheld');
            $table->date('wt_cert_date')->nullable()->after('wt_cert_no');
        });

        Schema::table('payment_batches', function (Blueprint $table) {
            $table->string('wt_cert_no')->nullable()->after('check_date');
            $table->date('wt_cert_date')->nullable()->after('wt_cert_no');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['wt_cert_no', 'wt_cert_date']);
        });

        Schema::table('payment_batches', function (Blueprint $table) {
            $table->dropColumn(['wt_cert_no', 'wt_cert_date']);
        });
    }
};
