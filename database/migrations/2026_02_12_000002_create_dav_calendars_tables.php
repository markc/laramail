<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendars', function (Blueprint $table) {
            $table->id();
            $table->integer('synctoken')->default(1);
            $table->string('components', 21)->nullable();
        });

        Schema::create('calendarinstances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('calendarid')->index();
            $table->string('principaluri', 100)->nullable()->index();
            $table->tinyInteger('access')->default(1); // 1 = owner
            $table->string('uri', 200)->nullable();
            $table->string('displayname', 100)->nullable();
            $table->string('description')->nullable();
            $table->text('timezone')->nullable();
            $table->string('calendarcolor', 10)->nullable();
            $table->integer('calendarorder')->default(0);
            $table->boolean('transparent')->default(false);
            $table->string('share_href', 100)->nullable();
            $table->string('share_displayname', 100)->nullable();
            $table->tinyInteger('share_invitestatus')->default(2); // 2 = accepted
            $table->unique(['principaluri', 'uri']);
            $table->foreign('calendarid')->references('id')->on('calendars')->cascadeOnDelete();
        });

        Schema::create('calendarobjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('calendarid')->index();
            $table->string('uri', 200)->nullable();
            $table->mediumText('calendardata')->nullable();
            $table->integer('lastmodified')->nullable();
            $table->string('etag', 32)->nullable();
            $table->integer('size')->nullable();
            $table->string('componenttype', 8)->nullable();
            $table->integer('firstoccurence')->nullable();
            $table->integer('lastoccurence')->nullable();
            $table->string('uid', 200)->nullable();
            $table->unique(['calendarid', 'uri']);
            $table->foreign('calendarid')->references('id')->on('calendars')->cascadeOnDelete();
        });

        Schema::create('calendarchanges', function (Blueprint $table) {
            $table->id();
            $table->string('uri', 200);
            $table->integer('synctoken');
            $table->unsignedBigInteger('calendarid')->index();
            $table->tinyInteger('operation'); // 1=add, 2=modify, 3=delete
            $table->index(['calendarid', 'synctoken']);
            $table->foreign('calendarid')->references('id')->on('calendars')->cascadeOnDelete();
        });

        Schema::create('schedulingobjects', function (Blueprint $table) {
            $table->id();
            $table->string('principaluri', 255)->nullable();
            $table->string('uri', 200)->nullable();
            $table->text('calendardata')->nullable();
            $table->integer('lastmodified')->nullable();
            $table->string('etag', 32)->nullable();
            $table->integer('size')->nullable();
        });

        Schema::create('calendarsubscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('principaluri', 100)->index();
            $table->string('uri', 200);
            $table->string('source')->nullable();
            $table->integer('lastmodified')->nullable();
            $table->string('displayname', 100)->nullable();
            $table->string('refreshrate', 10)->nullable();
            $table->integer('calendarorder')->default(0);
            $table->string('calendarcolor', 10)->nullable();
            $table->boolean('striptodos')->default(false);
            $table->boolean('stripalarms')->default(false);
            $table->boolean('stripattachments')->default(false);
            $table->unique(['principaluri', 'uri']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendarsubscriptions');
        Schema::dropIfExists('schedulingobjects');
        Schema::dropIfExists('calendarchanges');
        Schema::dropIfExists('calendarobjects');
        Schema::dropIfExists('calendarinstances');
        Schema::dropIfExists('calendars');
    }
};
