<script lang="ts">
    // A person's picture, or their initials
    let { name, src, size = 'md' }: { name: string, src?: string | null, size?: 'sm' | 'md' | 'lg' } = $props();
    const sizes = { sm: 'h-8 w-8 text-[13px]', md: 'h-16 w-16 text-xl', lg: 'h-28 w-28 text-4xl' };
    let initials = $derived(name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join(''));
</script>

{#if src}
    <img {src} alt="" class="{sizes[size]} shrink-0 rounded-full object-cover" />
{:else}
    <span class="{sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-900" aria-hidden="true">{initials}</span>
{/if}
