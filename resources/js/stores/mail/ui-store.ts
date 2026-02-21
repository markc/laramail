import { create } from 'zustand';
import type { MailLayout } from '@/types/mail';

interface UiState {
    layout: MailLayout;
    searchQuery: string;
    setLayout: (layout: MailLayout) => void;
    setSearchQuery: (query: string) => void;
    reset: () => void;
}

export const useUiStore = create<UiState>((set) => ({
    layout: 'split',
    searchQuery: '',

    setLayout: (layout) => set({ layout }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    reset: () => set({ layout: 'split', searchQuery: '' }),
}));
