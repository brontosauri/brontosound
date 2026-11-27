<script lang="ts">
    // A legal text's draft: written by hand or filled from the template, saved, then published with its date.
    // Publishing a change first asks how to announce it
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { Button, Input, Label, Textarea } from 'flowbite-svelte';
    import FormStatus, { type Status } from '$lib/components/FormStatus.svelte';
    import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
    import { formatDate } from '$lib/dates';
    import type { LegalDocumentId } from '$lib/legal';
    import PublishNotice from './PublishNotice.svelte';

    let { view, noticeDays, recipients }: {
        view: { document: LegalDocumentId, title: string, published: string[], hasDraft: boolean, draft: { text: string, changelog: string, effectiveDate: string } },
        noticeDays: number,
        recipients: number | null, // the announcement email's; null: no outgoing email
    } = $props();

    const DONE: Record<string, string> = { '?/saveDraft': 'Draft saved', '?/fillFromTemplate': 'Filled from the template', '?/publish': 'Published', '?/discardDraft': 'Draft discarded' };
    let status = $state<Status | null>(null);
    let redraws = $state(0);
    let announcing = $state(false);
    let form = $state<HTMLFormElement>();

    const submit: SubmitFunction = ({ submitter }) => {
        const action = submitter?.getAttribute('formaction') ?? '?/saveDraft';
        status = { state: 'busy', message: 'Saving…' };
        return async ({ result, update }) => {
            await update({ reset: false });
            status = result.type == 'success' ? (DONE[action] ? { state: 'done', message: DONE[action] } : null)
                : result.type == 'failure' ? { state: 'failed', message: `Not done: ${result.data?.error ?? 'try again.'}` }
                : null;
            if (result.type == 'success' && action == '?/review') announcing = true; // checked: ask how to announce it
            else if (result.type == 'success') { redraws++; announcing = false; }
        };
    };
</script>

<SettingsCard title={view.title}>
    {#snippet aside()}<a href="/{view.document}" class="text-sm font-medium text-primary-800 hover:text-primary-900">Open the public page</a>{/snippet}
    {#if view.published.length}
        <p class="text-sm text-gray-500">Published: {#each view.published as date, i}{i ? ', ' : ''}<a href="/{view.document}/{date}" class="text-primary-800 hover:text-primary-900">{formatDate(date)}</a>{/each}.</p>
    {:else}
        <p class="text-sm text-gray-500">Not published yet: the template shows. Write in its [placeholders], keep only the [if used] items this herd uses, then publish.</p>
    {/if}
    <form method="POST" action="?/saveDraft" class="space-y-4" use:enhance={submit} bind:this={form}>
        <input type="hidden" name="document" value={view.document} />
        {#key redraws}
            <Label>Text, in Markdown
                <Textarea name="text" rows={16} class="mt-2 font-mono text-sm" value={view.draft.text} />
            </Label>
            {#if view.published.length}
                <Label>What changes
                    <Textarea name="changelog" rows={3} class="mt-2" value={view.draft.changelog} placeholder="Clause 9 now covers paid storage." />
                    <p class="mt-1 text-[13px] font-normal text-gray-500">On the new version's page, and in the email if you send one.</p>
                </Label>
            {/if}
            <Label>Takes effect on
                <Input name="effectiveDate" type="date" class="mt-2 w-auto" value={view.draft.effectiveDate} required />
                {#if view.published.length}<p class="mt-1 text-[13px] font-normal text-gray-500">Normally {noticeDays} days from now.</p>{/if}
            </Label>
        {/key}
        {#if announcing}
            <PublishNotice document={view.document} form={form!} {recipients} busy={status?.state == 'busy'} oncancel={() => announcing = false} />
        {:else}
            <div class="flex flex-wrap items-center gap-4">
                {#if view.published.length}
                    <Button type="submit" formaction="?/review" disabled={status?.state == 'busy'}>Publish…</Button>
                {:else}
                    <Button type="submit" formaction="?/publish" disabled={status?.state == 'busy'}>Publish</Button>
                {/if}
                <Button type="submit" formaction="?/saveDraft" color="alternative" disabled={status?.state == 'busy'}>Save draft</Button>
                <Button type="submit" formaction="?/fillFromTemplate" color="alternative" disabled={status?.state == 'busy'}>Replace with the template</Button>
                {#if view.hasDraft}<Button type="submit" formaction="?/discardDraft" color="red" outline disabled={status?.state == 'busy'}>Discard draft</Button>{/if}
            </div>
        {/if}
        <FormStatus {status} />
    </form>
</SettingsCard>
