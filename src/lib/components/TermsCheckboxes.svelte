<script lang="ts">
    // Accepting the herd's Terms (legal/acceptance.ts): unticked, and required; the herd's own clause too, if it has one
    import { Checkbox } from "flowbite-svelte";

    let { terms }: { terms: { minimumAge: number, consent: string } } = $props();
    const link = "font-medium text-primary-800 underline hover:text-primary-900";
</script>

<Checkbox name="terms" required class="items-start">
    <span>I'm at least {terms.minimumAge} and accept the <a href="/terms" target="_blank" class={link}>Terms</a>. I've read the <a href="/privacy" target="_blank" class={link}>Privacy Policy</a>.</span>
</Checkbox>
{#if terms.consent}
    <Checkbox name="consent" required class="items-start"><span>{terms.consent}</span></Checkbox>
{/if}
