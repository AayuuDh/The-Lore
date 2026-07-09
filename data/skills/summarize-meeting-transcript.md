---
description: 'Transforms meeting transcripts into structured weekly or monthly action
  plans with clear ownership and milestones. Use this to convert raw meeting discussions
  into executable plans with phased delivery, dependencies, and timeline visualization.
  Ideal for project kickoffs, sprint planning, retrospectives, or any meeting where
  discussions need to become a concrete roadmap. Example prompts: ''Create a weekly
  plan from this project launch meeting'', ''Build a 4-week action plan from our Q3
  planning notes'', ''Generate a monthly roadmap from this client requirements call''.'
id: summarize-meeting-transcript
name: Meeting Transcript to Action Plan
---

## Instructions

1. **Provide the meeting transcript** - Share the full transcript, notes, or conversation. Include all discussion points, decisions, and commitments made.

2. **Specify the plan scope** - Choose:
   - **Weekly plan**: For 1-2 week execution, high-level daily breakdown
   - **Monthly plan**: For 4-week execution, weekly phases and milestones
   - **Custom timeline**: For specific durations or milestone-based planning

3. **Structure the plan as follows**:
   - **Goals/Outcomes**: What success looks like
   - **Phases/Weeks**: Organized by time periods with dependencies
   - **Action Items**: Owner, task, duration, blockers
   - **Milestones**: Key checkpoints and delivery dates
   - **Unresolved Items**: Decisions still needed, dependencies on others

4. **Plan elements**:
   - Group related actions into phases
   - Flag dependencies between items (item A blocks item B)
   - Assign owners and realistic timelines
   - Mark items as TBD where ownership is unclear
   - Note any external dependencies or blockers
   - Include buffer time for reviews and integration

## Example

**Input:** Meeting transcript about launching a new feature

**Output (4-week plan):**
```
## Feature Launch Plan (4 weeks)

### Goals
- Ship new feature to 10% user base
- Validate performance and user feedback
- Prepare for full rollout

### Week 1: Design & Setup
- [ ] Finalize feature spec (Sarah, 2 days)
- [ ] Set up infrastructure (DevOps team, 3 days) *blocks Week 2*
- [ ] Create test plan (QA lead, 2 days)
- [ ] Design API endpoints (Mike, 2 days)

### Week 2: Core Development  
- [ ] Build backend services (Mike + team, 3 days) *depends on: Week 1 infrastructure*
- [ ] Implement frontend UI (Rachel, 3 days)
- [ ] Set up monitoring (DevOps, 1 day)

### Week 3: Testing & Integration
- [ ] End-to-end testing (QA, 2 days)
- [ ] Performance testing (DevOps, 1 day)
- [ ] Security review (Tom - TBD, 2 days)
- [ ] Staging deployment (DevOps, 1 day)

### Week 4: Launch & Monitoring
- [ ] Canary release to 10% (DevOps, 0.5 days)
- [ ] Monitor metrics (On-call, ongoing)
- [ ] Gather user feedback (Product, 2 days)
- [ ] Prepare launch retrospective (Sarah, 1 day)

### Milestones
- End of Week 1: Design approved, infrastructure ready
- End of Week 2: Core features implemented
- End of Week 3: Feature fully tested in staging
- End of Week 4: Live in production, baseline metrics captured

### Blockers & TBDs
- Security review owner TBD (Sarah to confirm with Tom)
- Client sign-off on final spec needed before Week 2
```