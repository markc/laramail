import { usePage } from '@inertiajs/react';
import type { BarChart3} from 'lucide-react';
import { Cpu, DollarSign, Hash, MessageSquare } from 'lucide-react';

type SidebarStats = {
    conversations: number;
    messages: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    costByModel: { model: string; input_tokens: number; output_tokens: number; cost: number }[];
};

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof BarChart3; label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--glass-border)', background: 'var(--glass)' }}>
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" style={{ color: 'var(--scheme-accent)' }} />
                <span className="text-xs" style={{ color: 'var(--scheme-fg-muted)' }}>{label}</span>
            </div>
            <div className="mt-1 text-lg font-semibold" style={{ color: 'var(--scheme-fg-primary)' }}>{value}</div>
            {sub && <div className="mt-0.5 text-[10px]" style={{ color: 'var(--scheme-fg-muted)' }}>{sub}</div>}
        </div>
    );
}

export default function UsagePanel() {
    const { sidebarStats } = usePage<{ props: { sidebarStats?: SidebarStats } }>().props as unknown as { sidebarStats?: SidebarStats };

    if (!sidebarStats) {
        return (
            <div className="flex h-32 items-center justify-center">
                <span className="text-xs" style={{ color: 'var(--scheme-fg-muted)' }}>No usage data yet</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-2">
                <StatCard icon={MessageSquare} label="Chats" value={String(sidebarStats.conversations)} />
                <StatCard icon={Hash} label="Messages" value={String(sidebarStats.messages)} />
                <StatCard
                    icon={Cpu}
                    label="Tokens"
                    value={formatTokens(sidebarStats.inputTokens + sidebarStats.outputTokens)}
                    sub={`${formatTokens(sidebarStats.inputTokens)} in / ${formatTokens(sidebarStats.outputTokens)} out`}
                />
                <StatCard icon={DollarSign} label="Total Cost" value={formatCost(sidebarStats.totalCost)} />
            </div>

            {sidebarStats.costByModel.length > 0 && (
                <div className="border-t pt-3" style={{ borderColor: 'var(--glass-border)' }}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--scheme-fg-muted)' }}>
                        Cost by Model
                    </h3>
                    <div className="flex flex-col gap-1.5 text-xs">
                        {sidebarStats.costByModel.map(entry => (
                            <div key={entry.model} className="flex items-center justify-between gap-2">
                                <span className="truncate" style={{ color: 'var(--scheme-fg-secondary)' }}>{entry.model}</span>
                                <span className="shrink-0 tabular-nums font-medium" style={{ color: 'var(--scheme-fg-primary)' }}>
                                    {formatCost(entry.cost)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
