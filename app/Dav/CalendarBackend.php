<?php

namespace App\Dav;

use Sabre\CalDAV\Backend\PDO;

class CalendarBackend extends PDO
{
    public function __construct(\PDO $pdo)
    {
        parent::__construct($pdo);

        $this->calendarTableName = 'calendars';
        $this->calendarInstancesTableName = 'calendarinstances';
        $this->calendarObjectTableName = 'calendarobjects';
        $this->calendarChangesTableName = 'calendarchanges';
        $this->schedulingObjectTableName = 'schedulingobjects';
        $this->calendarSubscriptionsTableName = 'calendarsubscriptions';
    }
}
