import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Contact } from './columns';

type Props = {
    open: boolean;
    onClose: () => void;
    contact?: Contact | null;
    addressBookId: number;
};

export default function ContactFormModal({ open, onClose, contact, addressBookId }: Props) {
    const isEdit = !!contact;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        org: '',
        title: '',
        nickname: '',
        birthday: '',
        anniversary: '',
        categories: '',
        role: '',
        url: '',
        note: '',
        address: '',
    });

    useEffect(() => {
        if (open) {
            setData({
                name: contact?.name ?? '',
                email: contact?.email ?? '',
                phone: contact?.phone ?? '',
                org: contact?.org ?? '',
                title: contact?.title ?? '',
                nickname: contact?.nickname ?? '',
                birthday: contact?.birthday ?? '',
                anniversary: contact?.anniversary ?? '',
                categories: contact?.categories ?? '',
                role: contact?.role ?? '',
                url: contact?.url ?? '',
                note: contact?.note ?? '',
                address: contact?.address ?? '',
            });
        }
    }, [open, contact]);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const options = {
            onSuccess: () => {
                reset();
                onClose();
            },
            preserveScroll: true,
        };

        if (isEdit) {
            put(`/addressbooks/${addressBookId}/contacts/${contact!.id}`, options);
        } else {
            post(`/addressbooks/${addressBookId}/contacts`, options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update contact details.' : 'Create a new contact.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                autoFocus
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nickname">Nickname</Label>
                            <Input
                                id="nickname"
                                value={data.nickname}
                                onChange={(e) => setData('nickname', e.target.value)}
                            />
                            {errors.nickname && <p className="text-sm text-destructive">{errors.nickname}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                            />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="org">Organization</Label>
                            <Input
                                id="org"
                                value={data.org}
                                onChange={(e) => setData('org', e.target.value)}
                            />
                            {errors.org && <p className="text-sm text-destructive">{errors.org}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title">Job Title</Label>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                            />
                            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="birthday">Birthday</Label>
                            <Input
                                id="birthday"
                                type="date"
                                value={data.birthday}
                                onChange={(e) => setData('birthday', e.target.value)}
                            />
                            {errors.birthday && <p className="text-sm text-destructive">{errors.birthday}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="anniversary">Anniversary</Label>
                            <Input
                                id="anniversary"
                                type="date"
                                value={data.anniversary}
                                onChange={(e) => setData('anniversary', e.target.value)}
                            />
                            {errors.anniversary && <p className="text-sm text-destructive">{errors.anniversary}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Input
                                id="role"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                            />
                            {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="categories">Categories</Label>
                            <Input
                                id="categories"
                                placeholder="e.g. Friends, VIP"
                                value={data.categories}
                                onChange={(e) => setData('categories', e.target.value)}
                            />
                            {errors.categories && <p className="text-sm text-destructive">{errors.categories}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="url">Website</Label>
                        <Input
                            id="url"
                            type="url"
                            placeholder="https://"
                            value={data.url}
                            onChange={(e) => setData('url', e.target.value)}
                        />
                        {errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                        />
                        {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="note">Notes</Label>
                        <Textarea
                            id="note"
                            rows={3}
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                        />
                        {errors.note && <p className="text-sm text-destructive">{errors.note}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {isEdit ? 'Save Changes' : 'Create Contact'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
