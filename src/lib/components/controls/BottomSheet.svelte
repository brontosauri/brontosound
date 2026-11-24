<script lang="ts">
    import type { Snippet } from 'svelte';
    import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';

    /**
     * A panel over the page from the bottom of a phone screen, as tall as its content.
     * The chevron, a swipe down, Escape or the backdrop close it; `corner` goes beside the chevron, on the right.
     */
    let { label, onClose, corner, children }: { label: string, onClose: () => void, corner?: Snippet, children: Snippet } = $props();

    let swipeFrom: number | null = null;

    $effect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    });

    function swipeStart(event: PointerEvent & { currentTarget: HTMLElement }) {
        swipeFrom = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function swipeEnd(event: PointerEvent) {
        if (swipeFrom !== null && event.clientY - swipeFrom > 60) onClose();
        swipeFrom = null;
    }
</script>

<svelte:window onkeydown={event => event.key == 'Escape' && onClose()} />

<div class="fixed inset-0 z-40">
    <button type="button" class="absolute inset-0 cursor-default bg-gray-900/45" aria-label="Close {label.toLowerCase()}" tabindex="-1" onclick={onClose}></button>
    <div role="dialog" aria-modal="true" aria-label={label}
        class="absolute inset-x-0 bottom-0 flex max-h-[calc(100%-2.5rem)] flex-col overflow-y-auto rounded-t-xl bg-white px-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <div class="relative flex shrink-0 justify-center">
            <button type="button" aria-label="Close {label.toLowerCase()}" class="flex h-10 w-16 touch-none items-center justify-center text-gray-500"
                onclick={onClose} onpointerdown={swipeStart} onpointerup={swipeEnd} onpointercancel={() => swipeFrom = null}>
                <Fa icon={faChevronDown} />
            </button>
            {#if corner}<div class="absolute -right-3.5 top-0">{@render corner()}</div>{/if}
        </div>
        {@render children()}
    </div>
</div>
