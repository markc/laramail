import { Link, usePage } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import { useBasePath } from '@/hooks/use-base-path';

type DocEntry = { slug: string; title: string };

export default function DocsPanel() {
    const { sidebarDocs } = usePage<{
        props: { sidebarDocs: DocEntry[] };
    }>().props as unknown as { sidebarDocs: DocEntry[] };

    const docs = sidebarDocs ?? [];
    const { url } = useBasePath();
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
                {docs.length === 0 && (
                    <p className="p-3 text-center text-xs" style={{ color: 'var(--scheme-fg-muted)' }}>
                        No docs found
                    </p>
                )}
                {docs.map(doc => {
                    const href = url(`/docs/${doc.slug}`);
                    const isActive = currentPath === href;
                    return (
                        <Link
                            key={doc.slug}
                            href={href}
                            prefetch
                            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-background ${
                                isActive ? 'bg-background' : ''
                            }`}
                            style={{ color: isActive ? 'var(--scheme-accent)' : undefined }}
                        >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{doc.title}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
