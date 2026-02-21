<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- FOUC prevention: restore theme/scheme before React hydrates --}}
        <script>
            (function() {
                try {
                    const s = JSON.parse(localStorage.getItem('base-state') || '{}');
                    const theme = s.theme || 'dark';
                    const scheme = s.scheme || 'crimson';

                    document.documentElement.classList.add(theme);
                    document.documentElement.style.colorScheme = theme;

                    if (scheme && scheme !== 'crimson') {
                        document.documentElement.classList.add('scheme-' + scheme);
                    }
                } catch(e) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                }
            })();
        </script>

        <style>
            html { background-color: oklch(1 0 0); }
            html.dark { background-color: oklch(0.145 0 0); }
        </style>

        <title inertia>{{ config('app.name', 'LaraDAV') }}</title>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
