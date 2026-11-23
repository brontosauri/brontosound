<script lang="ts">
    // One group of a settings page, in its box; `aside` goes right of the title (a link, a button)
    import type { Snippet } from 'svelte';

    let { title, aside, children }: { title: string, aside?: Snippet, children: Snippet } = $props();
</script>

<section class="space-y-4 rounded-lg border border-gray-200 p-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-xl font-bold text-gray-900">{title}</h2>
        {@render aside?.()}
    </div>
    {@render children()}
</section>
