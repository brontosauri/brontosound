<script lang="ts">
    // Publishing a change, inside its draft's form: how to announce it (a banner, an email), then a last look
    import { page } from '$app/state';
    import { Button, Checkbox, Label, Textarea } from 'flowbite-svelte';
    import { formatDate } from '$lib/dates';
    import { changeEmailText, changeSubject, LEGAL_TITLES, type LegalDocumentId } from '$lib/legal';

    let { document, form, recipients, busy, oncancel }: {
        document: LegalDocumentId,
        form: HTMLFormElement, // the draft's, read for its date and changelog
        recipients: number | null, // null: no outgoing email
        busy: boolean,
        oncancel: () => void,
    } = $props();

    const herdName: string = page.data.herdName;
    const draft = (field: string) => String(new FormData(form).get(field)).trim();

    /** The email as first shown, from the draft's date and changelog */
    function draftEmail(): string {
        const date = draft('effectiveDate');
        return changeEmailText({ herdName, document, date: new Date(date).toLocaleDateString(page.data.locale, { dateStyle: 'long' }), changelog: draft('changelog'), url: `${page.url.origin}/${document}/${date}` });
    }

    let confirming = $state(false);
    let date = $state('');
    let banner = $state(true);
    let email = $state(false);
    let emailText = $state(draftEmail());

    function confirm() {
        date = draft('effectiveDate');
        confirming = true;
    }
</script>

<div class="space-y-4 rounded-lg border border-gray-200 p-4">
    <div class="space-y-4" class:hidden={confirming}>
        <Checkbox name="banner" bind:checked={banner}>Show a banner in the app until it takes effect</Checkbox>
        <div>
            <Checkbox name="email" bind:checked={email} disabled={recipients == null}>Email everyone</Checkbox>
            {#if recipients == null}<p class="mt-1 text-[13px] text-gray-500">Needs outgoing email, in Herd settings.</p>{/if}
        </div>
        {#if email}
            <Label>Email
                <Textarea name="emailText" rows={10} class="mt-2 text-sm" bind:value={emailText} required />
            </Label>
        {/if}
        <div class="flex flex-wrap gap-4">
            <Button type="button" onclick={confirm}>Next</Button>
            <Button type="button" color="alternative" onclick={oncancel}>Cancel</Button>
        </div>
    </div>
    {#if confirming}
        <p class="text-gray-900">Publish the {LEGAL_TITLES[document]}, in force on {formatDate(date)}?</p>
        <ul class="list-disc space-y-1 ps-5 text-sm text-gray-700">
            <li>{banner ? 'A banner for everyone signed in, until then.' : 'No banner.'}</li>
            <li>{email ? `An email to ${recipients} ${recipients == 1 ? 'person' : 'people'}:` : 'No email.'}</li>
        </ul>
        {#if email}
            <div class="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
                <p class="font-medium text-gray-900">{changeSubject(herdName, document)}</p>
                <p class="whitespace-pre-wrap text-gray-700">{emailText}</p>
            </div>
        {/if}
        <div class="flex flex-wrap gap-4">
            <Button type="submit" formaction="?/publish" disabled={busy}>Publish</Button>
            <Button type="button" color="alternative" onclick={() => confirming = false}>Back</Button>
        </div>
    {/if}
</div>
