<script lang="ts">
    import { faArrowLeft, faGauge, faGears, faScaleBalanced, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
    import AppShell from '$lib/components/shell/AppShell.svelte';

    let { children } = $props();
    const items = [
        { name: "Overview", path: "/admin", icon: faGauge },
        { name: "Users", path: "/admin/users", icon: faUser },
        { name: "Bands", path: "/admin/bands", icon: faUsers },
        { name: "Quotas", path: "/admin/quotas", icon: faScaleBalanced },
        { name: "Herd settings", path: "/admin/settings", icon: faGears },
        { name: "Back to your bands", path: "/me", icon: faArrowLeft },
    ];
</script>

<AppShell {items} home="/admin">
    {@render children()}
</AppShell>
