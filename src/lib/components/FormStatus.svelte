<script lang="ts" module>
    export type Status = { state: 'done' | 'failed' | 'busy', message: string };
</script>

<script lang="ts">
    // What became of a form, beside its button: done, refused, or under way
    import { CheckCircleOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

    let { status }: { status: Status | null } = $props();
    const colors = { done: 'text-green-700', failed: 'text-red-700', busy: 'text-gray-500' };
</script>

<span role="status" class="flex items-center gap-1.5 text-sm font-medium {status ? colors[status.state] : ''}">
    {#if status?.state == 'done'}
        <CheckCircleOutline class="h-5 w-5 shrink-0" />
    {:else if status?.state == 'failed'}
        <ExclamationCircleOutline class="h-5 w-5 shrink-0" />
    {/if}
    {status?.message ?? ''}
</span>
