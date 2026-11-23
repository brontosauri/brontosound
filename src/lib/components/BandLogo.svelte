<script lang="ts">
    // A band's logo, white on the header's charcoal; the Brontosound mark until it has one
    let { src, size = 'md' }: { src?: string | null, size?: 'sm' | 'md' | 'lg' } = $props();
    const tiles = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-28 w-28' };
    const images = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-20 w-20' };
</script>

<span class="{tiles[size]} flex shrink-0 items-center justify-center rounded-lg bg-charcoal">
    <img src={src ?? '/bronto.png'} alt="" class="{images[size]} object-contain invert" />
</span>
