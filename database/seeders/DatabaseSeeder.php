<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Mark Constable',
            'email' => 'markc@renta.net',
            'password' => bcrypt('changeme_N0W'),
        ]);

        $this->call(SystemPromptTemplateSeeder::class);
    }
}
