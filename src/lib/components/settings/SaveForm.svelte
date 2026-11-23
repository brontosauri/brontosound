<script lang="ts">
    // A form that saves, saying beside its button whether it did. A failed save returns fail(status, { error }).
    // After a save its fields are drawn again, with the saved values; a refused one keeps what's typed, to fix.
    // Other buttons in it with their own formaction (a connection test) leave both alone.
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import type { Snippet } from 'svelte';
    import { Button } from 'flowbite-svelte';
    import FormStatus, { type Status } from '../FormStatus.svelte';

    let { action, label = 'Save', done = 'Saved', canSave = true, children }: {
        action: string,
        label?: string,
        done?: string, // what a successful save says
        canSave?: boolean, // false: read-only, no button
        children: Snippet,
    } = $props();

    let status = $state<Status | null>(null);
    let saves = $state(0);

    const save: SubmitFunction = ({ submitter }) => {
        if (submitter?.hasAttribute('formaction')) return ({ update }) => update({ reset: false, invalidateAll: false });
        status = { state: 'busy', message: 'Saving…' };
        return async ({ result, update }) => {
            await update({ reset: false });
            status = result.type == 'success' ? { state: 'done', message: done }
                : result.type == 'failure' ? { state: 'failed', message: `Not saved: ${result.data?.error ?? 'try again.'}` }
                : null;
            if (result.type == 'success') saves++;
        };
    };
</script>

<form method="POST" {action} class="space-y-4" use:enhance={save} oninput={() => { if (status?.state == 'done') status = null; }}>
    {#key saves}{@render children()}{/key}
    {#if canSave}
        <div class="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={status?.state == 'busy'}>{label}</Button>
            <FormStatus {status} />
        </div>
    {/if}
</form>
