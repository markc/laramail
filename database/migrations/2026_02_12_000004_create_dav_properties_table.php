<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('propertystorage', function (Blueprint $table) {
            $table->id();
            $table->string('path', 1024);
            $table->string('name', 100);
            $table->integer('valuetype')->nullable();
            $table->text('value')->nullable();
            $table->unique(['path', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('propertystorage');
    }
};
