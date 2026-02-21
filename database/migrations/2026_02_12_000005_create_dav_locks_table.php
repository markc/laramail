<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locks', function (Blueprint $table) {
            $table->id();
            $table->string('owner', 100)->nullable();
            $table->string('token', 100)->nullable()->index();
            $table->integer('timeout')->nullable();
            $table->integer('created')->nullable();
            $table->tinyInteger('scope')->nullable();
            $table->tinyInteger('depth')->nullable();
            $table->string('uri', 1000)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locks');
    }
};
