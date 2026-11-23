<script lang="ts">
    // A limit: a number in its unit, or no limit
    import { Checkbox, Input } from 'flowbite-svelte';
    import type { Limit } from '$lib/quotas';

    let { name, unit, limit }: { name: string, unit: string, limit: Limit } = $props();
    let noLimit = $state(false);
    $effect.pre(() => { noLimit = limit === null; });
</script>

<div class="flex flex-wrap items-center gap-4">
    <span class="flex items-center gap-2">
        <Input class="w-28" type="number" min={0} {name} value={limit ?? ''} disabled={noLimit} required={!noLimit} />
        <span class="text-sm text-gray-700">{unit}</span>
    </span>
    <Checkbox name="{name}NoLimit" bind:checked={noLimit}>No limit</Checkbox>
</div>
