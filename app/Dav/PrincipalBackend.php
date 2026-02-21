<?php

namespace App\Dav;

use Sabre\DAVACL\PrincipalBackend\PDO;

class PrincipalBackend extends PDO
{
    public function __construct(\PDO $pdo)
    {
        parent::__construct($pdo);

        $this->tableName = 'principals';
        $this->groupMembersTableName = 'groupmembers';
    }
}
