<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addressbooks', function (Blueprint $table) {
            $table->id();
            $table->string('principaluri', 255)->nullable()->index();
            $table->string('uri', 200)->nullable();
            $table->string('displayname', 255)->nullable();
            $table->text('description')->nullable();
            $table->integer('synctoken')->default(1);
            $table->unique(['principaluri', 'uri']);
        });

        Schema::create('cards', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('addressbookid')->index();
            $table->string('uri', 200)->nullable();
            $table->text('carddata')->nullable();
            $table->integer('lastmodified')->nullable();
            $table->string('etag', 32)->nullable();
            $table->integer('size')->nullable();
            $table->unique(['addressbookid', 'uri']);
            $table->foreign('addressbookid')->references('id')->on('addressbooks')->cascadeOnDelete();
        });

        Schema::create('addressbookchanges', function (Blueprint $table) {
            $table->id();
            $table->string('uri', 200);
            $table->integer('synctoken');
            $table->unsignedBigInteger('addressbookid')->index();
            $table->tinyInteger('operation');
            $table->index(['addressbookid', 'synctoken']);
            $table->foreign('addressbookid')->references('id')->on('addressbooks')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addressbookchanges');
        Schema::dropIfExists('cards');
        Schema::dropIfExists('addressbooks');
    }
};
