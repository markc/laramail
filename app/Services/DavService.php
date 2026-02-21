<?php

namespace App\Services;

use App\Dav\AuthBackend;
use App\Dav\CalendarBackend;
use App\Dav\CardDavBackend;
use App\Dav\PrincipalBackend;
use Illuminate\Support\Facades\DB;
use Sabre\CalDAV\CalendarRoot;
use Sabre\CalDAV\Plugin as CalDAVPlugin;
use Sabre\CalDAV\Schedule\Plugin as SchedulePlugin;
use Sabre\CardDAV\AddressBookRoot;
use Sabre\CardDAV\Plugin as CardDAVPlugin;
use Sabre\DAV\Auth\Plugin as AuthPlugin;
use Sabre\DAV\Browser\Plugin as BrowserPlugin;
use Sabre\DAV\Locks\Backend\PDO as LocksPDO;
use Sabre\DAV\Locks\Plugin as LocksPlugin;
use Sabre\DAV\PropertyStorage\Backend\PDO as PropertyPDO;
use Sabre\DAV\PropertyStorage\Plugin as PropertyPlugin;
use Sabre\DAV\Server;
use Sabre\DAV\Sync\Plugin as SyncPlugin;
use Sabre\DAVACL\Plugin as ACLPlugin;
use Sabre\DAVACL\PrincipalCollection;

class DavService
{
    public function createServer(): Server
    {
        $pdo = DB::connection()->getPdo();

        $principalBackend = new PrincipalBackend($pdo);
        $calendarBackend = new CalendarBackend($pdo);
        $cardDavBackend = new CardDavBackend($pdo);

        $tree = [
            new PrincipalCollection($principalBackend),
            new CalendarRoot($principalBackend, $calendarBackend),
            new AddressBookRoot($principalBackend, $cardDavBackend),
        ];

        $server = new Server($tree);
        $server->setBaseUri('/dav/');

        // Auth
        $authBackend = new AuthBackend();
        $server->addPlugin(new AuthPlugin($authBackend));

        // ACL
        $aclPlugin = new ACLPlugin();
        $aclPlugin->adminPrincipals = [];
        $server->addPlugin($aclPlugin);

        // CalDAV
        $server->addPlugin(new CalDAVPlugin());
        $server->addPlugin(new SchedulePlugin());

        // CardDAV
        $server->addPlugin(new CardDAVPlugin());

        // Sync (for efficient client syncing)
        $server->addPlugin(new SyncPlugin());

        // Locks
        $locksBackend = new LocksPDO($pdo);
        $server->addPlugin(new LocksPlugin($locksBackend));

        // Property storage
        $propertyBackend = new PropertyPDO($pdo);
        $server->addPlugin(new PropertyPlugin($propertyBackend));

        // Browser (HTML interface for debugging)
        $server->addPlugin(new BrowserPlugin());

        return $server;
    }
}
