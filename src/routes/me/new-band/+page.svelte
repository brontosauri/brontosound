<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    import { enhance } from "$app/forms";
    import { Alert, Button, Input, Label } from "flowbite-svelte";
    import slugify from "slugify";

    let { form } = $props();
    // Kept when creating fails: the enhanced form isn't reset then
    let name = $state('');
    let handle = $state('');
    let handleEdited = $state(false);
    // Suggested from the name until edited
    $effect(() => {
        if (!handleEdited) handle = slugify(name, { lower: true, strict: true }).slice(0, 30);
    });
</script>

<form method="POST" class="max-w-xl space-y-6" use:enhance>
    <p class="text-gray-700">You'll be its owner. Next, you invite the members.</p>
    {#if form?.error}
        <Alert color="red">{form.error}</Alert>
    {/if}
    <Label>Band name
        <Input name="name" class="mt-2" bind:value={name} maxlength={100} required />
    </Label>
    <Label>Handle
        <div class="mt-2 flex">
            <span class="inline-flex items-center rounded-s-lg border border-e-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-700">@</span>
            <Input name="handle" class="rounded-s-none" autocomplete="off" {...verbatim} bind:value={handle} oninput={() => handleEdited = true} maxlength={30} required />
        </div>
        <p class="mt-2 text-sm font-normal text-gray-500">The band's address, /@{handle || 'handle'}. People and bands share these names, and a handle is permanent.</p>
    </Label>
    <p class="text-sm text-gray-700">Its songs go in herd storage, on this herd's server.</p>
    <Button type="submit">Create band</Button>
</form>
