<script lang="ts" module>
    export type JoiningBandInfo = { name: string, handle: string, logo: string | null, invitedBy: string | null, role: string };
</script>

<script lang="ts">
    // The band an invite link joins, on the pages it leads to: in full (who invited, the role), or as a reminder
    import { Badge } from "flowbite-svelte";
    import BandLogo from "./BandLogo.svelte";

    let { band, full = false }: { band: JoiningBandInfo, full?: boolean } = $props();
</script>

<div class="space-y-4 rounded-lg border border-gray-200 bg-white {full ? 'p-6' : 'p-4'}">
    <div class="flex items-center gap-4">
        <BandLogo src={band.logo} size={full ? 'md' : 'sm'} />
        {#if full}
            <div>
                <p class="text-[22px] font-bold leading-tight text-gray-900">{band.name}</p>
                <p class="text-[13px] text-gray-500">@{band.handle}</p>
            </div>
        {:else}
            <div>
                <p class="text-sm text-gray-600">You're joining</p>
                <p class="text-lg font-bold text-gray-900">{band.name} <Badge class="ms-1 align-middle">{band.role}</Badge></p>
            </div>
        {/if}
    </div>
    {#if full}
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-gray-200 pt-4 text-sm">
            {#if band.invitedBy}<dt class="text-gray-500">Invited by</dt><dd class="text-gray-900">{band.invitedBy}</dd>{/if}
            <dt class="text-gray-500">Role</dt><dd><Badge>{band.role}</Badge></dd>
        </dl>
    {/if}
</div>
