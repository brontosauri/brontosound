<script lang="ts">
    import { enhance } from "$app/forms";
    import { Alert, Button, Heading, Input, Label, P } from "flowbite-svelte";
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";

    let { form } = $props();
</script>

<BrontoHeader />

<main class="mx-auto max-w-md space-y-6 p-8 pt-16">
    <Heading tag="h1" class="text-3xl">Forgot your password?</Heading>
    {#if form?.sent}
        <Alert color="green">If there's an account with this email, we sent it a link to set a new password. It works once, within a week.</Alert>
    {:else}
        {#if form?.error}<Alert color="red">{form.error}</Alert>{/if}
        <P>We'll email you a link to set a new one.</P>
        <form method="POST" class="space-y-4" use:enhance>
            <Label>Email<Input name="email" type="email" class="mt-2" autocomplete="email" required /></Label>
            <Button type="submit" class="w-full">Send me a link</Button>
        </form>
    {/if}
    <P class="text-sm"><a href="/signin" class="font-medium text-primary-800">Back to sign in</a></P>
</main>
