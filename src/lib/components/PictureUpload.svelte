<script lang="ts">
    // Uploads a picture to a form action: the file is sent as `picture`; a refused one returns fail(status, { error })
    import { enhance } from '$app/forms';
    import { Button } from 'flowbite-svelte';
    import FormStatus, { type Status } from './FormStatus.svelte';

    let { action, label, hint }: { action: string, label: string, hint: string } = $props();
    let input: HTMLInputElement;
    let status = $state<Status | null>(null);
</script>

<form method="POST" {action} enctype="multipart/form-data" class="flex flex-col gap-1" use:enhance={() => {
    status = { state: 'busy', message: 'Uploading…' };
    return async ({ result, update }) => {
        await update();
        status = result.type == 'failure' ? { state: 'failed', message: `Not saved: ${result.data?.error}` } : null;
    };
}}>
    <input bind:this={input} type="file" name="picture" accept="image/png,image/jpeg,image/webp" class="hidden"
        onchange={() => input.form?.requestSubmit()} />
    <Button type="button" size="xs" color="light" class="w-fit" onclick={() => input.click()}>{label}</Button>
    <span class="text-[13px] text-gray-500">{hint}</span>
    <FormStatus {status} />
</form>
