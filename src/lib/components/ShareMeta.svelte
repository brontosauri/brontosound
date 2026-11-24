<script lang="ts">
    // Open Graph tags: how a link to this page previews in chat apps (WhatsApp, Telegram…)
    import { page } from "$app/state";

    let { title, description, image }: { title: string, description?: string, image?: string | null } = $props();
    const imageUrl = $derived(new URL(image ?? '/bronto.png', page.url.origin).href);
</script>

<svelte:head>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={page.data.herdName} />
    <meta property="og:title" content={title} />
    {#if description}<meta property="og:description" content={description} />{/if}
    <meta property="og:image" content={imageUrl} />
    <meta property="og:url" content={page.url.href} />
</svelte:head>
