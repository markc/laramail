<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MailControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_guests_cannot_access_mail(): void
    {
        auth()->logout();

        $this->get(route('mail.index'))
            ->assertRedirect(route('login'));
    }

    public function test_mail_page_renders_without_jmap_session(): void
    {
        $response = $this->get(route('mail.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mail/index')
            ->where('hasJmapSession', false)
        );
    }

    public function test_mail_page_renders_with_jmap_session(): void
    {
        $this->user->update([
            'jmap_token_encrypted' => 'test-token',
            'jmap_account_id' => 'abc123',
            'jmap_token_expires_at' => now()->addHour(),
        ]);

        $response = $this->get(route('mail.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mail/index')
            ->where('hasJmapSession', true)
        );
    }

    public function test_mail_page_shows_no_session_when_token_expired(): void
    {
        $this->user->update([
            'jmap_token_encrypted' => 'test-token',
            'jmap_account_id' => 'abc123',
            'jmap_token_expires_at' => now()->subHour(),
        ]);

        $response = $this->get(route('mail.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mail/index')
            ->where('hasJmapSession', false)
        );
    }
}
