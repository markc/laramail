import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

type Props = Omit<React.ComponentProps<typeof Input>, 'onChange'> & {
    value: string;
    onChange: (value: string) => void;
    debounce?: number;
};

export function DebouncedInput({ value: initialValue, onChange, debounce = 300, ...props }: Props) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = setTimeout(() => onChange(value), debounce);
        return () => clearTimeout(timeout);
    }, [value, debounce]);

    return <Input {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}
