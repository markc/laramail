import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useUiStore } from '@/stores/mail';

interface MailLayoutProps {
    list: ReactNode;
    reader: ReactNode;
}

export default function MailLayout({ list, reader }: MailLayoutProps) {
    const layout = useUiStore((s) => s.layout);
    const [listWidth, setListWidth] = useState(380);
    const dragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;

        const onMouseMove = (ev: MouseEvent) => {
            if (!dragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const newWidth = Math.max(280, Math.min(600, ev.clientX - rect.left));
            setListWidth(newWidth);
        };

        const onMouseUp = () => {
            dragging.current = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);

    if (layout === 'full') {
        return (
            <div className="flex h-[calc(100vh-3rem)] flex-col">
                {list}
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex h-[calc(100vh-3rem)]">
            {/* Email list */}
            <div className="flex shrink-0 flex-col overflow-hidden border-r border-border" style={{ width: listWidth }}>
                {list}
            </div>

            {/* Drag handle */}
            <div
                className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-[var(--scheme-accent)]/30"
                onMouseDown={handleMouseDown}
            />

            {/* Reading pane */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {reader}
            </div>
        </div>
    );
}
