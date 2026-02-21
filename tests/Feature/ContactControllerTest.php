<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Sabre\VObject\Component\VCard;
use Tests\TestCase;

class ContactControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private int $addressbookId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);

        $this->addressbookId = DB::table('addressbooks')->insertGetId([
            'principaluri' => 'principals/'.$this->user->email,
            'uri' => 'default',
            'displayname' => 'Test Addressbook',
            'synctoken' => 1,
        ]);
    }

    public function test_guests_cannot_access_contacts(): void
    {
        auth()->logout();

        $this->get(route('contacts.index', $this->addressbookId))
            ->assertRedirect(route('login'));
    }

    public function test_index_returns_contacts(): void
    {
        $this->createCard('John Doe', 'john@example.com');

        $response = $this->get(route('contacts.index', $this->addressbookId));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('contacts/index')
            ->has('contacts', 1)
            ->where('contacts.0.name', 'John Doe')
            ->where('contacts.0.email', 'john@example.com')
        );
    }

    public function test_store_creates_contact(): void
    {
        $response = $this->post(route('contacts.store', $this->addressbookId), [
            'name' => 'Jane Smith',
            'email' => 'jane@example.com',
            'phone' => '+1234567890',
            'org' => 'Acme Inc',
            'title' => 'CEO',
            'url' => 'https://acme.com',
            'note' => 'A note about Jane',
            'address' => '123 Main St',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseCount('cards', 1);

        $card = DB::table('cards')->where('addressbookid', $this->addressbookId)->first();
        $this->assertStringContainsString('Jane Smith', $card->carddata);
        $this->assertStringContainsString('jane@example.com', $card->carddata);
        $this->assertStringContainsString('CEO', $card->carddata);
        $this->assertStringContainsString('https://acme.com', $card->carddata);
        $this->assertStringContainsString('A note about Jane', $card->carddata);
        $this->assertStringContainsString('123 Main St', $card->carddata);
    }

    public function test_store_validates_required_name(): void
    {
        $response = $this->post(route('contacts.store', $this->addressbookId), [
            'name' => '',
        ]);

        $response->assertSessionHasErrors('name');
    }

    public function test_store_validates_email_format(): void
    {
        $response = $this->post(route('contacts.store', $this->addressbookId), [
            'name' => 'Test User',
            'email' => 'not-an-email',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_store_validates_url_format(): void
    {
        $response = $this->post(route('contacts.store', $this->addressbookId), [
            'name' => 'Test User',
            'url' => 'not-a-url',
        ]);

        $response->assertSessionHasErrors('url');
    }

    public function test_store_allows_minimal_contact(): void
    {
        $response = $this->post(route('contacts.store', $this->addressbookId), [
            'name' => 'Minimal Contact',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseCount('cards', 1);
    }

    public function test_update_modifies_contact(): void
    {
        $cardId = $this->createCard('Old Name', 'old@example.com');

        $response = $this->put(route('contacts.update', [$this->addressbookId, $cardId]), [
            'name' => 'New Name',
            'email' => 'new@example.com',
            'phone' => '',
            'org' => 'New Org',
            'title' => 'CTO',
            'url' => 'https://neworg.com',
            'note' => 'Updated note',
            'address' => '456 Oak Ave',
        ]);

        $response->assertRedirect();

        $card = DB::table('cards')->where('id', $cardId)->first();
        $this->assertStringContainsString('New Name', $card->carddata);
        $this->assertStringContainsString('new@example.com', $card->carddata);
        $this->assertStringContainsString('CTO', $card->carddata);
    }

    public function test_destroy_deletes_contact(): void
    {
        $cardId = $this->createCard('Delete Me');

        $response = $this->delete(route('contacts.destroy', [$this->addressbookId, $cardId]));

        $response->assertRedirect();
        $this->assertDatabaseMissing('cards', ['id' => $cardId]);
    }

    public function test_bulk_destroy_deletes_multiple_contacts(): void
    {
        $id1 = $this->createCard('Contact One');
        $id2 = $this->createCard('Contact Two');
        $id3 = $this->createCard('Contact Three');

        $response = $this->post(route('contacts.bulk-destroy', $this->addressbookId), [
            'ids' => [$id1, $id2],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseMissing('cards', ['id' => $id1]);
        $this->assertDatabaseMissing('cards', ['id' => $id2]);
        $this->assertDatabaseHas('cards', ['id' => $id3]);
    }

    public function test_bulk_destroy_validates_ids(): void
    {
        $response = $this->post(route('contacts.bulk-destroy', $this->addressbookId), [
            'ids' => [],
        ]);

        $response->assertSessionHasErrors('ids');
    }

    public function test_update_preserves_unknown_vcard_properties(): void
    {
        $uid = Str::uuid()->toString();
        $rawVcard = implode("\r\n", [
            'BEGIN:VCARD',
            'VERSION:3.0',
            'UID:'.$uid,
            'FN:Original Name',
            'N:Name;Original;;;',
            'EMAIL;TYPE=INTERNET:original@example.com',
            'X-CUSTOM:CustomValue',
            'X-SPOUSE:Jane',
            'REV:2024-01-01T00:00:00Z',
            'END:VCARD',
        ]);

        $uri = $uid.'.vcf';
        $cardId = DB::table('cards')->insertGetId([
            'addressbookid' => $this->addressbookId,
            'uri' => $uri,
            'carddata' => $rawVcard,
            'lastmodified' => time(),
            'etag' => md5($rawVcard),
            'size' => strlen($rawVcard),
        ]);

        $response = $this->put(route('contacts.update', [$this->addressbookId, $cardId]), [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);

        $response->assertRedirect();

        $card = DB::table('cards')->where('id', $cardId)->first();
        $this->assertStringContainsString('Updated Name', $card->carddata);
        $this->assertStringContainsString('updated@example.com', $card->carddata);
        $this->assertStringContainsString('X-CUSTOM:CustomValue', $card->carddata);
        $this->assertStringContainsString('X-SPOUSE:Jane', $card->carddata);
        $this->assertStringNotContainsString('original@example.com', $card->carddata);
    }

    public function test_store_creates_contact_with_nickname_birthday_anniversary(): void
    {
        $response = $this->post(route('contacts.store', $this->addressbookId), [
            'name' => 'Jane Smith',
            'email' => 'jane@example.com',
            'nickname' => 'Janey',
            'birthday' => '1990-06-15',
            'anniversary' => '2015-09-20',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseCount('cards', 1);

        $card = DB::table('cards')->where('addressbookid', $this->addressbookId)->first();
        $this->assertStringContainsString('NICKNAME:Janey', $card->carddata);
        $this->assertStringContainsString('BDAY:1990-06-15', $card->carddata);
        $this->assertStringContainsString('ANNIVERSARY:2015-09-20', $card->carddata);
    }

    public function test_update_preserves_and_modifies_new_fields(): void
    {
        $uid = Str::uuid()->toString();
        $rawVcard = implode("\r\n", [
            'BEGIN:VCARD',
            'VERSION:3.0',
            'UID:'.$uid,
            'FN:Test Person',
            'N:Person;Test;;;',
            'BDAY:1990-05-15',
            'REV:2024-01-01T00:00:00Z',
            'END:VCARD',
        ]);

        $uri = $uid.'.vcf';
        $cardId = DB::table('cards')->insertGetId([
            'addressbookid' => $this->addressbookId,
            'uri' => $uri,
            'carddata' => $rawVcard,
            'lastmodified' => time(),
            'etag' => md5($rawVcard),
            'size' => strlen($rawVcard),
        ]);

        $response = $this->put(route('contacts.update', [$this->addressbookId, $cardId]), [
            'name' => 'Test Person',
            'nickname' => 'Testy',
            'birthday' => '1990-05-15',
            'anniversary' => '2020-12-25',
        ]);

        $response->assertRedirect();

        $card = DB::table('cards')->where('id', $cardId)->first();
        $this->assertStringContainsString('NICKNAME:Testy', $card->carddata);
        $this->assertStringContainsString('BDAY:1990-05-15', $card->carddata);
        $this->assertStringContainsString('ANNIVERSARY:2020-12-25', $card->carddata);
    }

    public function test_store_creates_contact_with_categories_and_role(): void
    {
        $response = $this->post(route('contacts.store', $this->addressbookId), [
            'name' => 'Tagged Contact',
            'categories' => 'Friends,VIP',
            'role' => 'Project Lead',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseCount('cards', 1);

        $card = DB::table('cards')->where('addressbookid', $this->addressbookId)->first();
        $this->assertStringContainsString('CATEGORIES:Friends,VIP', $card->carddata);
        $this->assertStringContainsString('ROLE:Project Lead', $card->carddata);
    }

    public function test_update_manages_categories_and_role(): void
    {
        $uid = Str::uuid()->toString();
        $rawVcard = implode("\r\n", [
            'BEGIN:VCARD',
            'VERSION:3.0',
            'UID:'.$uid,
            'FN:Cat Person',
            'N:Person;Cat;;;',
            'CATEGORIES:Old,Tags',
            'ROLE:Old Role',
            'REV:2024-01-01T00:00:00Z',
            'END:VCARD',
        ]);

        $uri = $uid.'.vcf';
        $cardId = DB::table('cards')->insertGetId([
            'addressbookid' => $this->addressbookId,
            'uri' => $uri,
            'carddata' => $rawVcard,
            'lastmodified' => time(),
            'etag' => md5($rawVcard),
            'size' => strlen($rawVcard),
        ]);

        $response = $this->put(route('contacts.update', [$this->addressbookId, $cardId]), [
            'name' => 'Cat Person',
            'categories' => 'New,Tags,Updated',
            'role' => 'New Role',
        ]);

        $response->assertRedirect();

        $card = DB::table('cards')->where('id', $cardId)->first();
        $this->assertStringContainsString('CATEGORIES:New,Tags,Updated', $card->carddata);
        $this->assertStringContainsString('ROLE:New Role', $card->carddata);
        $this->assertStringNotContainsString('Old,Tags', $card->carddata);
        $this->assertStringNotContainsString('Old Role', $card->carddata);
    }

    private function createCard(string $name, ?string $email = null): int
    {
        $uid = Str::uuid()->toString();
        $vcard = new VCard([
            'VERSION' => '3.0',
            'UID' => $uid,
            'FN' => $name,
        ]);

        if ($email) {
            $vcard->add('EMAIL', $email, ['type' => 'INTERNET']);
        }

        $uri = $uid.'.vcf';
        $carddata = $vcard->serialize();

        return DB::table('cards')->insertGetId([
            'addressbookid' => $this->addressbookId,
            'uri' => $uri,
            'carddata' => $carddata,
            'lastmodified' => time(),
            'etag' => md5($carddata),
            'size' => strlen($carddata),
        ]);
    }
}
