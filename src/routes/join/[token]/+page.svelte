<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import { Button, Heading, P } from "flowbite-svelte";
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";
    import JoiningBand from "$lib/components/JoiningBand.svelte";
    import { bandAppUrl } from "$lib/misc";
    import LinkClosed from "./LinkClosed.svelte";

    let { data } = $props();
    const token = page.params.token;
</script>

<BrontoHeader />

<main class="mx-auto max-w-md space-y-6 p-8 pt-14">
    {#if data.closed}
        <div class="pt-10"><LinkClosed reason={data.closed.reason} bandName={data.closed.bandName} /></div>
    {:else if data.joining}
        <Heading tag="h1" class="text-4xl">Join {data.joining.name}</Heading>
        <JoiningBand band={data.joining} full />
        {#if data.member}
            <P>You're in the band already.</P>
            <Button href={bandAppUrl(data.joining.handle)} class="w-full">Open {data.joining.name}</Button>
        {:else if data.brontoSession}
            <form method="POST" use:enhance>
                <Button type="submit" class="w-full">Join {data.joining.name}</Button>
            </form>
            <form method="POST" action="/signout" class="text-center text-sm text-gray-500">
                <input type="hidden" name="redirectTo" value={page.url.pathname} />
                {data.brontoSession.user.handle ? `@${data.brontoSession.user.handle}` : data.brontoSession.user.name} ·
                <button type="submit" class="font-medium text-primary-800 hover:underline">Sign out</button>
            </form>
        {:else}
            <div class="flex flex-col gap-3">
                {#if data.mayJoin}<Button href="/join?invite={token}">Create an account and join</Button>{/if}
                <Button href="/signin?invite={token}" color={data.mayJoin ? 'light' : 'primary'}>Sign in and join</Button>
            </div>
        {/if}
    {/if}
</main>
