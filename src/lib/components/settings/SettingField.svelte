<script lang="ts">
    import { Input, Label, Select, Textarea, Toggle } from 'flowbite-svelte';
    import type { SettingEntry } from './settingEntries';

    /** A setting: a field named by its key, or read-only */
    let { entry, editable = false }: { entry: SettingEntry, editable?: boolean } = $props();
    const disabled = $derived(!editable);
</script>

{#snippet hint()}
    {#if entry.hint}<p class="mt-1 text-[13px] font-normal text-gray-500">{entry.hint}</p>{/if}
{/snippet}

{#if entry.kind === 'toggle'}
    <div>
        <Toggle name={entry.key} checked={entry.value} {disabled}>{entry.label}</Toggle>
        {@render hint()}
    </div>
{:else}
    <Label>
        {entry.label}
        {#if entry.kind === 'choice'}
            <Select class="mt-1" name={entry.key} items={entry.options} value={entry.value} placeholder="" {disabled} />
        {:else if entry.kind === 'secret'}
            <Input class="mt-1" name={entry.key} type="password" autocomplete="off" {disabled}
                placeholder={entry.isSet ? 'Set: type to replace it' : 'Not set'} />
        {:else if entry.kind === 'lines'}
            <Textarea class="mt-1" name={entry.key} rows={3} value={entry.value.join('\n')} {disabled} />
        {:else if entry.kind === 'number'}
            <Input class="mt-1 w-32" name={entry.key} type="number" min={0} value={entry.value} {disabled} />
        {:else}
            <Input class="mt-1" name={entry.key} value={entry.value} placeholder={entry.placeholder ?? (editable ? 'Optional' : 'Not set')} {disabled} />
        {/if}
        {@render hint()}
    </Label>
{/if}
