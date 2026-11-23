<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button, Input, Label } from "flowbite-svelte";
    import FormStatus from "$lib/components/FormStatus.svelte";

    let { error }: { error?: string } = $props();
</script>

<form method="POST" action="?/deleteAccount" class="space-y-4 border-t border-gray-200 pt-6" use:enhance>
    <h2 class="text-xl font-bold text-gray-900">Delete your account</h2>
    <p class="text-sm text-gray-700">You leave your bands and your handle is freed. What you added to a band stays with it. This can't be undone.</p>
    <div class="flex flex-wrap items-end gap-4">
        <Label>Type "delete" to confirm<Input name="confirmation" class="mt-2 w-48" required /></Label>
        <Button type="submit" color="red">Delete account</Button>
        {#if error}<FormStatus status={{ state: 'failed', message: error }} />{/if}
    </div>
</form>
