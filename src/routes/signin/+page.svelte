<script>
  import { verbatim } from '$lib/verbatim';
  import { Card, Avatar, Button, Alert, Input, Label } from 'flowbite-svelte';
  import { page } from "$app/state"
  import SignIn from './SignIn.svelte';
  import SignOut from './SignOut.svelte';
  import BrontoHeader from '$lib/components/shell/BrontoHeader.svelte';
  import JoiningBand from '$lib/components/JoiningBand.svelte';

  // `error` is set by Auth.js when it redirects back here (see `pages` in src/auth.ts)
  /** @type {Record<string, string>} */
  const authErrors = {
    AccessDenied: "This Google account has no account in this herd, and can't join it now.",
  };
  // Back to where sign-in was asked for, like an invite link: a path on this site only
  const invite = page.url.searchParams.get('invite');
  const asked = page.data.joining ? `/join/${invite}` : page.url.searchParams.get('redirectTo') ?? '';
  const redirectTo = /^\/(?![/\\])/.test(asked) ? asked : '/app';
  // The password was right; two-step verification asks for the code too (the form keeps email and password)
  let asksCode = $derived(['two_step_required', 'two_step_invalid'].includes(page.form?.credentialsError));
  let infoMessage = $derived(
    page.form?.credentialsError === 'two_step_required' ? "Enter the 6-digit code from your authenticator app."
    : page.url.searchParams.has('twoStepOn') ? "Two-step verification is on. Sign in with your password and a code."
    : page.url.searchParams.has('passwordChanged') ? "Password changed. Sign in with your new password."
    : page.url.searchParams.has('joined') ? "Welcome to the herd! Sign in with your new account."
    : page.url.searchParams.has('confirm') ? "Welcome to the herd! We sent you an email: follow its link to confirm your address, then sign in."
    : page.url.searchParams.has('confirmed') ? "Your email is confirmed. Sign in."
    : null
  );
  let errorMessage = $derived(
    page.form?.credentialsError === 'too_many_attempts' ? "Too many attempts. Try again in 15 minutes."
    : page.form?.credentialsError === 'slow_down' ? "Too many failed attempts for this account. Wait a minute and try again."
    : page.form?.credentialsError === 'two_step_invalid' ? "Wrong code. Enter the one your app shows now."
    : page.form?.credentialsError === 'busy' ? "Too many sign-ins right now. Try again in a moment."
    : page.form?.credentialsError === 'unconfirmed' ? "Confirm your email first: follow the link we sent you."
    : page.form?.credentialsError && !asksCode ? "Invalid credentials."
    : page.url.searchParams.has('error') ? (authErrors[page.url.searchParams.get('error') ?? ''] ?? "Sign-in failed.")
    : null
  );
</script>
  
<BrontoHeader />

<main class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 pb-28 pt-12">
  {#if page.data.brontoSession}
    <div>
        <Card padding="md">
            <div class="flex flex-col items-center pb-4">
                <p class="mb-3">You are signed in as</p>
                {#if page.data.brontoSession.auth.user?.image}
                    <Avatar size="lg" src={page.data.brontoSession.auth.user.image} />
                {/if}
                <h5 class="mb-1 text-xl font-medium text-gray-900 dark:text-white">{page.data.brontoSession.user?.name ?? "User"}</h5>
                <!-- <span class="text-sm text-gray-500 dark:text-gray-400">Visual Designer</span> -->
                <div class="flex mt-4 space-x-3 rtl:space-x-reverse lg:mt-6">
                    <Button href={redirectTo}>Go to app</Button>
                    <SignOut options={{ redirectTo: '/signin' }}>Sign out</SignOut>
                </div>
            </div>
          </Card>
    </div>
  {:else}
    <!-- <span class="notSignedInText">You are not signed in</span> -->
    <div class="w-full max-w-sm">
      {#if page.data.joining}<div class="mb-6"><JoiningBand band={page.data.joining} /></div>{/if}
      {#if errorMessage}
        <Alert color="red" class="mb-4">{errorMessage}</Alert>
      {:else if infoMessage}
        <Alert color="green" class="mb-4">{infoMessage}</Alert>
      {/if}
      <SignIn provider="credentials" options={{ redirectTo }} className="flex flex-col gap-4">
        <svelte:fragment slot="credentials">
          <div>
            <Label for="signInEmail" class="mb-2">Email or handle</Label>
            <Input id="signInEmail" name="email" type="text" inputmode="email" autocomplete="username" {...verbatim} required />
          </div>
          <div>
            <Label for="signInPassword" class="mb-2">Password</Label>
            <Input id="signInPassword" name="password" type="password" autocomplete="current-password" required />
          </div>
          {#if asksCode}
            <div>
              <Label for="signInCode" class="mb-2">Code</Label>
              <Input id="signInCode" name="code" inputmode="numeric" autocomplete="one-time-code" pattern={"[0-9]{6}"} maxlength={6} required autofocus />
            </div>
          {/if}
        </svelte:fragment>
        <span slot="submitButton">{page.data.joining ? `Sign in and join ${page.data.joining.name}` : 'Sign in'}</span>
      </SignIn>
      <p class="my-4 text-center text-sm text-gray-500">or</p>
      <SignIn provider="google" options={{ redirectTo }} className="flex flex-col"><span slot="submitButton">Sign in with Google</span></SignIn>
      {#if page.data.emailReady}
        <p class="mt-4 text-center text-sm"><a href="/forgot" class="font-medium text-primary-800">Forgot your password?</a></p>
      {/if}
      {#if page.data.mayJoinWithInvite}
        <p class="mt-6 text-center text-sm text-gray-500">New here? <a href="/join?invite={invite}" class="font-medium text-primary-800">Create an account</a></p>
      {:else if page.data.registrationsOpen && !page.data.joining}
        <p class="mt-6 text-center text-sm text-gray-500">New here? <a href="/join" class="font-medium text-primary-800">Join the herd</a></p>
      {/if}
    </div>
  {/if}
</main>
