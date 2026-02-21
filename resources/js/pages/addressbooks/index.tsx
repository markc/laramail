import { Head, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { createColumns, type AddressBook } from './columns';

type Props = {
    addressBooks: AddressBook[];
};

export default function AddressBooksPage() {
    const { addressBooks } = usePage<{ props: Props }>().props as unknown as Props;
    const columns = useMemo(() => createColumns(), []);

    return (
        <>
            <Head title="Address Books" />
            <div className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">Address Books</h1>
                <p className="text-sm text-muted-foreground">
                    CardDAV address books managed via Thunderbird, iOS, or DAVx5. Connect to <code className="rounded bg-muted px-1">/dav/</code> to manage.
                </p>
                <DataTable
                    columns={columns}
                    data={addressBooks}
                    searchKey="displayname"
                    searchPlaceholder="Search address books..."
                />
            </div>
        </>
    );
}
