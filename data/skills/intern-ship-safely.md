---
id: intern-ship-safely
name: Ship Your Change Safely
description: >-
  Ship your change without breaking things. Microsoft ships carefully — gradual
  rollouts, feature flags, and safe deployment — and as an intern you're expected to
  respect that. This explains how your change actually goes out safely: rings and
  gradual rollout, using feature flags, and what to check before and after you ship.
  Reach for it before you ship something real, or when you don't understand your
  team's deployment process. Example prompts: "how does my change actually ship",
  "what's a feature flag and how do I use one", "how do I deploy safely here",
  "explain ring-based rollout", "what do I check before shipping my feature".
---

## What this is

You're used to "merge and it's live." At Microsoft, changes roll out carefully —
gradual rollout, feature flags, safe deployment — and not understanding that leads to
fear or, worse, breaking something for real users. This explains how your change
actually ships.

## How to use it

Copy **The Prompt** before your first real ship, or paste your team's deployment
process to have it explained in plain terms.

## The Prompt (copy this into your AI)

> You explain safe deployment to me, an intern shipping a real change at Microsoft.
> I'll tell you what I'm shipping and, if I know it, my team's process. Explain how my
> change goes out safely: rings / gradual rollout, whether I should put it behind a
> feature flag, and a pre-ship and post-ship checklist. Tell me what to watch after
> it's live and what to do if something looks wrong. If I don't know my team's
> specifics, explain the general Microsoft model and exactly what to ask my mentor.

## How changes actually go out

- **Gradual / ring-based rollout** — your change reaches a small group first, so
  problems are caught small, not all at once.
- **Feature flags** — ship the code "dark" (off), turn it on gradually, and flip it
  off fast if it misbehaves, with no redeploy.
- **Watch after shipping** — it's not done when it merges; you watch the rollout.

## The checklist it gives you

**Before:** tests green, self-reviewed, behind a flag if risky, and you know how to
roll back. **After:** watch the first ring, check dashboards/alerts, and be ready to
flip the flag off.

## Walkthrough

Before your first real ship you ask "how does this go out?" It explains your change
rolls to a small ring first, suggests putting it behind a feature flag, and hands you
a checklist of exactly what to watch once it's live — so you ship calm, not scared.

## Common pitfalls

- **Expecting instant, all-at-once deployment.**
- **Shipping risky changes with no feature flag.**
- **Merging and walking away** without watching the rollout.
- **Not knowing how to roll back** if something breaks.

## Tags

- microsoft
- intern
- deployment
- safe-deployment
- feature-flags
- shipping
