<script lang="ts">
    import { verbatim } from '$lib/verbatim';
    // What a herd admin can do to one user
    import { enhance } from "$app/forms";
    import { Button, Input, Select } from "flowbite-svelte";
    import { HerdRole } from "$lib/dbEntities/user";
    import type { UserListItem } from "$lib/server/userAdmin";

    let { user }: { user: UserListItem } = $props();
    const roles = Object.values(HerdRole).map(role => ({ value: role, name: role }));
    const confirmed = (question: string) => ({ cancel }: { cancel: () => void }) => { if (!confirm(question)) cancel(); };
</script>

<div class="flex flex-wrap items-end gap-6 py-2">
    {#if user.suspended}
        <p class="w-full text-sm text-gray-700">Suspended: {user.suspensionReason ?? 'no reason given'}</p>
    {:else}
        <form method="POST" action="?/suspend" class="flex items-end gap-2" use:enhance>
            <input type="hidden" name="user" value={user.id} />
            <label class="text-sm font-medium text-gray-900">Why suspend
                <Input name="reason" size="sm" class="mt-1 w-64" maxlength={500} placeholder="Spam in your public profile" required />
            </label>
            <Button type="submit" size="xs" color="light">Suspend</Button>
        </form>
    {/if}
    <form method="POST" action="?/setHerdRole" class="flex items-end gap-2" use:enhance>
        <input type="hidden" name="user" value={user.id} />
        <label class="text-sm font-medium text-gray-900">Herd role
            <Select name="herdRole" size="sm" class="mt-1 w-28" items={roles} value={user.herdRole} placeholder="" />
        </label>
        <Button type="submit" size="xs" color="light">Save</Button>
    </form>
    <form method="POST" action="?/rename" class="flex items-end gap-2" use:enhance>
        <input type="hidden" name="user" value={user.id} />
        <label class="text-sm font-medium text-gray-900">Handle
            <Input name="handle" size="sm" class="mt-1 w-40" autocomplete="off" {...verbatim} value={user.handle ?? ''} placeholder="They pick it" required />
        </label>
        <Button type="submit" size="xs" color="light">{user.handle ? 'Rename' : 'Set'}</Button>
    </form>
    <div class="flex flex-wrap gap-2">
        <form method="POST" action="?/passwordLink" use:enhance>
            <input type="hidden" name="user" value={user.id} />
            <input type="hidden" name="name" value={user.name} />
            <Button type="submit" size="xs" color="light">Password link</Button>
        </form>
        {#if user.signInMethods.includes('two-step')}
            <form method="POST" action="?/resetTwoStep" use:enhance={confirmed(`Turn off two-step verification for ${user.name}? They sign in with their password alone, then set it up again.`)}>
                <input type="hidden" name="user" value={user.id} />
                <Button type="submit" size="xs" color="light">Reset two-step</Button>
            </form>
        {/if}
        {#if user.suspended}
            <form method="POST" action="?/restore" use:enhance>
                <input type="hidden" name="user" value={user.id} />
                <Button type="submit" size="xs" color="light">Restore</Button>
            </form>
        {/if}

        <form method="POST" action="?/remove" use:enhance={confirmed(`Remove ${user.name}? They leave their bands, and their name, email and profile are erased; what they added stays with their bands, signed "Former member". This can't be undone.`)}>
            <input type="hidden" name="user" value={user.id} />
            <Button type="submit" size="xs" color="red" outline>Remove</Button>
        </form>
    </div>
</div>
