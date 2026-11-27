<script lang="ts">
    import { enhance } from "$app/forms";
    import { Alert, Button, Heading } from "flowbite-svelte";
    import BrontoHeader from "$lib/components/shell/BrontoHeader.svelte";
    import EarlyAccessNote from "$lib/components/EarlyAccessNote.svelte";
    import TermsCheckboxes from "$lib/components/TermsCheckboxes.svelte";

    let { data, form } = $props();
</script>

<BrontoHeader />

<main class="mx-auto max-w-md space-y-6 p-8 pt-12">
    <Heading tag="h1" class="text-4xl">{data.pageTitle}</Heading>
    {#if form?.error}
        <Alert color="red">{form.error}</Alert>
    {/if}
    <form method="POST" action="?/accept" class="space-y-5" use:enhance>
        <TermsCheckboxes terms={data.terms} />
        <Button type="submit" class="w-full">Continue</Button>
    </form>
    <EarlyAccessNote />
    <form method="POST" action="?/decline" class="text-center text-sm text-gray-500" onsubmit={event => { if (!confirm("Delete the account? You can join again later.")) event.preventDefault(); }}>
        Not for you? <button type="submit" class="font-medium text-primary-800 hover:text-primary-900">Delete the account Google created</button>
    </form>
</main>
