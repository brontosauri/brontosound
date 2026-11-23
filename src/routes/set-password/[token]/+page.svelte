<script lang="ts">
    import { enhance } from "$app/forms";
    import { Alert, Button, Heading, Input, Label, P } from "flowbite-svelte";
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";
    import { MIN_PASSWORD_LENGTH } from "$lib/passwordPolicy";

    let { data, form } = $props();
</script>

<BrontoHeader />

<main class="mx-auto max-w-md space-y-6 p-8 pt-16">
    <Heading tag="h1" class="text-3xl">Set your password</Heading>
    <P>For {data.name}, who signs in as {data.login}.</P>
    {#if form?.error}
        <Alert color="red">{form.error}</Alert>
    {/if}
    <form method="POST" class="space-y-4" use:enhance>
        <Label>Password<Input name="password" type="password" class="mt-2" minlength={MIN_PASSWORD_LENGTH} autocomplete="new-password" required /></Label>
        <Label>Again<Input name="repeat" type="password" class="mt-2" autocomplete="new-password" required /></Label>
        <p class="text-[13px] text-gray-500">At least {MIN_PASSWORD_LENGTH} characters. Passwords found in data breaches are refused.</p>
        <Button type="submit" class="w-full">Set password</Button>
    </form>
</main>
