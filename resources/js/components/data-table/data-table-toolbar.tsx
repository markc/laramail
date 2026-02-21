import type { Table, VisibilityState } from '@tanstack/react-table';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DebouncedInput } from './debounced-input';

interface DataTableToolbarProps<TData> {
    table: Table<TData>;
    searchable?: boolean;
    searchPlaceholder?: string;
    actionSlot?: ReactNode;
    columnVisibility: VisibilityState;
    onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>;
}

export function DataTableToolbar<TData>({
    table,
    searchable,
    searchPlaceholder,
    actionSlot,
    columnVisibility,
    onColumnVisibilityChange,
}: DataTableToolbarProps<TData>) {
    const globalFilter = table.getState().globalFilter ?? '';
    const isFiltered = globalFilter !== '';

    const toggleableColumns = table
        .getAllLeafColumns()
        .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide());

    return (
        <div className="flex items-center justify-between pb-4">
            <div className="flex flex-1 items-center gap-2">
                {searchable && (
                    <DebouncedInput
                        placeholder={searchPlaceholder ?? 'Search...'}
                        value={globalFilter}
                        onChange={(value) => table.setGlobalFilter(value)}
                        className="h-8 w-[250px]"
                        debounce={200}
                    />
                )}
                {isFiltered && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.resetGlobalFilter()}
                        className="h-8 px-2 lg:px-3"
                    >
                        Reset
                        <X className="ml-2 size-4" />
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-2">
                {toggleableColumns.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <Settings2 className="size-4" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {toggleableColumns.map((column) => (
                                <label
                                    key={column.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm capitalize hover:bg-accent"
                                >
                                    <input
                                        type="checkbox"
                                        checked={columnVisibility[column.id] !== false}
                                        onChange={() =>
                                            onColumnVisibilityChange((prev) => ({
                                                ...prev,
                                                [column.id]: prev[column.id] === false,
                                            }))
                                        }
                                    />
                                    {column.id}
                                </label>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {actionSlot}
            </div>
        </div>
    );
}
