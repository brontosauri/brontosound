<script lang="ts">
    import { formatDate } from '$lib/dates';
    import { enhance } from "$app/forms";
    import { Button } from "flowbite-svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";

    let { links }: { links: { id: number, creationDate?: Date, bandName: string }[] } = $props();
</script>

<SettingsCard title="Backline">
    <p class="text-sm text-gray-700">
        A linked Backline shares its Live page at <a href="/backline" class="underline">/backline</a>.
        To link one, enter this site's address in Backline, under Settings → Sharing.
    </p>

    {#each links as link}
        <form method="POST" action="?/unlinkBackline" class="flex items-center justify-between" use:enhance>
            <input type="hidden" name="id" value={link.id} />
            <span>Plays for {link.bandName}, linked on {formatDate(link.creationDate)}</span>
            <Button type="submit" color="light" size="xs">Unlink</Button>
        </form>
    {/each}
</SettingsCard>
