<script lang="ts">
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";
    import HerdFooter from "$lib/components/HerdFooter.svelte";

    let { data } = $props();
</script>

<svelte:head><title>Herd rules</title></svelte:head>

<div class="flex min-h-screen flex-col">
    <BrontoHeader />
    <main class="mx-auto w-full max-w-2xl flex-1 space-y-4 px-6 py-14">
        <h1 class="text-5xl font-bold text-gray-900">Herd rules</h1>
        {#each data.rules as rule}
            <p class="text-gray-700">{rule}</p>
        {:else}
            <p class="text-gray-700">This herd hasn't written its rules yet. Be kind, and share only music you may share.</p>
        {/each}
    </main>
    <HerdFooter />
</div>
