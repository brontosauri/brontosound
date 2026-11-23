<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import { Alert, Button, Heading, P } from "flowbite-svelte";
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";
    import NewAccountFields from "$lib/components/NewAccountFields.svelte";
    import SignOut from "../../signin/SignOut.svelte";

    let { data, form } = $props();
</script>

<BrontoHeader />

<main class="mx-auto max-w-md space-y-6 p-8 pt-12">
    <Heading tag="h1" class="text-4xl">{data.pageTitle}</Heading>
    {#if data.signedIn}
        <P>You're signed in already. To create another account with this invitation, sign out first.</P>
        <SignOut options={{ redirectTo: page.url.pathname }}><span slot="submitButton">Sign out</span></SignOut>
    {:else}
        <P class="text-gray-700">
            You're invited. Create your account: one for every band you play in.
            {#if data.email}You can also sign in with {data.email}.{/if}
        </P>
        {#if form?.error}
            <Alert color="red">{form.error}</Alert>
        {/if}
        <form method="POST" class="space-y-5" use:enhance={() => async ({ update }) => update({ reset: false })}>
            <NewAccountFields rules={data.rules} />
            <Button type="submit" class="w-full">Create account</Button>
        </form>
    {/if}
</main>
