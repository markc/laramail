import { Deferred, Head, useForm, usePage, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { MessageSquare, Hash, Coins, Cpu, Pencil, Trash2, Plus, Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import type { SystemPromptTemplate } from '@/types/chat';

type CostByModel = {
    model: string;
    conversation_count: number;
    input_tokens: number;
    output_tokens: number;
    cost: number;
};

type DashboardStats = {
    conversations: number;
    messages: number;
    input_tokens: number;
    output_tokens: number;
    total_cost: number;
    costByModel: CostByModel[];
};

type DashboardProps = {
    stats: DashboardStats;
    providers: Record<string, { name: string; configured: boolean }>;
    settings: { default_model: string; default_system_prompt: string };
    templates: SystemPromptTemplate[];
};

function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
}

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString();
}

const costColumns: ColumnDef<CostByModel, unknown>[] = [
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'conversation_count', header: 'Conversations' },
    {
        accessorKey: 'input_tokens',
        header: 'Input Tokens',
        cell: ({ row }) => formatTokens(row.original.input_tokens),
    },
    {
        accessorKey: 'output_tokens',
        header: 'Output Tokens',
        cell: ({ row }) => formatTokens(row.original.output_tokens),
    },
    {
        accessorKey: 'cost',
        header: 'Cost',
        cell: ({ row }) => formatCost(row.original.cost),
    },
];

const models = [
    { value: 'claude-3-5-haiku-20241022', label: 'Haiku 3.5' },
    { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' },
    { value: 'claude-opus-4-6', label: 'Opus 4.6' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    { value: 'o3-mini', label: 'o3 Mini' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro' },
];

function TemplateManager({ templates: initialTemplates }: { templates: SystemPromptTemplate[] }) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrompt, setNewPrompt] = useState('');

    const startEdit = (t: SystemPromptTemplate) => {
        setEditingId(t.id);
        setEditName(t.name);
        setEditPrompt(t.prompt);
    };

    const saveEdit = () => {
        if (!editingId || !editName.trim() || !editPrompt.trim()) return;
        router.put(`/templates/${editingId}`, { name: editName, prompt: editPrompt }, {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const handleAdd = () => {
        if (!newName.trim() || !newPrompt.trim()) return;
        router.post('/templates', { name: newName, prompt: newPrompt }, {
            preserveScroll: true,
            onSuccess: () => { setShowAdd(false); setNewName(''); setNewPrompt(''); },
        });
    };

    const handleDelete = (id: number) => {
        router.delete(`/templates/${id}`, { preserveScroll: true });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">System Prompt Templates</h2>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                    <Plus className="h-3.5 w-3.5" /> Add
                </button>
            </div>

            {showAdd && (
                <div className="mb-4 rounded-xl border p-4 space-y-2">
                    <input
                        type="text"
                        placeholder="Template name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[var(--scheme-accent)]"
                    />
                    <textarea
                        placeholder="System prompt..."
                        value={newPrompt}
                        onChange={e => setNewPrompt(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none resize-none focus:border-[var(--scheme-accent)]"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="flex items-center gap-1 rounded-lg bg-[var(--scheme-accent)] px-3 py-1.5 text-xs font-medium text-white">
                            <Check className="h-3 w-3" /> Save
                        </button>
                        <button onClick={() => setShowAdd(false)} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                            <X className="h-3 w-3" /> Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {initialTemplates.map(t => (
                    <div key={t.id} className="rounded-xl border p-3">
                        {editingId === t.id ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[var(--scheme-accent)]"
                                />
                                <textarea
                                    value={editPrompt}
                                    onChange={e => setEditPrompt(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none resize-none focus:border-[var(--scheme-accent)]"
                                />
                                <div className="flex gap-2">
                                    <button onClick={saveEdit} className="flex items-center gap-1 rounded-lg bg-[var(--scheme-accent)] px-3 py-1.5 text-xs font-medium text-white">
                                        <Check className="h-3 w-3" /> Save
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                                        <X className="h-3 w-3" /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{t.name}</span>
                                        {t.user_id === null && (
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Built-in</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.prompt}</p>
                                </div>
                                {t.user_id !== null && (
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => startEdit(t)} className="rounded p-1 hover:bg-muted">
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                        <button onClick={() => handleDelete(t.id)} className="rounded p-1 hover:bg-destructive/10">
                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatsContent() {
    const { stats } = usePage<{ props: DashboardProps }>().props as unknown as DashboardProps;

    return (
        <>
            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">Conversations</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.conversations}</p>
                </div>
                <div className="rounded-xl border p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">Messages</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.messages}</p>
                </div>
                <div className="rounded-xl border p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">Tokens</h3>
                    </div>
                    <p className="text-3xl font-bold">{formatTokens(stats.input_tokens + stats.output_tokens)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {formatTokens(stats.input_tokens)} in / {formatTokens(stats.output_tokens)} out
                    </p>
                </div>
                <div className="rounded-xl border p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">Total Cost</h3>
                    </div>
                    <p className="text-3xl font-bold">{formatCost(stats.total_cost)}</p>
                </div>
            </div>

            {/* Cost by Model */}
            {stats.costByModel.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">Cost by Model</h2>
                    <DataTable columns={costColumns} data={stats.costByModel} />
                </div>
            )}
        </>
    );
}

function StatsSkeleton() {
    return (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading stats...</span>
        </div>
    );
}

export default function Dashboard() {
    const { providers, settings, templates } = usePage<{ props: DashboardProps }>().props as unknown as DashboardProps;

    const form = useForm({
        default_model: settings.default_model,
        default_system_prompt: settings.default_system_prompt,
    });

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/dashboard/settings', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto max-w-4xl space-y-8">
                <h1 className="text-2xl font-bold">Dashboard</h1>

                <Deferred data="stats" fallback={<StatsSkeleton />}>
                    <StatsContent />
                </Deferred>

                {/* Provider Status */}
                <div>
                    <h2 className="text-lg font-semibold mb-3">Provider Status</h2>
                    <div className="grid gap-3 md:grid-cols-3">
                        {Object.entries(providers).map(([key, p]) => (
                            <div key={key} className="flex items-center gap-3 rounded-xl border p-4">
                                <div className={`h-2.5 w-2.5 rounded-full ${p.configured ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                <span className="text-sm font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{p.configured ? 'Configured' : 'Not configured'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Global Config */}
                <div>
                    <h2 className="text-lg font-semibold mb-3">Global Settings</h2>
                    <form onSubmit={handleSaveSettings} className="rounded-xl border p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Default Model</label>
                            <select
                                value={form.data.default_model}
                                onChange={e => form.setData('default_model', e.target.value)}
                                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--scheme-accent)]"
                            >
                                {models.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Default System Prompt</label>
                            <textarea
                                value={form.data.default_system_prompt}
                                onChange={e => form.setData('default_system_prompt', e.target.value)}
                                rows={3}
                                placeholder="Leave empty for default assistant behavior"
                                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none resize-none focus:border-[var(--scheme-accent)]"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                            style={{ backgroundColor: 'var(--scheme-accent)' }}
                        >
                            {form.processing ? 'Saving...' : 'Save Settings'}
                        </button>
                    </form>
                </div>

                {/* Template Management */}
                <TemplateManager templates={templates} />
            </div>
        </>
    );
}
