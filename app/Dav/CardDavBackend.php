<?php

namespace App\Dav;

use Sabre\CardDAV\Backend\PDO;

class CardDavBackend extends PDO
{
    public function __construct(\PDO $pdo)
    {
        parent::__construct($pdo);

        $this->addressBooksTableName = 'addressbooks';
        $this->cardsTableName = 'cards';
        $this->addressBookChangesTableName = 'addressbookchanges';
    }
}
