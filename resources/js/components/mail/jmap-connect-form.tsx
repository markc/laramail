import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/stores/mail';

export default function JmapConnectForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { connect, isConnecting, error } = useSessionStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await connect(email, password);
    };

    return (
        <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center p-4">
            <div
                className="w-full max-w-md rounded-xl p-6"
                style={{
                    background: 'var(--glass)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                }}
            >
                <div className="mb-6 flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--scheme-accent)]">
                        <Mail className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold">Connect to Mail</h2>
                    <p className="text-center text-sm text-muted-foreground">
                        Sign in to your Stalwart mail server
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="jmap-email" className="mb-1 block text-sm font-medium">
                            Email
                        </label>
                        <input
                            id="jmap-email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            placeholder="you@kanary.org"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--scheme-accent)]"
                        />
                    </div>

                    <div>
                        <label htmlFor="jmap-password" className="mb-1 block text-sm font-medium">
                            Password
                        </label>
                        <input
                            id="jmap-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--scheme-accent)]"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isConnecting}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[var(--scheme-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            'Connect'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
