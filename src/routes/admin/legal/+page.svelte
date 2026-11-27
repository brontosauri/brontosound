<script lang="ts">
    import SaveForm from '$lib/components/settings/SaveForm.svelte';
    import SettingField from '$lib/components/settings/SettingField.svelte';
    import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
    import LegalDraft from './LegalDraft.svelte';

    let { data } = $props();
</script>

<div class="max-w-3xl space-y-6">
    {#each data.documents as view (view.document)}
        <LegalDraft {view} noticeDays={data.noticeDays} recipients={data.recipients} />
    {/each}
    <SettingsCard title="Sign-up">
        <SaveForm action="?/saveSettings">
            {#each data.settings as entry (entry.key)}
                <SettingField {entry} editable />
            {/each}
        </SaveForm>
    </SettingsCard>
</div>
