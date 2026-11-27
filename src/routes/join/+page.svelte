<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import { Alert, Button, Heading, Input, Label, P } from "flowbite-svelte";
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";
    import JoiningBand from "$lib/components/JoiningBand.svelte";
    import NewAccountFields from "$lib/components/NewAccountFields.svelte";
    import EarlyAccessNote from "$lib/components/EarlyAccessNote.svelte";
    import SignIn from "../signin/SignIn.svelte";

    let { data, form } = $props();
    const token = page.url.searchParams.get('invite');
</script>

<BrontoHeader />

<main class="mx-auto max-w-md space-y-6 p-8 pt-12">
    {#if data.joining}<JoiningBand band={data.joining} />{/if}
    <Heading tag="h1" class="text-4xl">{data.pageTitle}</Heading>

    {#if !data.mayJoin}
        <P>
            {data.registrations == 'invite' ? "Joining is by invitation: a band sends you a link." : "Registrations are closed: the herd's admins add people."}
            {#if data.contactEmail}Ask them at <a href="mailto:{data.contactEmail}" class="font-medium text-primary-800">{data.contactEmail}</a>.{/if}
        </P>
        <P><a href={data.joining ? `/signin?invite=${token}` : '/signin'} class="font-medium text-primary-800">Sign in</a> if you're in the herd already.</P>
    {:else}
        <P class="text-gray-700">One account for every band you play in.</P>
        {#if data.googleSignUp}
            <SignIn provider="google" options={{ redirectTo: token ? `/join/${token}` : '/me' }} className="flex flex-col"><span slot="submitButton">Continue with Google</span></SignIn>
            <p class="text-center text-sm text-gray-500">or with a password</p>
        {/if}
        {#if form?.error}
            <Alert color="red">{form.error}</Alert>
        {/if}
        <form method="POST" class="space-y-5" use:enhance={() => async ({ update }) => update({ reset: false })}>
            <Label>Email<Input name="email" type="email" class="mt-2" autocomplete="email" required /></Label>
            <NewAccountFields terms={data.terms} />
            <Button type="submit" class="w-full">{data.joining ? `Create account and join ${data.joining.name}` : 'Create account'}</Button>
        </form>
        <EarlyAccessNote />
        <p class="text-center text-sm text-gray-500">Already in the herd? <a href={data.joining ? `/signin?invite=${token}` : '/signin'} class="font-medium text-primary-800">Sign in</a></p>
    {/if}
</main>
