<script lang="ts">
    import BrontoHeader from '$lib/components/shell/BrontoHeader.svelte';
    import HerdFooter from '$lib/components/HerdFooter.svelte';
    import BandPublicProfile from './BandPublicProfile.svelte';
    import UserPublicProfile from './UserPublicProfile.svelte';
    import ReportProfile from './ReportProfile.svelte';

    let { data, form } = $props();
    let reporting = $state(false);
</script>

<svelte:head><title>{data.profile.name}</title></svelte:head>

<div class="flex min-h-screen flex-col">
<BrontoHeader />

<main class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pb-16 pt-14">
    {#if data.profile.kind == 'band'}
        <BandPublicProfile profile={data.profile} herdDomain={data.herdDomain} />
    {:else}
        <UserPublicProfile profile={data.profile} herdDomain={data.herdDomain} {form} />
    {/if}
    {#if reporting || (form && 'reported' in form)}
        <ReportProfile {form} signedIn={!!data.brontoSession} />
    {/if}
</main>

<HerdFooter>
    <button type="button" class="hover:text-gray-700" onclick={() => reporting = true}>Report this profile</button>
</HerdFooter>
</div>
