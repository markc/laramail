<?php

namespace App\Http\Controllers;

use App\Dav\CardDavBackend;
use App\Http\Requests\StoreContactRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Sabre\VObject\Component\VCard;
use Sabre\VObject\Reader;

class ContactController extends Controller
{
    public function index(int $addressbook)
    {
        $book = DB::table('addressbooks')->where('id', $addressbook)->firstOrFail();

        $cards = DB::table('cards')
            ->where('addressbookid', $addressbook)
            ->select(['id', 'uri', 'carddata', 'lastmodified'])
            ->get()
            ->map(function ($card) {
                try {
                    $vcard = Reader::read($card->carddata);

                    return [
                        'id' => $card->id,
                        'uri' => $card->uri,
                        'name' => (string) ($vcard->FN ?? ''),
                        'email' => isset($vcard->EMAIL) ? (string) $vcard->EMAIL : null,
                        'phone' => isset($vcard->TEL) ? (string) $vcard->TEL : null,
                        'org' => isset($vcard->ORG) ? (string) $vcard->ORG : null,
                        'title' => isset($vcard->TITLE) ? (string) $vcard->TITLE : null,
                        'url' => isset($vcard->URL) ? (string) $vcard->URL : null,
                        'note' => isset($vcard->NOTE) ? (string) $vcard->NOTE : null,
                        'nickname' => isset($vcard->NICKNAME) ? (string) $vcard->NICKNAME : null,
                        'birthday' => isset($vcard->BDAY) ? (string) $vcard->BDAY : null,
                        'anniversary' => isset($vcard->ANNIVERSARY) ? (string) $vcard->ANNIVERSARY : null,
                        'categories' => isset($vcard->CATEGORIES) ? (string) $vcard->CATEGORIES : null,
                        'role' => isset($vcard->ROLE) ? (string) $vcard->ROLE : null,
                        'address' => isset($vcard->ADR) ? trim(str_replace(';', ' ', (string) $vcard->ADR)) : null,
                        'lastmodified' => $card->lastmodified,
                    ];
                } catch (\Throwable) {
                    return null;
                }
            })
            ->filter()
            ->values();

        return Inertia::render('contacts/index', [
            'addressBook' => [
                'id' => $book->id,
                'displayname' => $book->displayname,
            ],
            'contacts' => $cards,
        ]);
    }

    public function store(StoreContactRequest $request, int $addressbook)
    {
        $validated = $request->validated();

        $uid = Str::uuid()->toString();
        $vcard = $this->buildVCard($uid, $validated);
        $uri = $uid.'.vcf';

        $backend = $this->backend();
        $backend->createCard($addressbook, $uri, $vcard->serialize());

        return redirect()->back();
    }

    public function update(StoreContactRequest $request, int $addressbook, int $contact)
    {
        $validated = $request->validated();

        $card = DB::table('cards')->where('id', $contact)->where('addressbookid', $addressbook)->firstOrFail();

        $vcard = Reader::read($card->carddata);
        $this->patchVCard($vcard, $validated);

        $backend = $this->backend();
        $backend->updateCard($addressbook, $card->uri, $vcard->serialize());

        return redirect()->back();
    }

    public function destroy(int $addressbook, int $contact)
    {
        $card = DB::table('cards')->where('id', $contact)->where('addressbookid', $addressbook)->firstOrFail();

        $backend = $this->backend();
        $backend->deleteCard($addressbook, $card->uri);

        return redirect()->back();
    }

    public function bulkDestroy(Request $request, int $addressbook)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $backend = $this->backend();

        $cards = DB::table('cards')
            ->where('addressbookid', $addressbook)
            ->whereIn('id', $validated['ids'])
            ->get(['id', 'uri']);

        foreach ($cards as $card) {
            $backend->deleteCard($addressbook, $card->uri);
        }

        return redirect()->back();
    }

    private function patchVCard(VCard $vcard, array $data): void
    {
        $managed = ['FN', 'N', 'EMAIL', 'TEL', 'ORG', 'TITLE', 'NICKNAME', 'BDAY', 'ANNIVERSARY', 'CATEGORIES', 'ROLE', 'URL', 'NOTE', 'ADR'];

        foreach ($managed as $prop) {
            unset($vcard->{$prop});
        }

        $vcard->FN = $data['name'];
        $vcard->REV = gmdate('Y-m-d\TH:i:s\Z');

        $parts = explode(' ', $data['name'], 2);
        $vcard->add('N', [
            $parts[1] ?? '',  // last
            $parts[0],        // first
            '', '', '',
        ]);

        if (! empty($data['email'])) {
            $vcard->add('EMAIL', $data['email'], ['type' => 'INTERNET']);
        }

        if (! empty($data['phone'])) {
            $vcard->add('TEL', $data['phone'], ['type' => 'CELL']);
        }

        if (! empty($data['org'])) {
            $vcard->add('ORG', $data['org']);
        }

        if (! empty($data['title'])) {
            $vcard->add('TITLE', $data['title']);
        }

        if (! empty($data['nickname'])) {
            $vcard->add('NICKNAME', $data['nickname']);
        }

        if (! empty($data['birthday'])) {
            $vcard->add('BDAY', $data['birthday']);
        }

        if (! empty($data['anniversary'])) {
            $vcard->add('ANNIVERSARY', $data['anniversary']);
        }

        if (! empty($data['categories'])) {
            $vcard->add('CATEGORIES', array_map('trim', explode(',', $data['categories'])));
        }

        if (! empty($data['role'])) {
            $vcard->add('ROLE', $data['role']);
        }

        if (! empty($data['url'])) {
            $vcard->add('URL', $data['url']);
        }

        if (! empty($data['note'])) {
            $vcard->add('NOTE', $data['note']);
        }

        if (! empty($data['address'])) {
            $vcard->add('ADR', ['', '', $data['address'], '', '', '', '']);
        }
    }

    private function buildVCard(string $uid, array $data): VCard
    {
        $vcard = new VCard([
            'VERSION' => '3.0',
            'UID' => $uid,
            'FN' => $data['name'],
            'REV' => gmdate('Y-m-d\TH:i:s\Z'),
        ]);

        // Parse name into structured N field
        $parts = explode(' ', $data['name'], 2);
        $vcard->add('N', [
            $parts[1] ?? '',  // last
            $parts[0],        // first
            '', '', '',
        ]);

        if (! empty($data['email'])) {
            $vcard->add('EMAIL', $data['email'], ['type' => 'INTERNET']);
        }

        if (! empty($data['phone'])) {
            $vcard->add('TEL', $data['phone'], ['type' => 'CELL']);
        }

        if (! empty($data['org'])) {
            $vcard->add('ORG', $data['org']);
        }

        if (! empty($data['title'])) {
            $vcard->add('TITLE', $data['title']);
        }

        if (! empty($data['nickname'])) {
            $vcard->add('NICKNAME', $data['nickname']);
        }

        if (! empty($data['birthday'])) {
            $vcard->add('BDAY', $data['birthday']);
        }

        if (! empty($data['anniversary'])) {
            $vcard->add('ANNIVERSARY', $data['anniversary']);
        }

        if (! empty($data['categories'])) {
            $vcard->add('CATEGORIES', array_map('trim', explode(',', $data['categories'])));
        }

        if (! empty($data['role'])) {
            $vcard->add('ROLE', $data['role']);
        }

        if (! empty($data['url'])) {
            $vcard->add('URL', $data['url']);
        }

        if (! empty($data['note'])) {
            $vcard->add('NOTE', $data['note']);
        }

        if (! empty($data['address'])) {
            // ADR format: PO Box;Extended;Street;City;State;Postal;Country
            // Store the full address as the street component
            $vcard->add('ADR', ['', '', $data['address'], '', '', '', '']);
        }

        return $vcard;
    }

    private function backend(): CardDavBackend
    {
        return new CardDavBackend(DB::connection()->getPdo());
    }
}
