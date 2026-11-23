<script lang="ts">
    // A link for someone to pass on, shown once: what it does, then the link and a copy button
    import type { Snippet } from "svelte";
    import { Button, Input } from "flowbite-svelte";

    let { url, children }: { url: string, children: Snippet } = $props();
    let copied = $state(false);
</script>

<div class="space-y-2 rounded-lg border border-primary-300 bg-primary-50 p-4">
    <p class="text-sm text-gray-900">{@render children()}</p>
    <div class="flex gap-2">
        <Input readonly value={url} class="font-mono text-sm" />
        <Button color="light" onclick={() => navigator.clipboard.writeText(url).then(() => copied = true)}>{copied ? 'Copied' : 'Copy'}</Button>
    </div>
</div>
