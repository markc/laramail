<?php

namespace App\Dav;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Sabre\DAV\Auth\Backend\AbstractBasic;

class AuthBackend extends AbstractBasic
{
    protected function validateUserPass($username, $password)
    {
        if (env('DAV_AUTH_TYPE') === 'imap') {
            return $this->validateImap($username, $password);
        }

        return $this->validateDatabase($username, $password);
    }

    private function validateDatabase(string $username, string $password): bool
    {
        $user = User::where('email', $username)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            return false;
        }

        // Ensure principal exists
        if (! $user->dav_principal_uri) {
            $user->update(['dav_principal_uri' => 'principals/' . $user->email]);
        }

        return true;
    }

    private function validateImap(string $username, string $password): bool
    {
        $host = env('DAV_IMAP_HOST', 'localhost');
        $port = (int) env('DAV_IMAP_PORT', 993);
        $mailbox = "{" . $host . ":" . $port . "/imap/ssl/novalidate-cert}INBOX";

        $connection = @imap_open($mailbox, $username, $password, 0, 1);
        if ($connection) {
            imap_close($connection);
            return true;
        }

        return false;
    }
}
