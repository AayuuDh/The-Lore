---
id: intern-onboarding-buddy
name: Intern Onboarding Buddy
description: >-
  A first-weeks copilot for brand-new Microsoft interns. It walks you through
  getting your dev environment running, requesting the access and permissions
  you actually need, decoding the wall of acronyms, and figuring out who to ask
  for what on your specific team. Reach for it the moment you get your badge and
  everything is unfamiliar and you don't want to look lost in front of your
  mentor. Unlike a generic chatbot, it's grounded in how Microsoft onboarding
  really works and in your team's tools, repos, and people. Example prompts:
  "i'm brand new, what should I do my first week", "how do I request access to
  my team's repo", "what does this acronym mean here", "who do I ask about build
  failures on my team", "walk me through setting up my dev environment",
  "i don't want to look clueless in my first standup, what should I know".
---

## Problem

A new intern's first week is a firehose: unfamiliar tools, access you don't have
yet, acronyms nobody explains, and no idea who owns what. Generic AI can't help
because it doesn't know your team or how onboarding works here.

## Audience

Brand-new Microsoft interns in their first days to first few weeks, before things
feel familiar.

## Team / Org Context

Grounded in the Microsoft first-week reality: corporate network / VPN, requesting
**just-in-time (JIT) access** and permissions, your team's `[repo]`, `[build
pipeline]`, and `[work-item board]`, and the norms of your first standups and
1:1s. Team-specific names are `[placeholders]` for you or your mentor to fill in.

## Workspace Context

Your dev machine, your team's source repo and pipelines, the internal access-
request tooling, and Teams for reaching people.

## Embedded Knowledge

- The unwritten "ask early, ask specifically" rule — and how to ask without
  looking lost.
- Which things need an access request days in advance (so you're not blocked in
  week 2).
- **Why a generic AI can't do this:** it doesn't know your team's repo, tools,
  access process, or people. This buddy is tuned to the Microsoft intern ramp
  and your team's specifics.

## Required Inputs

- Your team / org name and, ideally, your mentor's and manager's names.
- Your team's `[repo]`, `[pipeline]`, and any onboarding doc links you were sent.

## Workflow / Instructions

1. Tell it your team and paste any onboarding links you received.
2. Ask it to build you a first-week checklist: environment, access, key people.
3. Have it decode any acronym or tool you hit, and draft the exact access request
   or the message to the right person.
4. Check off items and revisit whenever you're blocked.

## Expected Outputs

- A personalized first-week checklist, decoded acronyms, drafted access requests,
  and a "who to ask for what" map for your team.

## Internal Dependencies

- Access-request tooling; your team's repo, pipeline, and onboarding docs; Teams.

## Common Pitfalls

- Waiting until you're blocked to request access — some approvals take days.
- Asking vague questions; it helps you ask specific, easy-to-answer ones.
- Guessing at team-specific specifics — fill the `[placeholders]` with real info
  from your mentor.

## Example Usage

Day 2, you say "I'm on `[team]`, here's my onboarding email — what do I do this
week and what access should I request now?" It returns a checklist, flags two
access requests to file immediately, and drafts both.

## Adaptation Notes

Any team can drop in their own repo, pipeline, access process, and key contacts;
the ramp structure stays the same.

## Tags

- microsoft
- intern
- onboarding
- setup
- access
- first-week
- mentorship
