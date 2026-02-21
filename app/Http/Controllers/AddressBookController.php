<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AddressBookController extends Controller
{
    public function index()
    {
        $addressBooks = DB::table('addressbooks')
            ->leftJoin(DB::raw('(SELECT addressbookid, COUNT(*) as contact_count FROM cards GROUP BY addressbookid) as counts'), 'addressbooks.id', '=', 'counts.addressbookid')
            ->select([
                'addressbooks.id',
                'addressbooks.principaluri',
                'addressbooks.uri',
                'addressbooks.displayname',
                'addressbooks.description',
                DB::raw('COALESCE(counts.contact_count, 0) as contact_count'),
            ])
            ->orderBy('addressbooks.principaluri')
            ->get();

        return Inertia::render('addressbooks/index', [
            'addressBooks' => $addressBooks,
        ]);
    }
}
