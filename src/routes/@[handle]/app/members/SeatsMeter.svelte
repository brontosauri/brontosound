<script lang="ts">
    // The band's seats taken, of its limit
    let { taken, limit }: { taken: number, limit: number } = $props();
    const percent = $derived(limit ? Math.min(100, Math.round(taken / limit * 100)) : 100);
</script>

<div class="flex items-center gap-3 text-sm text-gray-600">
    <div class="h-2 w-40 overflow-hidden rounded-full bg-gray-200" role="img" aria-label="{taken} of {limit} seats taken">
        <span class="block h-full bg-primary-700" style:width="{percent}%"></span>
    </div>
    <span><strong class="text-gray-900">{taken} / {limit}</strong> seats</span>
</div>
