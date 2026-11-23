<script lang="ts">
    import { faGears, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
    import AppShell from '$lib/components/shell/AppShell.svelte';
    import { bandAppUrl } from '$lib/misc';
    import { can } from '$lib/permissions';

    let { data, children } = $props();
    let items = $derived([
        { name: "Your profile", path: "/me", icon: faUser },
        ...data.bands.map(band => ({ name: band.name, path: bandAppUrl(band.handle), icon: faUsers })),
        ...(can(data.brontoSession, 'herd.admin') ? [{ name: "Herd admin", path: "/admin", icon: faGears }] : []),
    ]);
</script>

<AppShell {items} home="/me">
    {@render children()}
</AppShell>
