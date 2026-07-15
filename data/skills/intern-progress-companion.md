---
id: intern-progress-companion
name: Internship Progress Companion
description: >-
  Your always-on internship memory. Connect it to your GitHub / Azure DevOps
  activity (commits, PRs, work items) and your 1:1 and meeting transcript notes,
  and it tracks your internship progress straight from your GitHub — everything
  you actually shipped and learned across the whole summer,
  then turns that real evidence into your Connect impact narrative, resume
  bullet points, status updates, and presentation talking points. Reach for it
  when you're staring at a blank Connect doc, can't remember what you did in
  week 3, need resume bullets that sound like impact instead of chores, or want
  a running record of your growth for your mentor. Unlike a blank chatbot, it
  works from YOUR commits, YOUR PRs, and YOUR notes, and it remembers everything
  all summer. Example prompts: "draft my Connect from my commits and notes so
  far", "turn what I did this sprint into resume bullets", "what have I actually
  shipped this internship?", "summarize my progress for my mentor 1:1", "help me
  remember my wins for my final presentation".
---

## Problem

Interns do a huge amount over a summer but forget most of it by the time
Connects, resume updates, or the final presentation come due. A blank chatbot
can't help, because it has no idea what you actually did.

## Audience

Microsoft interns (and early-career engineers) who want their real work captured
as it happens and turned into career artifacts without scrambling at the end.

## Team / Org Context

Built around real Microsoft rituals: the **Connect** impact narrative, mentor and
manager **1:1s**, the **midpoint and final intern presentations**, and the
return-offer conversation. It treats your team's `[work-item board]` and `[repo]`
as the source of truth for what you shipped.

## Workspace Context

Connects to your **GitHub / Azure DevOps** (commits, PRs, work items) and a
folder of your **1:1 and meeting transcript notes**. Optionally your calendar for
milestone dates.

## Embedded Knowledge

- What "impact" means in a Microsoft Connect: outcomes and who benefited, not a
  task list.
- The framing that lands with reviewers here: contribution, collaboration, and
  growth over the summer.
- **Why a generic AI can't do this:** it has none of your commits, PRs, or notes,
  and no memory of your summer. This agent is grounded in your real evidence and
  persists week over week.

## Required Inputs

- Your GitHub / Azure DevOps handle or repo access.
- Ongoing transcript notes from 1:1s and key meetings.
- Optional: your team / project name and your internship goals.

## Workflow / Instructions

1. Point it at your GitHub / ADO activity and your notes folder.
2. Each week, have it log what you shipped and learned into a running record.
3. When a Connect, resume update, or presentation is due, ask it to synthesize
   from that record.
4. Review the draft, add the human color it can't know, and finalize.

## Expected Outputs

- A running progress log, a drafted Connect narrative, resume bullet points, and
  1:1 / presentation talking points.

## Internal Dependencies

- GitHub / Azure DevOps; your meeting notes; your team's `[work-item board]`.

## Common Pitfalls

- Waiting until the end of summer — start logging in week 1.
- Listing tasks instead of impact; feed it outcomes and it will reframe them.
- Never paste confidential material into non-approved tools; keep everything in
  approved surfaces.

## Example Usage

It's week 10. You say, "draft my final presentation talking points and my Connect
from everything so far." It pulls your merged PRs and notes, produces a first
draft organized by impact, and surfaces three growth stories you'd forgotten.

## Adaptation Notes

Any team or role can point it at their own repo, board, and notes; swap the
Connect format for another company's review template.

## Tags

- microsoft
- intern
- career
- connect
- resume
- progress-tracking
- longitudinal
- github
