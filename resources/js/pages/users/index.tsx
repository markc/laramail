import { Head, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/data-table';
import { createColumns, type User } from './columns';
import UserFormModal from './user-form-modal';

type UsersPageProps = {
    users: User[];
};

export default function UsersPage() {
    const { users } = usePage<{ props: UsersPageProps }>().props as unknown as UsersPageProps;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const columns = useMemo(
        () =>
            createColumns({
                onEdit: (user) => {
                    setEditingUser(user);
                    setModalOpen(true);
                },
                onDelete: (user) => {
                    if (confirm(`Delete user "${user.name}"?`)) {
                        router.delete(`/users/${user.id}`, { preserveScroll: true });
                    }
                },
            }),
        [],
    );

    function closeModal() {
        setModalOpen(false);
        setEditingUser(null);
    }

    return (
        <>
            <Head title="Users" />
            <div className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                <DataTable
                    columns={columns}
                    data={users}
                    searchKey="name"
                    searchPlaceholder="Search by name..."
                    actionSlot={
                        <Button
                            size="sm"
                            className="h-8"
                            onClick={() => {
                                setEditingUser(null);
                                setModalOpen(true);
                            }}
                        >
                            <Plus className="size-4" />
                            Add User
                        </Button>
                    }
                />
            </div>
            <UserFormModal open={modalOpen} onClose={closeModal} user={editingUser} />
        </>
    );
}
