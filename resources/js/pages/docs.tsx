import { Head, usePage } from '@inertiajs/react';
import { code } from '@streamdown/code';
import { useLayoutEffect } from 'react';
import { Streamdown } from 'streamdown';
import { useTheme } from '@/contexts/theme-context';

type DocProps = {
    doc: { slug: string; title: string; content: string } | null;
};

export default function DocsPage() {
    const { doc } = usePage<{ props: DocProps }>().props as unknown as DocProps;
    const { setPanel } = useTheme();

    useLayoutEffect(() => {
        setPanel('left', 2);
    }, [setPanel]);

    return (
        <>
            <Head title={doc?.title ?? 'Documentation'} />
            <div className="mx-auto max-w-4xl py-8 sm:px-6">
                {doc ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown
                            mode="static"
                            plugins={{ code }}
                        >
                            {doc.content}
                        </Streamdown>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <h1 className="text-2xl font-bold mb-2">Documentation</h1>
                        <p className="text-muted-foreground">Select a document from the sidebar to get started.</p>
                    </div>
                )}
            </div>
        </>
    );
}
