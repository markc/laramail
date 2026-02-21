<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CalendarController extends Controller
{
    public function index()
    {
        $calendars = DB::table('calendarinstances')
            ->join('calendars', 'calendarinstances.calendarid', '=', 'calendars.id')
            ->leftJoin(DB::raw('(SELECT calendarid, COUNT(*) as event_count FROM calendarobjects GROUP BY calendarid) as counts'), 'calendars.id', '=', 'counts.calendarid')
            ->select([
                'calendarinstances.id',
                'calendarinstances.principaluri',
                'calendarinstances.uri',
                'calendarinstances.displayname',
                'calendarinstances.description',
                'calendarinstances.calendarcolor',
                'calendarinstances.calendarorder',
                'calendars.components',
                DB::raw('COALESCE(counts.event_count, 0) as event_count'),
            ])
            ->orderBy('calendarinstances.principaluri')
            ->orderBy('calendarinstances.calendarorder')
            ->get();

        return Inertia::render('calendars/index', [
            'calendars' => $calendars,
        ]);
    }
}
