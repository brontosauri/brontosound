<script lang="ts">
    // A destructive action's confirmation, in place: Cancel, and the only solid red button, which posts `action`
    import type { Snippet } from 'svelte';
    import { enhance } from '$app/forms';
    import { Button } from 'flowbite-svelte';

    let { action, fields = {}, confirm, onCancel, children }: {
        action: string,
        fields?: Record<string, string | number>,
        confirm: string,
        onCancel: () => void,
        children: Snippet,
    } = $props();
</script>

<form method="POST" {action} use:enhance role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-gray-900">
    {#each Object.entries(fields) as [name, value]}<input type="hidden" {name} {value} />{/each}
    <span>{@render children()}</span>
    <span class="flex gap-2">
        <Button size="xs" color="light" onclick={onCancel}>Cancel</Button>
        <Button type="submit" size="xs" color="red">{confirm}</Button>
    </span>
</form>
