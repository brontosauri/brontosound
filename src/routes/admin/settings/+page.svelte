<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    import { enhance } from "$app/forms";
    import { Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow } from "flowbite-svelte";
    import SaveForm from "$lib/components/settings/SaveForm.svelte";
    import SettingField from "$lib/components/settings/SettingField.svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
    import SmtpTest from "./SmtpTest.svelte";

    let { data, form } = $props();
</script>

<p class="mb-6 text-gray-700">For the whole herd. Changes apply right away; saved secrets are never shown again.</p>

<div class="max-w-3xl space-y-6">
    {#each data.sections as section (section.id)}
        <SettingsCard title={section.title}>
            {#if section.hint}
                <p class="text-sm text-gray-500">{section.hint}</p>
            {/if}
            <SaveForm action="?/save">
                <input type="hidden" name="section" value={section.id} />
                {#each section.entries as entry}
                    <SettingField {entry} editable />
                {/each}
                {#if section.id == 'email'}
                    <SmtpTest to={data.testEmailTo} {form} />
                {/if}
            </SaveForm>
        </SettingsCard>
    {/each}

    <SettingsCard title="Soundfonts by address">
        <p class="text-sm text-gray-700">Besides the folders in data/soundfonts. Every browser that plays a MIDI file fetches from the address, which must allow CORS.</p>
        {#if data.soundfonts.length > 0}
            <Table>
                <TableBody>
                    {#each data.soundfonts as soundfont (soundfont.name)}
                        <TableBodyRow>
                            <TableBodyCell>{soundfont.name}</TableBodyCell>
                            <TableBodyCell class="font-mono font-normal text-gray-700">{soundfont.url}</TableBodyCell>
                            <TableBodyCell class="w-px">
                                <form method="POST" action="?/removeSoundfont" use:enhance>
                                    <input type="hidden" name="name" value={soundfont.name} />
                                    <Button type="submit" size="xs" color="red" outline>Remove</Button>
                                </form>
                            </TableBodyCell>
                        </TableBodyRow>
                    {/each}
                </TableBody>
            </Table>
        {/if}
        <SaveForm action="?/addSoundfont" label="Add soundfont" done="Added">
            <div class="grid gap-4 md:grid-cols-[1fr_2fr]">
                <Label>Name<Input name="name" class="mt-2" placeholder="Upright piano" required /></Label>
                <Label>Address<Input name="url" type="url" class="mt-2" {...verbatim} placeholder="https://fonts.example/upright/" required /></Label>
            </div>
        </SaveForm>
    </SettingsCard>
</div>
