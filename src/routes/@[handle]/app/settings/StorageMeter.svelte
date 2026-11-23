<script lang="ts">
    // How much of its herd storage a band uses
    let { used, limit }: { used: number, limit: number | null } = $props();
    const GB = 1024 ** 3;
    const gb = (bytes: number) => `${(bytes / GB).toFixed(bytes < GB ? 2 : 1)} GB`;
    let share = $derived(limit ? Math.min(1, used / limit) : 0);
</script>

<div class="space-y-1">
    {#if limit !== null}
        <div class="h-2 overflow-hidden rounded bg-gray-200"><span class="block h-full {share > 0.9 ? 'bg-red-700' : 'bg-primary-700'}" style="width: {share * 100}%"></span></div>
    {/if}
    <p class="text-sm text-gray-700"><strong>{gb(used)}</strong>{limit === null ? ' used' : ` of ${gb(limit)} used`}</p>
</div>
