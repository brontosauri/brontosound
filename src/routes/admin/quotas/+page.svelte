<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    import { formatDate } from '$lib/dates';
    import { enhance } from "$app/forms";
    import { Badge, Button, Input, Label, Select, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { formatLimit, QUOTA_KEYS, QUOTAS } from "$lib/quotas";
    import LimitField from "./LimitField.svelte";
    import SaveForm from "$lib/components/settings/SaveForm.svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";

    let { data } = $props();
    let key = $state(QUOTA_KEYS[1]);
    const quotaOptions = QUOTA_KEYS.map(key => ({ value: key, name: QUOTAS[key].label }));
</script>

<p class="mb-6 text-gray-700">Herd defaults apply to everyone. Override them for one person or one band.</p>

<div class="max-w-3xl space-y-6">
    <SettingsCard title="Herd defaults">
        <SaveForm action="?/saveDefaults">
            {#each QUOTA_KEYS as quota}
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p class="text-sm font-medium text-gray-900">{QUOTAS[quota].label}</p>
                        <p class="text-[13px] text-gray-500">{QUOTAS[quota].hint}</p>
                    </div>
                    <LimitField name={quota} unit={QUOTAS[quota].unit} limit={data.defaults[quota]} />
                </div>
            {/each}
        </SaveForm>
    </SettingsCard>

    <SettingsCard title="Overrides">
        {#if data.overrides.length == 0}
            <p class="text-sm text-gray-700">None: everyone has the herd's defaults.</p>
        {:else}
            <Table>
                <TableHead>
                    <TableHeadCell>For</TableHeadCell>
                    <TableHeadCell>Quota</TableHeadCell>
                    <TableHeadCell>Default</TableHeadCell>
                    <TableHeadCell>Override</TableHeadCell>
                    <TableHeadCell>Why</TableHeadCell>
                    <TableHeadCell>Set by</TableHeadCell>
                    <TableHeadCell class="w-px"><span class="sr-only">Actions</span></TableHeadCell>
                </TableHead>
                <TableBody>
                    {#each data.overrides as row}
                        <TableBodyRow>
                            <TableBodyCell>{row.name}<Badge class="ms-2" color="none">{row.kind == 'user' ? 'Person' : 'Band'}</Badge></TableBodyCell>
                            <TableBodyCell class="font-normal">{QUOTAS[row.key].label}</TableBodyCell>
                            <TableBodyCell class="font-normal">{formatLimit(row.key, data.defaults[row.key])}</TableBodyCell>
                            <TableBodyCell>{formatLimit(row.key, row.override.limit)}</TableBodyCell>
                            <TableBodyCell class="font-normal">{row.override.reason}</TableBodyCell>
                            <TableBodyCell class="font-normal">{row.override.setBy}, {formatDate(row.override.date)}</TableBodyCell>
                            <TableBodyCell>
                                <form method="POST" action="?/removeOverride" use:enhance>
                                    <input type="hidden" name="kind" value={row.kind} />
                                    <input type="hidden" name="id" value={row.id} />
                                    <input type="hidden" name="key" value={row.key} />
                                    <Button type="submit" size="xs" color="red" outline>Remove</Button>
                                </form>
                            </TableBodyCell>
                        </TableBodyRow>
                    {/each}
                </TableBody>
            </Table>
        {/if}

        <h3 class="pt-4 text-lg font-bold text-gray-900">Add an override</h3>
        <SaveForm action="?/addOverride" label="Add override" done="Added">
            <div class="grid gap-4 md:grid-cols-2">
                <Label>For<Input name="handle" class="mt-2" autocomplete="off" {...verbatim} placeholder={QUOTAS[key].for == 'user' ? '@marta' : '@tar-pit-trio'} required /></Label>
                <Label>Quota<Select name="key" class="mt-2" items={quotaOptions} bind:value={key} placeholder="" /></Label>
            </div>
            <div><p class="mb-2 text-sm font-medium text-gray-900">New limit</p><LimitField name="limit" unit={QUOTAS[key].unit} limit={data.defaults[key]} /></div>
            <Label>Why<Input name="reason" class="mt-2" placeholder="Optional" /></Label>
            <p class="text-[13px] text-gray-500">Lowering storage below what a band uses blocks new uploads; nothing is deleted.</p>
        </SaveForm>
    </SettingsCard>
</div>
