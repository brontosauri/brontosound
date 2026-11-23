<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button, Input, Label } from "flowbite-svelte";
    import FormStatus from "$lib/components/FormStatus.svelte";
    import SettingsCard from "$lib/components/settings/SettingsCard.svelte";

    /** Two-step verification for password sign-in: set up with an authenticator app, or turn off */
    let { enabled, setup, hasPassword, error }: {
        enabled: boolean,
        setup: { qr: string, secret: string } | null, // while being set up
        hasPassword: boolean, // two-step is for password sign-in
        error?: string,
    } = $props();
</script>

{#snippet codeField(id: string)}
    <div>
        <Label for={id} class="mb-2">Code</Label>
        <Input {id} name="code" inputmode="numeric" autocomplete="one-time-code" pattern={"[0-9]{6}"} maxlength={6} required class="w-32" />
    </div>
{/snippet}

<SettingsCard title="Two-step verification">
    {#if !hasPassword}
        <p class="text-sm text-gray-700">For password sign-in. Google sign-in uses Google's own.</p>
    {:else if enabled}
        <p class="text-sm text-gray-700">On: signing in with your password also asks for a code from your authenticator app.</p>
        <form method="POST" action="?/turnOffTwoStep" class="flex items-end gap-3" use:enhance>
            {@render codeField('twoStepOffCode')}
            <Button type="submit" color="light">Turn off</Button>
        </form>
    {:else if setup}
        <p class="text-sm text-gray-700">Scan this with an authenticator app (Google Authenticator, 1Password, Aegis…) or type in the key, then enter the code it shows. Turning it on signs you out everywhere.</p>
        <img src={setup.qr} alt="QR code for your authenticator app" width="180" height="180" />
        <p class="break-all font-mono text-sm">{setup.secret}</p>
        <div class="flex flex-wrap items-end gap-3">
            <form method="POST" action="?/confirmTwoStep" class="flex items-end gap-3" use:enhance>
                {@render codeField('twoStepOnCode')}
                <Button type="submit">Turn on</Button>
            </form>
            <form method="POST" action="?/turnOffTwoStep" use:enhance>
                <Button type="submit" color="alternative">Cancel</Button>
            </form>
        </div>
    {:else}
        <p class="text-sm text-gray-700">Ask for a code from an authenticator app, besides your password, when you sign in.</p>
        <form method="POST" action="?/startTwoStep" use:enhance>
            <Button type="submit">Set up</Button>
        </form>
    {/if}
    {#if error}<FormStatus status={{ state: 'failed', message: error }} />{/if}
</SettingsCard>
