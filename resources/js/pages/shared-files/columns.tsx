import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Button } from '@/components/ui/button';

export type SharedFile = {
    id: number;
    user: { id: number; name: string } | null;
    original_filename: string;
    mime_type: string | null;
    size: number;
    share_token: string;
    share_url: string;
    download_count: number;
    max_downloads: number | null;
    expires_at: string | null;
    expired: boolean;
    created_at: string;
};

export type SharedFileActions = {
    onDelete: (file: SharedFile) => void;
    onCopyLink: (file: SharedFile) => void;
};

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function createColumns(actions: SharedFileActions): ColumnDef<SharedFile>[] {
    return [
        {
            accessorKey: 'id',
            header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
            cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue('id')}</span>,
        },
        {
            accessorKey: 'original_filename',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Filename" />,
            cell: ({ row }) => {
                const file = row.original;
                return (
                    <div>
                        <span className="font-medium">{file.original_filename}</span>
                        {file.expired && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">expired</span>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'user',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
            cell: ({ row }) => row.original.user?.name ?? '—',
            accessorFn: (row) => row.user?.name ?? '',
        },
        {
            accessorKey: 'size',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
            cell: ({ row }) => <span className="text-muted-foreground">{formatBytes(row.getValue('size'))}</span>,
        },
        {
            accessorKey: 'download_count',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Downloads" />,
            cell: ({ row }) => {
                const file = row.original;
                const max = file.max_downloads ? `/${file.max_downloads}` : '';
                return <span className="font-mono text-muted-foreground">{file.download_count}{max}</span>;
            },
        },
        {
            accessorKey: 'expires_at',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Expires" />,
            cell: ({ row }) => {
                const val = row.getValue('expires_at') as string | null;
                if (!val) return <span className="text-muted-foreground/50">never</span>;
                return <span className="text-muted-foreground">{new Date(val).toLocaleDateString()}</span>;
            },
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const file = row.original;
                return (
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => actions.onCopyLink(file)} title="Copy share link">
                            <Copy className="size-4" />
                            <span className="sr-only">Copy Link</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => actions.onDelete(file)}>
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                );
            },
        },
    ];
}
