<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Sabre\VObject\Component\VCalendar;
use Tests\TestCase;

class EventControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private int $calendarId;

    private int $instanceId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);

        $this->calendarId = DB::table('calendars')->insertGetId([
            'synctoken' => 1,
            'components' => 'VEVENT',
        ]);

        $this->instanceId = DB::table('calendarinstances')->insertGetId([
            'calendarid' => $this->calendarId,
            'principaluri' => 'principals/'.$this->user->email,
            'uri' => 'default',
            'displayname' => 'Test Calendar',
            'access' => 1,
            'transparent' => 0,
            'calendarorder' => 0,
        ]);
    }

    public function test_guests_cannot_access_events(): void
    {
        auth()->logout();

        $this->get(route('events.index', $this->instanceId))
            ->assertRedirect(route('login'));
    }

    public function test_index_returns_events(): void
    {
        $this->createEvent('Team Meeting', '2025-06-15T10:00', '2025-06-15T11:00');

        $response = $this->get(route('events.index', $this->instanceId));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('events/index')
            ->has('events', 1)
            ->where('events.0.summary', 'Team Meeting')
        );
    }

    public function test_store_creates_event(): void
    {
        $response = $this->post(route('events.store', $this->instanceId), [
            'summary' => 'New Event',
            'dtstart' => '2025-07-01T09:00',
            'dtend' => '2025-07-01T10:00',
            'location' => 'Conference Room A',
            'description' => 'Discuss project updates',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseCount('calendarobjects', 1);

        $obj = DB::table('calendarobjects')->where('calendarid', $this->calendarId)->first();
        $this->assertStringContainsString('New Event', $obj->calendardata);
        $this->assertStringContainsString('Conference Room A', $obj->calendardata);
        $this->assertStringContainsString('Discuss project updates', $obj->calendardata);
    }

    public function test_store_validates_required_summary(): void
    {
        $response = $this->post(route('events.store', $this->instanceId), [
            'summary' => '',
            'dtstart' => '2025-07-01T09:00',
        ]);

        $response->assertSessionHasErrors('summary');
    }

    public function test_store_validates_required_dtstart(): void
    {
        $response = $this->post(route('events.store', $this->instanceId), [
            'summary' => 'Missing Start',
            'dtstart' => '',
        ]);

        $response->assertSessionHasErrors('dtstart');
    }

    public function test_store_validates_dtend_after_dtstart(): void
    {
        $response = $this->post(route('events.store', $this->instanceId), [
            'summary' => 'Bad Dates',
            'dtstart' => '2025-07-01T10:00',
            'dtend' => '2025-07-01T08:00',
        ]);

        $response->assertSessionHasErrors('dtend');
    }

    public function test_store_allows_minimal_event(): void
    {
        $response = $this->post(route('events.store', $this->instanceId), [
            'summary' => 'Quick Event',
            'dtstart' => '2025-07-01T09:00',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseCount('calendarobjects', 1);
    }

    public function test_update_modifies_event(): void
    {
        $eventId = $this->createEvent('Old Title', '2025-06-15T10:00', '2025-06-15T11:00');

        $response = $this->put(route('events.update', [$this->instanceId, $eventId]), [
            'summary' => 'New Title',
            'dtstart' => '2025-06-15T14:00',
            'dtend' => '2025-06-15T15:00',
            'location' => 'Updated Location',
            'description' => '',
        ]);

        $response->assertRedirect();

        $obj = DB::table('calendarobjects')->where('id', $eventId)->first();
        $this->assertStringContainsString('New Title', $obj->calendardata);
        $this->assertStringContainsString('Updated Location', $obj->calendardata);
        $this->assertStringNotContainsString('Old Title', $obj->calendardata);
    }

    public function test_destroy_deletes_event(): void
    {
        $eventId = $this->createEvent('Delete Me', '2025-06-15T10:00');

        $response = $this->delete(route('events.destroy', [$this->instanceId, $eventId]));

        $response->assertRedirect();
        $this->assertDatabaseMissing('calendarobjects', ['id' => $eventId]);
    }

    public function test_bulk_destroy_deletes_multiple_events(): void
    {
        $id1 = $this->createEvent('Event One', '2025-06-15T10:00');
        $id2 = $this->createEvent('Event Two', '2025-06-16T10:00');
        $id3 = $this->createEvent('Event Three', '2025-06-17T10:00');

        $response = $this->post(route('events.bulk-destroy', $this->instanceId), [
            'ids' => [$id1, $id2],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseMissing('calendarobjects', ['id' => $id1]);
        $this->assertDatabaseMissing('calendarobjects', ['id' => $id2]);
        $this->assertDatabaseHas('calendarobjects', ['id' => $id3]);
    }

    public function test_bulk_destroy_validates_ids(): void
    {
        $response = $this->post(route('events.bulk-destroy', $this->instanceId), [
            'ids' => [],
        ]);

        $response->assertSessionHasErrors('ids');
    }

    public function test_update_preserves_unknown_vevent_properties(): void
    {
        $uid = Str::uuid()->toString();
        $raw = implode("\r\n", [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Test//Test//EN',
            'BEGIN:VEVENT',
            'UID:'.$uid,
            'SUMMARY:Original Event',
            'DTSTART:20250615T100000Z',
            'DTEND:20250615T110000Z',
            'X-CUSTOM-PROP:CustomValue',
            'ATTENDEE;CN=John:mailto:john@example.com',
            'END:VEVENT',
            'END:VCALENDAR',
        ]);

        $uri = $uid.'.ics';
        $eventId = DB::table('calendarobjects')->insertGetId([
            'calendarid' => $this->calendarId,
            'uri' => $uri,
            'calendardata' => $raw,
            'lastmodified' => time(),
            'etag' => md5($raw),
            'size' => strlen($raw),
            'componenttype' => 'VEVENT',
            'firstoccurence' => strtotime('2025-06-15T10:00:00Z'),
            'lastoccurence' => strtotime('2025-06-15T11:00:00Z'),
            'uid' => $uid,
        ]);

        $response = $this->put(route('events.update', [$this->instanceId, $eventId]), [
            'summary' => 'Updated Event',
            'dtstart' => '2025-06-15T14:00',
            'dtend' => '2025-06-15T15:00',
        ]);

        $response->assertRedirect();

        $obj = DB::table('calendarobjects')->where('id', $eventId)->first();
        $this->assertStringContainsString('Updated Event', $obj->calendardata);
        $this->assertStringContainsString('X-CUSTOM-PROP:CustomValue', $obj->calendardata);
        $this->assertStringContainsString('ATTENDEE', $obj->calendardata);
        $this->assertStringNotContainsString('Original Event', $obj->calendardata);
    }

    private function createEvent(string $summary, string $dtstart, ?string $dtend = null): int
    {
        $uid = Str::uuid()->toString();
        $vcal = new VCalendar;

        $props = [
            'UID' => $uid,
            'SUMMARY' => $summary,
            'DTSTART' => new \DateTime($dtstart),
            'DTSTAMP' => new \DateTime('now', new \DateTimeZone('UTC')),
        ];

        if ($dtend) {
            $props['DTEND'] = new \DateTime($dtend);
        }

        $vcal->add('VEVENT', $props);

        $uri = $uid.'.ics';
        $calendardata = $vcal->serialize();

        return DB::table('calendarobjects')->insertGetId([
            'calendarid' => $this->calendarId,
            'uri' => $uri,
            'calendardata' => $calendardata,
            'lastmodified' => time(),
            'etag' => md5($calendardata),
            'size' => strlen($calendardata),
            'componenttype' => 'VEVENT',
            'firstoccurence' => strtotime($dtstart),
            'lastoccurence' => $dtend ? strtotime($dtend) : strtotime($dtstart),
            'uid' => $uid,
        ]);
    }
}
