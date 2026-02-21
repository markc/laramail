<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('jmap_session_url')->nullable()->after('syncthing_path');
            $table->text('jmap_token_encrypted')->nullable()->after('jmap_session_url');
            $table->string('jmap_account_id')->nullable()->after('jmap_token_encrypted');
            $table->string('jmap_display_name')->nullable()->after('jmap_account_id');
            $table->dateTime('jmap_token_expires_at')->nullable()->after('jmap_display_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'jmap_session_url',
                'jmap_token_encrypted',
                'jmap_account_id',
                'jmap_display_name',
                'jmap_token_expires_at',
            ]);
        });
    }
};
