<script lang="ts">
    // A profile's heading: picture, name, handle, tags, and actions on the right
    import type { Snippet } from 'svelte';

    let { picture, name, handle, herdDomain, tags, city, actions }: {
        picture: Snippet, name: string, handle: string, herdDomain: string, tags: string[], city: string, actions?: Snippet,
    } = $props();
</script>

<section class="flex flex-wrap items-center gap-8">
    {@render picture()}
    <div class="flex min-w-0 flex-1 flex-col gap-3">
        <h1 class="text-5xl font-bold text-gray-900">{name}</h1>
        <span class="text-gray-500">@{handle}@{herdDomain}</span>
        {#if tags.length || city}
            <div class="flex flex-wrap gap-2">
                {#each tags as tag}<span class="rounded bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">{tag}</span>{/each}
                {#if city}<span class="rounded bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{city}</span>{/if}
            </div>
        {/if}
    </div>
    {@render actions?.()}
</section>
