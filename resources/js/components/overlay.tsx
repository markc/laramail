import { useTheme } from '@/contexts/theme-context';

export default function Overlay() {
    const { left, right, closeSidebars } = useTheme();

    const visible = (left.open && !left.pinned) || (right.open && !right.pinned);

    return (
        <div
            onClick={closeSidebars}
            className={`fixed inset-0 z-30 bg-black/50 transition-opacity ${
                visible ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
        />
    );
}
