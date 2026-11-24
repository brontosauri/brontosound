<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    // Invites someone in the herd: they find it in their profile
    import { enhance } from "$app/forms";
    import { Badge, Button, Input, Label, Select } from "flowbite-svelte";
    import { BandRole } from "$lib/dbEntities/band";

    let { full }: { full: boolean } = $props();
    const roles = Object.values(BandRole).map(role => ({ value: role, name: role }));
</script>

<section class="space-y-4 rounded-lg border border-gray-200 p-6">
    <h2 class="text-xl font-bold text-gray-900">Invite by handle</h2>
    {#if full}
        <Badge color="dark">No seats left</Badge>
    {:else}
        <form method="POST" action="?/invite" class="flex flex-wrap items-end gap-4" use:enhance>
            <Label class="flex-[1_1_160px]">Handle<Input name="handle" class="mt-2" placeholder="@marta" autocomplete="off" {...verbatim} required /></Label>
            <Label class="w-32">Role<Select name="role" class="mt-2" items={roles} value={BandRole.EDITOR} placeholder="" /></Label>
            <Button type="submit">Invite</Button>
        </form>
    {/if}
</section>
