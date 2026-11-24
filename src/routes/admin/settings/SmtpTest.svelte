<script lang="ts">
    // Tests the outgoing email fields of the settings form around it, as they are: saved or not
    import { Button, Input, Label } from "flowbite-svelte";
    import FormStatus from "$lib/components/FormStatus.svelte";
    import type { ActionData } from "./$types";

    let { to, form }: { to: string, form: ActionData } = $props();
    const status = $derived(
        form?.smtpError ? { state: 'failed' as const, message: form.smtpError }
        : form && 'smtpWorks' in form ? { state: 'done' as const, message: `It works: ${form.emailed ? `sent a test email to ${form.emailed}` : 'connected and signed in'}. Save to keep these values.` }
        : null);
</script>

<div class="space-y-3 rounded-lg bg-gray-50 p-4">
    <div class="flex flex-wrap items-end gap-4">
        <Label class="flex-1">Send a test email to<Input name="testEmailTo" type="email" autocomplete="email" class="mt-1" value={to} placeholder="Optional: blank only connects" /></Label>
        <Button type="submit" color="light" formaction="?/testEmail" formnovalidate>Test connection</Button>
    </div>
    {#if status}<FormStatus {status} />{/if}
</div>
