<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('dav_principal_uri', 200)->nullable()->unique()->after('email');
            $table->string('syncthing_path')->nullable()->after('dav_principal_uri');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['dav_principal_uri', 'syncthing_path']);
        });
    }
};
