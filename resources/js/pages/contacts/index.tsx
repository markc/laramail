import { Head, Link, router, usePage } from '@inertiajs/react';
import type { RowSelectionState } from '@tanstack/react-table';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { createColumns, type Contact } from './columns';
import ContactFormModal from './contact-form-modal';

type Props = {
    addressBook: { id: number; displayname: string | null };
    contacts: Contact[];
};

export default function ContactsPage() {
    const { addressBook, contacts } = usePage<{ props: Props }>().props as unknown as Props;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const columns = useMemo(
        () =>
            createColumns({
                addressBookId: addressBook.id,
                onEdit: (contact) => {
                    setEditingContact(contact);
                    setModalOpen(true);
                },
                onDelete: (contact) => {
                    if (confirm(`Delete contact "${contact.name}"?`)) {
                        router.delete(`/addressbooks/${addressBook.id}/contacts/${contact.id}`, { preserveScroll: true });
                    }
                },
            }),
        [addressBook.id],
    );

    const selectedCount = Object.keys(rowSelection).length;

    function handleBulkDelete() {
        if (selectedCount === 0) return;
        if (!confirm(`Delete ${selectedCount} selected contact${selectedCount > 1 ? 's' : ''}?`)) return;

        const ids = Object.keys(rowSelection).map((idx) => contacts[parseInt(idx)].id);
        router.post(`/addressbooks/${addressBook.id}/contacts/bulk-delete`, { ids }, {
            preserveScroll: true,
            onSuccess: () => setRowSelection({}),
        });
    }

    function closeModal() {
        setModalOpen(false);
        setEditingContact(null);
    }

    return (
        <>
            <Head title={`${addressBook.displayname ?? 'Contacts'}`} />
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href="/addressbooks">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{addressBook.displayname ?? 'Contacts'}</h1>
                        <p className="text-sm text-muted-foreground">{contacts.length} contacts</p>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={contacts}
                    searchKey="name"
                    searchPlaceholder="Search contacts..."
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    initialColumnVisibility={{
                        title: false,
                        nickname: false,
                        birthday: false,
                        anniversary: false,
                        categories: false,
                        role: false,
                        lastmodified: false,
                    }}
                    initialSorting={[{ id: 'lastmodified', desc: true }]}
                    actionSlot={
                        <div className="flex gap-2">
                            <BulkDeleteButton selectedCount={selectedCount} onBulkDelete={handleBulkDelete} />
                            <Button
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                    setEditingContact(null);
                                    setModalOpen(true);
                                }}
                            >
                                <Plus className="size-4" />
                                Add Contact
                            </Button>
                        </div>
                    }
                />
            </div>
            <ContactFormModal
                open={modalOpen}
                onClose={closeModal}
                contact={editingContact}
                addressBookId={addressBook.id}
            />
        </>
    );
}

function BulkDeleteButton({ selectedCount, onBulkDelete }: { selectedCount: number; onBulkDelete: () => void }) {
    if (selectedCount === 0) return null;

    return (
        <Button size="sm" variant="destructive" className="h-8" onClick={onBulkDelete}>
            <Trash2 className="size-4" />
            Delete {selectedCount}
        </Button>
    );
}
