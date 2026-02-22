import DOMPurify from 'dompurify';
import { useEffect, useRef, useState } from 'react';

interface EmailHtmlRendererProps {
    html: string;
    blobBaseUrl?: string;
}

export default function EmailHtmlRenderer({ html, blobBaseUrl = '/api/jmap/blob' }: EmailHtmlRendererProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(300);

    useEffect(() => {
        if (!iframeRef.current) return;

        // Sanitize HTML
        let sanitized = DOMPurify.sanitize(html, {
            ALLOW_UNKNOWN_PROTOCOLS: false,
            FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
            ADD_ATTR: ['target'],
        });

        // Replace cid: references with proxied blob URLs
        sanitized = sanitized.replace(
            /src="cid:([^"]+)"/g,
            `src="${blobBaseUrl}/$1/inline"`,
        );

        // Open links in new tab
        sanitized = sanitized.replace(
            /<a /g,
            '<a target="_blank" rel="noopener noreferrer" ',
        );

        // Wrap in a basic HTML document with styling
        const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
    body {
        margin: 0;
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: inherit;
        background: transparent;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    img { max-width: 100%; height: auto; }
    a { color: inherit; }
    pre { overflow-x: auto; }
    blockquote {
        margin: 0.5em 0;
        padding-left: 1em;
        border-left: 3px solid #ccc;
    }
</style>
</head>
<body>${sanitized}</body>
</html>`;

        iframeRef.current.srcdoc = doc;

        const iframe = iframeRef.current;
        const handleLoad = () => {
            try {
                const body = iframe.contentDocument?.body;
                if (body) {
                    setHeight(Math.max(200, body.scrollHeight + 24));
                }
            } catch {
                // Cross-origin, ignore
            }
        };

        iframe.addEventListener('load', handleLoad);
        return () => iframe.removeEventListener('load', handleLoad);
    }, [html, blobBaseUrl]);

    return (
        <iframe
            ref={iframeRef}
            sandbox="allow-same-origin allow-popups"
            className="w-full border-0"
            style={{ height }}
            title="Email content"
        />
    );
}
