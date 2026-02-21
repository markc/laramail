import { Head, router, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { createColumns, type SharedFile } from './columns';

type Props = {
    files: SharedFile[];
};

export default function SharedFilesPage() {
    const { files } = usePage<{ props: Props }>().props as unknown as Props;

    const columns = useMemo(
        () =>
            createColumns({
                onDelete: (file) => {
                    if (confirm(`Delete shared file "${file.original_filename}"?`)) {
                        router.delete(`/shared-files/${file.id}`, { preserveScroll: true });
                    }
                },
                onCopyLink: (file) => {
                    navigator.clipboard.writeText(file.share_url);
                },
            }),
        [],
    );

    return (
        <>
            <Head title="Shared Files" />
            <div className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">Shared Files</h1>
                <DataTable
                    columns={columns}
                    data={files}
                    searchKey="original_filename"
                    searchPlaceholder="Search by filename..."
                />
            </div>
        </>
    );
}
