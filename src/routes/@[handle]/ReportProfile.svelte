<script lang="ts">
    import { enhance } from '$app/forms';
    import { Alert, Button, Input, Label } from 'flowbite-svelte';
    import { page } from '$app/state';

    let { form, signedIn }: { form: { reported?: boolean, error?: string } | null, signedIn: boolean } = $props();
</script>

<section class="max-w-xl space-y-3 rounded-lg border border-gray-200 p-5">
    <h2 class="text-lg font-bold text-gray-900">Report this profile</h2>
    {#if form?.reported}
        <Alert color="green">Thanks: the herd's admins will look at it.</Alert>
    {:else if !signedIn}
        <p class="text-sm text-gray-700"><a href="/signin?redirectTo={encodeURIComponent(page.url.pathname)}" class="font-medium text-primary-800">Sign in</a> to tell the herd's admins what's wrong.</p>
    {:else}
        <form method="POST" action="?/report" class="space-y-3" use:enhance>
            <Label>What breaks the herd's rules?<Input name="reason" class="mt-2" maxlength={500} required /></Label>
            <Button type="submit" color="light">Send report</Button>
        </form>
    {/if}
</section>
