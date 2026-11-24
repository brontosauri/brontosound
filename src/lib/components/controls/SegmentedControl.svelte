<script lang="ts" generics="T extends string">
    /** A labelled choice of one among a few, side by side, like Snap to */
    let { label, options, value = $bindable(), class: className = '' }: {
        label: string,
        options: { value: T, name: string }[],
        value: T,
        class?: string, // layout of the label and the control
    } = $props();
</script>

<div role="group" aria-label={label} class="flex items-center gap-2 {className}">
    <span class="text-base text-gray-700 md:text-sm md:text-gray-500">{label}</span>
    <div class="flex h-11 min-w-[190px] overflow-hidden rounded-lg border border-gray-300 md:h-9 md:min-w-0">
        {#each options as option, i}
            {@const on = option.value == value}
            <button type="button" aria-pressed={on} onclick={() => value = option.value}
                class="flex-1 px-1 text-sm font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary-300 md:px-3.5 md:text-[13px]
                    {i ? 'border-l border-gray-300' : ''} {on ? 'bg-primary-100 text-primary-900' : 'bg-white text-gray-900 hover:bg-gray-50'}">{option.name}</button>
        {/each}
    </div>
</div>
