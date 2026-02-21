import { usePage } from '@inertiajs/react';

export function useBasePath() {
    const basePath = (usePage().props as { basePath?: string }).basePath ?? '';

    return {
        basePath,
        url: (path: string) => basePath + path,
    };
}
