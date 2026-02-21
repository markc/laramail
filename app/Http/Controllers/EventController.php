<?php

namespace App\Http\Controllers;

use App\Dav\CalendarBackend;
use App\Http\Requests\StoreEventRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Reader;

class EventController extends Controller
{
    public function index(int $calendar)
    {
        $instance = DB::table('calendarinstances')->where('id', $calendar)->firstOrFail();

        $events = DB::table('calendarobjects')
            ->where('calendarid', $instance->calendarid)
            ->select(['id', 'uri', 'calendardata', 'lastmodified'])
            ->get()
            ->map(function ($obj) {
                try {
                    $vcal = Reader::read($obj->calendardata);
                    $vevent = $vcal->VEVENT;

                    if (! $vevent) {
                        return null;
                    }

                    return [
                        'id' => $obj->id,
                        'uri' => $obj->uri,
                        'summary' => (string) ($vevent->SUMMARY ?? ''),
                        'dtstart' => isset($vevent->DTSTART) ? $vevent->DTSTART->getDateTime()->format('Y-m-d\TH:i') : null,
                        'dtend' => isset($vevent->DTEND) ? $vevent->DTEND->getDateTime()->format('Y-m-d\TH:i') : null,
                        'location' => isset($vevent->LOCATION) ? (string) $vevent->LOCATION : null,
                        'description' => isset($vevent->DESCRIPTION) ? (string) $vevent->DESCRIPTION : null,
                        'lastmodified' => $obj->lastmodified,
                    ];
                } catch (\Throwable) {
                    return null;
                }
            })
            ->filter()
            ->values();

        return Inertia::render('events/index', [
            'calendar' => [
                'id' => $instance->id,
                'displayname' => $instance->displayname,
                'calendarid' => $instance->calendarid,
            ],
            'events' => $events,
        ]);
    }

    public function store(StoreEventRequest $request, int $calendar)
    {
        $validated = $request->validated();
        $instance = DB::table('calendarinstances')->where('id', $calendar)->firstOrFail();

        $uid = Str::uuid()->toString();
        $vcal = $this->buildVEvent($uid, $validated);
        $uri = $uid.'.ics';

        $backend = $this->backend();
        $backend->createCalendarObject([$instance->calendarid, $instance->id], $uri, $vcal->serialize());

        return redirect()->back();
    }

    public function update(StoreEventRequest $request, int $calendar, int $event)
    {
        $validated = $request->validated();
        $instance = DB::table('calendarinstances')->where('id', $calendar)->firstOrFail();

        $obj = DB::table('calendarobjects')
            ->where('id', $event)
            ->where('calendarid', $instance->calendarid)
            ->firstOrFail();

        $vcal = Reader::read($obj->calendardata);
        $this->patchVEvent($vcal, $validated);

        $backend = $this->backend();
        $backend->updateCalendarObject([$instance->calendarid, $instance->id], $obj->uri, $vcal->serialize());

        return redirect()->back();
    }

    public function destroy(int $calendar, int $event)
    {
        $instance = DB::table('calendarinstances')->where('id', $calendar)->firstOrFail();

        $obj = DB::table('calendarobjects')
            ->where('id', $event)
            ->where('calendarid', $instance->calendarid)
            ->firstOrFail();

        $backend = $this->backend();
        $backend->deleteCalendarObject([$instance->calendarid, $instance->id], $obj->uri);

        return redirect()->back();
    }

    public function bulkDestroy(Request $request, int $calendar)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $instance = DB::table('calendarinstances')->where('id', $calendar)->firstOrFail();
        $backend = $this->backend();

        $objects = DB::table('calendarobjects')
            ->where('calendarid', $instance->calendarid)
            ->whereIn('id', $validated['ids'])
            ->get(['id', 'uri']);

        foreach ($objects as $obj) {
            $backend->deleteCalendarObject([$instance->calendarid, $instance->id], $obj->uri);
        }

        return redirect()->back();
    }

    private function patchVEvent(VCalendar $vcal, array $data): void
    {
        $vevent = $vcal->VEVENT;

        $managed = ['SUMMARY', 'DTSTART', 'DTEND', 'LOCATION', 'DESCRIPTION', 'LAST-MODIFIED', 'DTSTAMP'];

        foreach ($managed as $prop) {
            unset($vevent->{$prop});
        }

        $vevent->add('SUMMARY', $data['summary']);
        $vevent->add('DTSTART', new \DateTime($data['dtstart']));

        if (! empty($data['dtend'])) {
            $vevent->add('DTEND', new \DateTime($data['dtend']));
        }

        if (! empty($data['location'])) {
            $vevent->add('LOCATION', $data['location']);
        }

        if (! empty($data['description'])) {
            $vevent->add('DESCRIPTION', $data['description']);
        }

        $vevent->add('LAST-MODIFIED', new \DateTime('now', new \DateTimeZone('UTC')));
        $vevent->add('DTSTAMP', new \DateTime('now', new \DateTimeZone('UTC')));
    }

    private function buildVEvent(string $uid, array $data): VCalendar
    {
        $vcal = new VCalendar;

        $props = [
            'UID' => $uid,
            'SUMMARY' => $data['summary'],
            'DTSTART' => new \DateTime($data['dtstart']),
            'DTSTAMP' => new \DateTime('now', new \DateTimeZone('UTC')),
            'CREATED' => new \DateTime('now', new \DateTimeZone('UTC')),
            'LAST-MODIFIED' => new \DateTime('now', new \DateTimeZone('UTC')),
        ];

        if (! empty($data['dtend'])) {
            $props['DTEND'] = new \DateTime($data['dtend']);
        }

        if (! empty($data['location'])) {
            $props['LOCATION'] = $data['location'];
        }

        if (! empty($data['description'])) {
            $props['DESCRIPTION'] = $data['description'];
        }

        $vcal->add('VEVENT', $props);

        return $vcal;
    }

    private function backend(): CalendarBackend
    {
        return new CalendarBackend(DB::connection()->getPdo());
    }
}
