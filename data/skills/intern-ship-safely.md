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

## Problem

Interns are used to "merge and it's live," but here changes roll out carefully —
and not understanding that leads to fear or, worse, breaking something.

## Audience

Microsoft interns about to ship a real change for the first time.

## Team / Org Context

Grounded in Microsoft safe-deployment practice: **ring-based / gradual rollout**,
**feature flags**, and pre/post-ship checks — with your team's specifics as
`[placeholders]`.

## Embedded Knowledge

- Changes go out gradually so problems are caught small, not all at once.
- Feature flags let you ship code dark and turn it on safely.
- **Why a generic AI can't do this well:** it maps the general safe-deployment model
  to your team's actual process and what *you* need to check.

## Workflow / Instructions

1. Tell it what you're shipping and your team's process (or ask it to explain the
   general model).
2. It walks you through rings/rollout and whether to use a feature flag.
3. It gives you a pre-ship and post-ship checklist.
4. It reminds you what to watch after your change goes out.

## Common Pitfalls

- Expecting instant, all-at-once deployment.
- Shipping risky changes without a feature flag.
- Merging and walking away without watching the rollout.

## Example Usage

Before your first real ship you ask "how does this go out?" It explains your change
rolls to a small ring first, suggests a feature flag, and hands you a checklist of
what to watch once it's live.

## Tags

- microsoft
- intern
- deployment
- safe-deployment
- feature-flags
- shipping
