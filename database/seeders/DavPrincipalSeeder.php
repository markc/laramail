<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DavPrincipalSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::whereNull('dav_principal_uri')->get();

        foreach ($users as $user) {
            $uri = 'principals/' . $user->email;

            DB::table('principals')->insertOrIgnore([
                'uri' => $uri,
                'displayname' => $user->name,
                'email' => $user->email,
            ]);

            // Calendar proxy principals for delegation
            DB::table('principals')->insertOrIgnore([
                'uri' => $uri . '/calendar-proxy-read',
                'displayname' => null,
                'email' => null,
            ]);

            DB::table('principals')->insertOrIgnore([
                'uri' => $uri . '/calendar-proxy-write',
                'displayname' => null,
                'email' => null,
            ]);

            $user->update(['dav_principal_uri' => $uri]);
        }
    }
}
