import { ArrowUp, Square, Paperclip, X, FileText, Globe, ScrollText, Cpu, Terminal, LoaderCircle, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { SystemPromptTemplate } from '@/types/chat';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PendingFile {
    file: File;
    preview?: string;
}

interface MessageInputProps {
    onSend: (content: string) => void;
    onCancel?: () => void;
    disabled?: boolean;
    isStreaming?: boolean;
    model: string;
    onModelChange: (model: string) => void;
    systemPrompt: string;
    onSystemPromptChange: (prompt: string) => void;
    templates: SystemPromptTemplate[];
    pendingFiles: PendingFile[];
    onFilesSelected: (files: FileList) => void;
    onRemoveFile: (index: number) => void;
    webSearch: boolean;
    onWebSearchChange: (enabled: boolean) => void;
}

const apiModels = [
    { value: 'claude-3-5-haiku-20241022', label: 'Haiku 3.5', group: 'Anthropic' },
    { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5', group: 'Anthropic' },
    { value: 'claude-opus-4-6', label: 'Opus 4.6', group: 'Anthropic' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', group: 'OpenAI' },
    { value: 'gpt-4o', label: 'GPT-4o', group: 'OpenAI' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini', group: 'OpenAI' },
    { value: 'gpt-5', label: 'GPT-5', group: 'OpenAI' },
    { value: 'gpt-5.2', label: 'GPT-5.2', group: 'OpenAI' },
    { value: 'o3-mini', label: 'o3 Mini', group: 'OpenAI' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', group: 'Google' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', group: 'Google' },
    { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro', group: 'Google' },
    { value: 'openclaw:clawd-chat', label: 'Clawd Chat 🐾', group: 'Local' },
    { value: 'openclaw:clawd-dev', label: 'Clawd Dev 🐾', group: 'Local' },
    { value: 'claude-code', label: 'Claude Code', group: 'Local' },
];

export default function MessageInput({
    onSend, onCancel, disabled, isStreaming, model, onModelChange,
    systemPrompt, onSystemPromptChange, templates,
    pendingFiles, onFilesSelected, onRemoveFile,
    webSearch, onWebSearchChange,
}: MessageInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCustomPrompt, setShowCustomPrompt] = useState(false);
    const [projects, setProjects] = useState<string[]>([]);

    useEffect(() => {
        fetch('/chat/projects')
            .then(r => r.json())
            .then(setProjects)
            .catch(() => {});
    }, []);

    const [modelSearch, setModelSearch] = useState('');
    const modelSearchRef = useRef<HTMLInputElement>(null);
    const [projectSearch, setProjectSearch] = useState('');
    const projectSearchRef = useRef<HTMLInputElement>(null);

    const filteredModels = useMemo(() => {
        if (!modelSearch) return apiModels;
        const q = modelSearch.toLowerCase();
        return apiModels.filter(m => m.label.toLowerCase().includes(q) || m.group.toLowerCase().includes(q));
    }, [modelSearch]);

    const filteredModelGroups = useMemo(
        () => Object.entries(Object.groupBy(filteredModels, m => m.group)) as [string, typeof apiModels][],
        [filteredModels],
    );

    const filteredProjects = useMemo(() => {
        if (!projectSearch) return projects;
        const q = projectSearch.toLowerCase();
        return projects.filter(p => p.toLowerCase().includes(q));
    }, [projects, projectSearch]);

    useEffect(() => {
        if (!disabled && !isStreaming) {
            textareaRef.current?.focus();
        }
    }, [disabled, isStreaming]);

    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }, []);

    const handleSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        const content = textareaRef.current?.value.trim();
        if (!content) return;
        onSend(content);
        if (textareaRef.current) {
            textareaRef.current.value = '';
            textareaRef.current.style.height = 'auto';
        }
    }, [onSend]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as FormEvent);
        }
    }, [handleSubmit]);

    const handleTemplateChange = (value: string) => {
        if (value === '__custom__') {
            setShowCustomPrompt(true);
        } else {
            setShowCustomPrompt(false);
            onSystemPromptChange(value);
        }
    };

    const isClaudeCode = model.startsWith('claude-code:') || model === 'claude-code';
    const isOpenClaw = model.startsWith('openclaw:');

    // Determine active model display
    const activeModel = apiModels.find(m => m.value === model);
    const activeProject = isClaudeCode && model !== 'claude-code'
        ? model.replace('claude-code:', '')
        : null;

    const hasActiveTemplate = showCustomPrompt || (systemPrompt !== '' && systemPrompt !== undefined);

    // Determine current template radio value
    const templateRadioValue = showCustomPrompt
        ? '__custom__'
        : systemPrompt || '';

    return (
        <div className="bg-background">
            <div className="mx-auto max-w-3xl p-4">
                {showCustomPrompt && (
                    <div className="mb-2 rounded-xl border bg-muted/30 p-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">Custom System Prompt</span>
                            <button onClick={() => { setShowCustomPrompt(false); onSystemPromptChange(''); }} className="rounded p-0.5 hover:bg-muted">
                                <X className="h-3 w-3 text-muted-foreground" />
                            </button>
                        </div>
                        <textarea
                            value={systemPrompt}
                            onChange={e => onSystemPromptChange(e.target.value)}
                            rows={3}
                            placeholder="Enter a custom system prompt..."
                            className="w-full rounded-lg border bg-transparent px-3 py-1.5 text-xs outline-none resize-none focus:border-[var(--scheme-accent)]"
                        />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="rounded-2xl border bg-muted/30 focus-within:border-[var(--scheme-accent)] transition-colors">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder="Type a message..."
                        disabled={disabled || isStreaming}
                        onInput={autoResize}
                        onKeyDown={handleKeyDown}
                        className="w-full resize-none border-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                    />

                    {pendingFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-3 pb-2">
                            {pendingFiles.map((pf, i) => (
                                <div key={i} className="relative group/file">
                                    {pf.preview ? (
                                        <img src={pf.preview} alt={pf.file.name} className="h-14 w-14 rounded-lg object-cover border" />
                                    ) : (
                                        <div className="flex items-center gap-1 rounded-lg border bg-background px-2 py-1.5 text-xs">
                                            <FileText className="h-3.5 w-3.5" />
                                            <span className="max-w-[80px] truncate">{pf.file.name}</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onRemoveFile(i)}
                                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[10px] opacity-0 group-hover/file:opacity-100 transition-opacity"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-1 px-3 pb-2">
                        <div className="flex items-center gap-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,.pdf,.txt,.md"
                                className="hidden"
                                onChange={e => { if (e.target.files?.length) onFilesSelected(e.target.files); e.target.value = ''; }}
                            />

                            {/* Attach files */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                                    >
                                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Attach files</TooltipContent>
                            </Tooltip>

                            {/* Web search */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => onWebSearchChange(!webSearch)}
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                            webSearch
                                                ? 'bg-[var(--scheme-accent)] text-white'
                                                : 'hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        <Globe className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Web search (uses Gemini)</TooltipContent>
                            </Tooltip>

                            {/* System prompt template */}
                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                    hasActiveTemplate
                                                        ? 'bg-[var(--scheme-accent)] text-white'
                                                        : 'hover:bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <ScrollText className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">System prompt</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent side="top" align="start" className="min-w-[180px]">
                                    <DropdownMenuLabel>System Prompt</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={templateRadioValue} onValueChange={handleTemplateChange}>
                                        <DropdownMenuRadioItem value="">Default prompt</DropdownMenuRadioItem>
                                        {templates.map(t => (
                                            <DropdownMenuRadioItem key={t.id} value={t.prompt}>{t.name}</DropdownMenuRadioItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuRadioItem value="__custom__">Custom...</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Model selector */}
                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className={`flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 transition-colors ${
                                                    isClaudeCode || isOpenClaw
                                                        ? 'bg-[var(--scheme-accent)] text-white'
                                                        : 'hover:bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {isClaudeCode ? <Terminal className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
                                                <span className="text-[10px] font-medium max-w-[80px] truncate hidden sm:inline">
                                                    {activeModel?.label ?? 'Model'}
                                                </span>
                                            </button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Model: {activeModel?.label ?? model}</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent
                                    side="top"
                                    align="start"
                                    className="min-w-[200px] flex flex-col"
                                    onCloseAutoFocus={() => setModelSearch('')}
                                >
                                    <div className="flex items-center gap-2 px-2 py-1.5 border-b">
                                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <input
                                            ref={modelSearchRef}
                                            value={modelSearch}
                                            onChange={e => setModelSearch(e.target.value)}
                                            onKeyDown={e => e.stopPropagation()}
                                            placeholder="Search models..."
                                            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[280px] overflow-y-auto">
                                        <DropdownMenuRadioGroup value={model} onValueChange={onModelChange}>
                                            {filteredModelGroups.map(([group, items], gi) => (
                                                <DropdownMenuGroup key={group}>
                                                    {gi > 0 && <DropdownMenuSeparator />}
                                                    <DropdownMenuLabel>{group}</DropdownMenuLabel>
                                                    {items.map(m => (
                                                        <DropdownMenuRadioItem key={m.value} value={m.value}>
                                                            {m.label}
                                                        </DropdownMenuRadioItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                            ))}
                                            {filteredModels.length === 0 && (
                                                <div className="px-2 py-3 text-xs text-muted-foreground text-center">No matches</div>
                                            )}
                                        </DropdownMenuRadioGroup>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Project selector (only shown when Claude Code is selected) */}
                            {isClaudeCode && (
                                <DropdownMenu>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 transition-colors bg-[var(--scheme-accent)]/80 text-white hover:bg-[var(--scheme-accent)]"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    <span className="text-[10px] font-medium max-w-[80px] truncate hidden sm:inline">
                                                        {activeProject ?? 'Select project'}
                                                    </span>
                                                </button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            {activeProject ? `Project: ${activeProject}` : 'Select a GitHub project'}
                                        </TooltipContent>
                                    </Tooltip>
                                    <DropdownMenuContent
                                        side="top"
                                        align="start"
                                        className="min-w-[200px] flex flex-col"
                                        onCloseAutoFocus={() => setProjectSearch('')}
                                    >
                                        <div className="flex items-center gap-2 px-2 py-1.5 border-b">
                                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <input
                                                ref={projectSearchRef}
                                                value={projectSearch}
                                                onChange={e => setProjectSearch(e.target.value)}
                                                onKeyDown={e => e.stopPropagation()}
                                                placeholder="Search projects..."
                                                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[280px] overflow-y-auto">
                                            <DropdownMenuRadioGroup
                                                value={model}
                                                onValueChange={onModelChange}
                                            >
                                                <DropdownMenuLabel>~/.gh Projects</DropdownMenuLabel>
                                                {filteredProjects.map(p => (
                                                    <DropdownMenuRadioItem key={p} value={`claude-code:${p}`}>
                                                        {p}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                                {filteredProjects.length === 0 && (
                                                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">No matches</div>
                                                )}
                                            </DropdownMenuRadioGroup>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Send / Working / Stop */}
                        {isStreaming ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
                                    >
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Stop</TooltipContent>
                            </Tooltip>
                        ) : disabled ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        disabled
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                                        style={{ backgroundColor: 'var(--scheme-accent)', color: 'white' }}
                                    >
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Working...</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="submit"
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                                        style={{ backgroundColor: 'var(--scheme-accent)', color: 'white' }}
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Send</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
