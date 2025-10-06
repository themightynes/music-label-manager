---
description: Review bug reports from players and provide analysis
allowed-tools: Read, Grep
argument-hint: [optional: filter by 'new', 'in_review', or 'completed']
---

# Bug Report Review

Analyzing bug reports from the player community.

## Loading Bug Reports
!Read C:\Users\ulyan\music-label-manager\data\bugReports.json

## Analysis

I've reviewed the bug reports. Here's a breakdown:

### Summary Statistics
- **Total Reports**: {count total reports}
- **By Status**:
  - New: {count new}
  - In Review: {count in_review}
  - Completed: {count completed}
- **By Severity**:
  - Critical: {count critical}
  - High: {count high}
  - Medium: {count medium}
  - Low: {count low}
- **By Area**:
  - Gameplay: {count gameplay}
  - UI: {count ui}
  - Audio: {count audio}
  - Performance: {count performance}
  - Data: {count data}
  - Other: {count other}

### Priority Issues

{Filter and display based on $ARGUMENTS if provided, otherwise show all reports grouped by status}

#### New Reports (Requires Attention)
{List new reports with: summary, severity, area, game week, and key details from whatHappened}

#### In Review
{List in_review reports with same format}

#### Completed
{List completed reports with same format}

### Actionable Insights

Based on the bug reports:

1. **Common Patterns**: {Identify recurring issues or themes}
2. **Critical Paths Affected**: {Note which core features are impacted}
3. **Suggested Priority**: {Recommend which bugs to tackle first based on severity, frequency, and area}
4. **Investigation Notes**: {Any technical insights about root causes or related issues}

### Next Steps

{Provide recommendations based on filter argument or overall state:
- If filtering by "new": List new bugs that need triage
- If filtering by "in_review": Show which are ready for testing
- If filtering by "completed": Verify fixes and close out
- If no filter: Recommend prioritization}

---

**Filter applied**: $ARGUMENTS
