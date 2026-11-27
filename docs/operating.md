# Operating a herd

Whoever runs a herd provides the service and is the data controller under the GDPR; the Brontosound project only writes the software. This guide lists what only you can do. It isn't legal advice: you answer for your own texts, so have a lawyer read them.

## Before opening registrations

1. **Contact email** (Herd settings › Herd): a mailbox you read. Answer requests about personal data within a month (GDPR art. 12.3).
2. **Admin › Legal texts**: write in who runs the herd, keep only the `[if used]` items for the features you turned on, change what doesn't fit, publish. Until you do, the templates show as they are.
3. **Second sign-up checkbox** (Legal texts), if your law asks clauses to be approved on their own (in Italy, art. 1341–1342 c.c. for liability, termination, changes and courts).
4. **Security** (Herd settings): two-step verification for admins, the breached-password check, confirmed emails; turn off the built-in admin once another admin exists. HTTPS only, see [deployment.md](deployment.md).
5. **Third parties**: Google sign-in, maps, YouTube or its proxy, STUN and Have I Been Pwned each come from a setting. Turn off the ones you don't want.

## Keep doing

- **Back up `data/` and `config/`** encrypted, off-site. Test a restore every month.
- **Providers** (host, email, backups) process data for you: accept their data processing agreements (art. 28), prefer the EU.
- **What the templates leave out**: they cover what Brontosound does. Backups, reverse proxy logs, analytics, anything you add: put it in your Privacy Policy, with how long you keep it.
- **Records of processing** (art. 30) and a **breach register** (art. 33.5): yours to keep, outside the app. Privacy § 2 is a start for the first.
- **Reports**: act on them promptly. Suspending asks for a reason: it's emailed and shown to whoever you suspend (DSA art. 17).

## Changing the texts

Edit the draft in Legal texts and publish it with an effective date. A herd's first version takes effect at once; later ones normally get 30 days' notice, as the templates say. Publishing a change asks how to announce it: a banner in the app until it takes effect, which each person can close (on by default), and an email to everyone, whose text you edit (off by default; needs outgoing email). Past versions stay at `/terms/<date>` and `/privacy/<date>`.

Turned a third party on or off (a maps provider, Google sign-in)? Change the Privacy Policy and publish it: texts never follow settings.

## If there's a breach

1. Contain it: take the herd offline if needed, rotate `authSecret` (signs everyone out), revoke leaked keys.
2. Assess what data, whose, how many, and the risk to them.
3. Record it in the breach register, whatever the outcome.
4. Notify your data protection authority within 72 hours of finding it, unless it's unlikely to harm anyone (art. 33).
5. If the risk is high, email the people affected without delay (art. 34): what happened, which data, what you did, what they can do.
6. Fix the cause, and note what you learned.

## What Brontosound does for you

- Records who accepted which Terms, and when (`User.termsAcceptedAt`, `termsVersion`); Google sign-ups accept before using the app.
- **Download your data** in the profile (art. 15, 20); **Export band** for owners.
- Deleting an account erases name, email and profile, leaving "Former member" on what they added.
- No cookies but the technical ones; fonts are self-hosted.

The templates, [terms.md](../src/lib/server/legal/terms.md) and [privacy.md](../src/lib/server/legal/privacy.md), are dedicated to the public domain ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)): use them freely, in Brontosound or not.
