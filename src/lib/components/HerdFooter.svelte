<script lang="ts">
    // The public pages' footer: who runs the herd, its rules and legal texts
    import type { Snippet } from 'svelte';
    import { page } from '$app/state';
    import PoweredBy from './PoweredBy.svelte';
    import versionInfo from '$lib/version.json';

    let { children }: { children?: Snippet } = $props();
</script>

<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-5 text-sm text-gray-500">
    <PoweredBy />
    <nav class="flex flex-wrap items-center gap-6" aria-label="Herd">
        <span title="Released on {versionInfo.releaseDate}">v{versionInfo.version}</span>
        <a href="/" class="hover:text-gray-700">{page.data.herdName}</a>
        <a href="/rules" class="hover:text-gray-700">Herd rules</a>
        <a href="/terms" class="hover:text-gray-700">Terms</a>
        <a href="/privacy" class="hover:text-gray-700">Privacy</a>
        {#if page.data.herdContact}<a href="mailto:{page.data.herdContact}" class="hover:text-gray-700">Contact the admin</a>{/if}
        {@render children?.()}
    </nav>
</footer>
