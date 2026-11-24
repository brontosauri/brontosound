<script lang="ts">
    import { faHeartPulse, faMusic, faTowerBroadcast } from "@fortawesome/free-solid-svg-icons";
    import Fa from "svelte-fa";
    import { Button } from "flowbite-svelte";
    import BandLogo from "$lib/components/BandLogo.svelte";
    import HerdIllustration from "$lib/components/HerdIllustration.svelte";

    let { data } = $props();
    const big = "h-[52px] px-7 text-base";
    const plural = (count: number, noun: string) => `${count} ${noun}${count == 1 ? '' : 's'}`;
    const features = [
        { icon: faMusic, title: "Songbook", text: "Charts, tracks and notes, in your own storage." },
        { icon: faHeartPulse, title: "Live", text: "Venues, gigs, and the ones you're chasing." },
        { icon: faTowerBroadcast, title: "Backline", text: "Play the show; the band follows on their phones." },
    ];
</script>

<svelte:head><title>{data.herdName}</title></svelte:head>

<div class="flex min-h-dvh flex-col">

    <main class="flex flex-col items-center gap-7 px-6 pt-16 text-center">
        <span class="rounded bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">A Brontosound herd</span>
        <h1 class="text-[clamp(56px,9vw,116px)] font-bold leading-[0.95] tracking-tight text-gray-900">{data.herdName}</h1>
        {#if data.tagline}<p class="max-w-xl text-xl text-gray-600">{data.tagline}</p>{/if}

        <div class="flex flex-wrap justify-center gap-3">
            {#if data.brontoSession}
                <Button href="/me" class={big}>Your bands</Button>
            {:else}
                {#if data.registrations == 'open'}<Button href="/join" class={big}>Join the herd</Button>{/if}
                <Button href="/signin" color={data.registrations == 'open' ? 'light' : 'primary'} class={big}>Sign in</Button>
            {/if}
        </div>
        {#if !data.brontoSession}
            <p class="flex items-center gap-2 text-[13px] text-gray-500">
                {#if data.registrations == 'open'}
                    <span class="h-2 w-2 rounded-full bg-primary-700"></span>Registrations are open · {plural(data.bandCount, 'band')} · {plural(data.peopleCount, 'musician')}
                {:else if data.registrations == 'invite'}
                    <span class="h-2 w-2 rounded-full bg-primary-700"></span>Joining is by invitation: a band invites you · {plural(data.bandCount, 'band')} · {plural(data.peopleCount, 'musician')}
                {:else}
                    Registrations are closed.{#if data.contactEmail}&nbsp;To join, ask the herd's admin: <a href="mailto:{data.contactEmail}" class="text-primary-800">{data.contactEmail}</a>{/if}
                {/if}
            </p>
        {/if}

        <div class="mt-12 grid w-full max-w-4xl gap-10 text-left [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {#each features as feature}
                <div class="flex items-start gap-4">
                    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700"><Fa icon={feature.icon} /></span>
                    <span class="flex flex-col gap-1"><span class="font-bold text-gray-900">{feature.title}</span><span class="text-sm text-gray-600">{feature.text}</span></span>
                </div>
            {/each}
        </div>

        {#if data.bands.length}
            <div class="mt-8 flex flex-col items-center gap-3">
                <p class="text-[13px] text-gray-500">Bands in this herd</p>
                <div class="flex flex-wrap justify-center gap-2.5">
                    {#each data.bands as band}
                        <a href="/@{band.handle}" class="inline-flex items-center gap-2.5 rounded-lg border border-gray-200 py-1.5 pe-3.5 ps-1.5 text-sm font-medium text-gray-900">
                            <BandLogo src={band.logo} size="sm" />{band.name}
                        </a>
                    {/each}
                    {#if data.moreBands}<span class="px-2 py-1.5 text-sm font-medium text-gray-500">and {data.moreBands} more</span>{/if}
                </div>
            </div>
        {/if}
    </main>

    <HerdIllustration />
</div>
