<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('principals', function (Blueprint $table) {
            $table->id();
            $table->string('uri', 200)->unique();
            $table->string('displayname', 80)->nullable();
            $table->string('email', 80)->nullable()->index();
        });

        Schema::create('groupmembers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('principal_id')->index();
            $table->unsignedBigInteger('member_id')->index();
            $table->unique(['principal_id', 'member_id']);
            $table->foreign('principal_id')->references('id')->on('principals')->cascadeOnDelete();
            $table->foreign('member_id')->references('id')->on('principals')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('groupmembers');
        Schema::dropIfExists('principals');
    }
};
