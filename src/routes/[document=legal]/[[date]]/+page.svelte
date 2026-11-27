<script lang="ts">
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";
    import HerdFooter from "$lib/components/HerdFooter.svelte";
    import LegalText from "$lib/components/LegalText.svelte";
    import { formatDate } from "$lib/dates";

    let { data } = $props();
    const url = (date: string) => `/${data.document}/${date}`;
</script>

<svelte:head><title>{data.title} · {data.herdName}</title></svelte:head>

<div class="flex min-h-screen flex-col">
    <BrontoHeader />
    <main class="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-14">
        <div class="space-y-2">
            <h1 class="text-5xl font-bold text-gray-900">{data.title}</h1>
            {#if data.effectiveDate}
                <p class="text-sm text-gray-500">
                    {data.inForce ? 'Effective' : 'Takes effect on'} {formatDate(data.effectiveDate)}
                    {#if data.upcoming}· <a href={url(data.upcoming)} class="text-primary-800 hover:text-primary-900">A new version takes effect on {formatDate(data.upcoming)}</a>{/if}
                </p>
            {/if}
        </div>
        {#if data.changelog && !data.inForce}
            <div class="rounded-lg border border-primary-300 bg-primary-50 p-4 text-sm text-gray-900">
                <p class="font-medium">What changes</p>
                <p class="whitespace-pre-line">{data.changelog}</p>
            </div>
        {/if}
        <LegalText text={data.text} />
        {#if data.versions.length > 1}
            <section class="space-y-2 border-t border-gray-200 pt-6 text-sm">
                <h2 class="font-medium text-gray-900">All versions</h2>
                <ul class="flex flex-wrap gap-x-4 gap-y-1">
                    {#each data.versions as date}
                        <li>{#if date === data.effectiveDate}<span class="text-gray-500">{formatDate(date)}</span>{:else}<a href={url(date)} class="text-primary-800 hover:text-primary-900">{formatDate(date)}</a>{/if}</li>
                    {/each}
                </ul>
            </section>
        {/if}
    </main>
    <HerdFooter />
</div>
