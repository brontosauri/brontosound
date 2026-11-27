<script lang="ts">
    // A legal text's Markdown, as a long read: headings, lists and tables
    import Markdown from '$lib/components/Markdown.svelte';

    let { text }: { text: string } = $props();
</script>

<div class="legal space-y-4 text-gray-700">
    <Markdown source={text} />
</div>

<style>
    .legal :global(h2) { padding-top: 16px; font-size: 22px; line-height: 1.3; font-weight: 700; color: #111827; }
    .legal :global(h3) { font-size: 18px; font-weight: 700; color: #111827; }
    .legal :global(ul) { list-style: disc; padding-left: 22px; }
    .legal :global(ol) { list-style: decimal; padding-left: 22px; }
    .legal :global(li) { margin: 6px 0; }
    .legal :global(a) { color: #cc4522; text-decoration: underline; } /* primary-800 */
    .legal :global(code) { font-family: 'Ubuntu Mono', ui-monospace, monospace; }
    .legal :global(table) { display: block; overflow-x: auto; border-collapse: collapse; font-size: 14px; }
    .legal :global(th) { text-align: left; font-weight: 500; color: #111827; }
    .legal :global(th), .legal :global(td) { border-bottom: 1px solid #e5e7eb; padding: 8px 12px 8px 0; vertical-align: top; }
</style>
