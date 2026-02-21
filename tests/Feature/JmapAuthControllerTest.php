<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JmapAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_connect_authenticates_with_stalwart(): void
    {
        Http::fake([
            config('jmap.jmap_session_url') => Http::response([
                'apiUrl' => 'https://mail.kanary.org/jmap/',
                'downloadUrl' => 'https://mail.kanary.org/jmap/download/{accountId}/{blobId}/{name}?type={type}',
                'uploadUrl' => 'https://mail.kanary.org/jmap/upload/{accountId}/',
                'primaryAccounts' => [
                    'urn:ietf:params:jmap:mail' => 'abc123',
                ],
                'accounts' => [
                    'abc123' => ['name' => 'Test User'],
                ],
            ]),
        ]);

        $response = $this->postJson(route('jmap.connect'), [
            'email' => 'test@kanary.org',
            'password' => 'secret',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'accountId',
            'apiUrl',
            'downloadUrl',
            'uploadUrl',
            'displayName',
        ]);
        $response->assertJson(['accountId' => 'abc123']);

        $this->user->refresh();
        $this->assertEquals('abc123', $this->user->jmap_account_id);
        $this->assertEquals('Test User', $this->user->jmap_display_name);
        $this->assertNotNull($this->user->jmap_token_encrypted);
        $this->assertNotNull($this->user->jmap_token_expires_at);
    }

    public function test_connect_fails_with_invalid_credentials(): void
    {
        Http::fake([
            config('jmap.jmap_session_url') => Http::response([], 401),
        ]);

        $response = $this->postJson(route('jmap.connect'), [
            'email' => 'bad@kanary.org',
            'password' => 'wrong',
        ]);

        $response->assertStatus(401);
        $response->assertJson(['message' => 'Invalid email or password']);
    }

    public function test_connect_validates_email_required(): void
    {
        $response = $this->postJson(route('jmap.connect'), [
            'password' => 'secret',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('email');
    }

    public function test_connect_validates_password_required(): void
    {
        $response = $this->postJson(route('jmap.connect'), [
            'email' => 'test@kanary.org',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('password');
    }

    public function test_session_returns_data_when_connected(): void
    {
        Http::fake([
            config('jmap.jmap_session_url') => Http::response([
                'apiUrl' => 'https://mail.kanary.org/jmap/',
                'downloadUrl' => 'https://mail.kanary.org/jmap/download/{accountId}/{blobId}/{name}',
                'uploadUrl' => 'https://mail.kanary.org/jmap/upload/{accountId}/',
            ]),
        ]);

        $this->user->update([
            'jmap_token_encrypted' => 'test-token',
            'jmap_account_id' => 'abc123',
            'jmap_display_name' => 'Test User',
            'jmap_token_expires_at' => now()->addHour(),
        ]);

        $response = $this->getJson(route('jmap.session'));

        $response->assertOk();
        $response->assertJson([
            'connected' => true,
            'accountId' => 'abc123',
            'displayName' => 'Test User',
        ]);
    }

    public function test_session_returns_not_connected_when_no_token(): void
    {
        $response = $this->getJson(route('jmap.session'));

        $response->assertOk();
        $response->assertJson(['connected' => false]);
    }

    public function test_session_returns_expired_when_token_expired(): void
    {
        $this->user->update([
            'jmap_token_encrypted' => 'test-token',
            'jmap_account_id' => 'abc123',
            'jmap_token_expires_at' => now()->subHour(),
        ]);

        $response = $this->getJson(route('jmap.session'));

        $response->assertOk();
        $response->assertJson(['connected' => false, 'expired' => true]);
    }

    public function test_disconnect_clears_jmap_fields(): void
    {
        $this->user->update([
            'jmap_session_url' => 'https://mail.kanary.org/.well-known/jmap',
            'jmap_token_encrypted' => 'test-token',
            'jmap_account_id' => 'abc123',
            'jmap_display_name' => 'Test User',
            'jmap_token_expires_at' => now()->addHour(),
        ]);

        $response = $this->postJson(route('jmap.disconnect'));

        $response->assertOk();
        $response->assertJson(['disconnected' => true]);

        $this->user->refresh();
        $this->assertNull($this->user->jmap_session_url);
        $this->assertNull($this->user->jmap_account_id);
        $this->assertNull($this->user->jmap_display_name);
        $this->assertNull($this->user->jmap_token_expires_at);
    }

    public function test_guests_cannot_access_jmap_routes(): void
    {
        auth()->logout();

        $this->postJson(route('jmap.connect'), [
            'email' => 'test@kanary.org',
            'password' => 'secret',
        ])->assertUnauthorized();

        $this->getJson(route('jmap.session'))->assertUnauthorized();
        $this->postJson(route('jmap.disconnect'))->assertUnauthorized();
    }
}
