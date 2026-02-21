<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JmapAttachmentControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'jmap_token_encrypted' => 'test-token',
            'jmap_account_id' => 'abc123',
            'jmap_display_name' => 'Test User',
            'jmap_token_expires_at' => now()->addHour(),
        ]);
        $this->actingAs($this->user);
    }

    public function test_download_proxies_blob_from_stalwart(): void
    {
        Http::fake([
            config('jmap.jmap_session_url') => Http::response([
                'downloadUrl' => 'https://mail.kanary.org/jmap/download/{accountId}/{blobId}/{name}?type={type}',
            ]),
            'https://mail.kanary.org/jmap/download/*' => Http::response('file-content', 200, [
                'Content-Type' => 'application/pdf',
            ]),
        ]);

        $response = $this->get(route('jmap.blob.download', ['blobId' => 'blob-123', 'name' => 'doc.pdf']));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_download_requires_jmap_session(): void
    {
        $this->user->update([
            'jmap_token_encrypted' => null,
            'jmap_account_id' => null,
        ]);

        $response = $this->getJson(route('jmap.blob.download', ['blobId' => 'blob-123', 'name' => 'doc.pdf']));

        $response->assertStatus(401);
    }

    public function test_upload_proxies_file_to_stalwart(): void
    {
        Http::fake([
            config('jmap.jmap_session_url') => Http::response([
                'uploadUrl' => 'https://mail.kanary.org/jmap/upload/{accountId}/',
            ]),
            'https://mail.kanary.org/jmap/upload/*' => Http::response([
                'blobId' => 'uploaded-blob-123',
                'type' => 'image/png',
                'size' => 1024,
            ]),
        ]);

        $file = UploadedFile::fake()->create('image.png', 100, 'image/png');

        $response = $this->postJson(route('jmap.blob.upload'), [
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertJson([
            'blobId' => 'uploaded-blob-123',
            'type' => 'image/png',
            'size' => 1024,
        ]);
    }

    public function test_upload_requires_file(): void
    {
        $response = $this->postJson(route('jmap.blob.upload'), []);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('file');
    }

    public function test_upload_requires_jmap_session(): void
    {
        $this->user->update([
            'jmap_token_encrypted' => null,
            'jmap_account_id' => null,
        ]);

        $file = UploadedFile::fake()->create('test.txt', 10);

        $response = $this->postJson(route('jmap.blob.upload'), [
            'file' => $file,
        ]);

        $response->assertStatus(401);
    }

    public function test_guests_cannot_access_blob_routes(): void
    {
        auth()->logout();

        $this->getJson(route('jmap.blob.download', ['blobId' => 'blob-123', 'name' => 'doc.pdf']))
            ->assertUnauthorized();

        $this->postJson(route('jmap.blob.upload'))
            ->assertUnauthorized();
    }
}
