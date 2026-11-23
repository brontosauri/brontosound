<script lang="ts">
    import { faGears, faHeartPulse, faHome, faMusic, faUsers } from '@fortawesome/free-solid-svg-icons';
    import AppShell from '$lib/components/shell/AppShell.svelte';
    import BandSwitcher from '$lib/components/shell/BandSwitcher.svelte';
    import { bandAppUrl } from '$lib/misc';

    let { data, children } = $props();
    let home = $derived(bandAppUrl(data.band.handle));
    let items = $derived([
        { name: "Home", path: home, icon: faHome },
        { name: "Songbook", path: `${home}/songbook`, icon: faMusic },
        { name: "Live", path: `${home}/live`, icon: faHeartPulse },
        { name: "Members", path: `${home}/members`, icon: faUsers },
        { name: "Settings", path: `${home}/settings`, icon: faGears },
    ]);
</script>

<AppShell {items} {home}>
    <BandSwitcher slot="sidebarTop" band={data.band} bands={data.bands} />
    {@render children()}
</AppShell>
