# Documentation Governance

**Music Label Manager - Documentation Standards & Guidelines**  
*Internal Reference*
*Last Updated: July 4, 2026 (pass 2 — added Archival Mechanism + Doc-Sync Rule sections)*

---

## 🎯 **Purpose**

This document establishes standards to maintain clean, focused, and non-redundant documentation as the project evolves.

---

## 📏 **Documentation Principles**

### **1. Single Source of Truth**
- Each piece of information should exist in exactly one place
- Link to authoritative sources rather than duplicating content
- When information appears in multiple contexts, choose the most appropriate single location

### **2. Audience-First Design**
- Every document should serve a specific audience with a specific need
- Don't mix content for different audiences in the same document
- Technical details belong in technical documents, user guides belong in user documents

### **3. Purpose-Driven Organization**
- Each folder has a narrow, well-defined purpose
- Documents within folders should align with the folder's purpose
- Resist scope creep that dilutes folder focus

### **4. Maintenance Over Creation**
- Prefer updating existing documents over creating new ones
- Remove outdated content rather than letting it accumulate
- Keep implementation details current with actual code

---

## 🏗️ **Folder Architecture Standards**

### **Folder Hierarchy Rules**

```
docs/
├── 01-planning/        # Business & Strategic (PM/Leadership audience)
├── 02-architecture/    # Technical Design (Developer audience) 
├── 03-workflows/       # Process Flows (Mixed audience)
├── 04-frontend/        # React Implementation (Frontend audience)
├── 05-backend/         # Server Implementation (Backend audience)
├── 06-development/     # Practical Guides (All developers)
├── 08-future-features-and-fixes/ # Roadmap & Research (PM/Developer audience)
├── 09-troubleshooting/ # Problem Resolution (All audiences)
├── 98-research/        # Dated research case files / adversarially-verified audits
└── 99-legacy/          # Archived Content (Reference only)
```

### **Folder Purpose Matrix**

| Folder | Content Type | Audience | Depth Level | Update Frequency |
|--------|-------------|----------|-------------|------------------|
| 01-planning | Strategy, requirements | PM/Leadership | High-level | Quarterly |
| 02-architecture | System design, schemas | Developers | Deep technical | Per major release |
| 03-workflows | User/system flows | Mixed | Medium | Per feature |
| 04-frontend | React patterns, UI | Frontend devs | Implementation | Per sprint |
| 05-backend | Server implementation | Backend devs | Implementation | Per sprint |
| 06-development | Practical how-tos | All developers | Action-oriented | As needed |
| 08-future-features-and-fixes | Roadmap, research | PM/Developers | Conceptual | Monthly |
| 09-troubleshooting | Problem solutions | All roles | Solution-focused | As issues arise |
| 98-research | Dated research case files / adversarially-verified audits | Developers | Point-in-time snapshot | As conducted |

---

## ✅ **Content Review Standards**

### **New Document Checklist**

**Before creating any new document:**

1. **Necessity Check**
   - [ ] Does this information exist elsewhere in the documentation?
   - [ ] Can existing documents be updated instead?
   - [ ] Will this document solve a specific, unaddressed need?

2. **Location Validation**
   - [ ] Does the content match the target folder's purpose?
   - [ ] Is the audience alignment correct?
   - [ ] Would this content fit better in a different existing folder?

3. **Content Quality**
   - [ ] Is the document focused on a single topic/need?
   - [ ] Are cross-references to related content included?
   - [ ] Is the writing appropriate for the target audience?
   - [ ] Does the document provide actionable information?

### **Document Update Checklist**

**Before editing existing documents:**

1. **Scope Preservation**
   - [ ] Does the edit maintain the document's original purpose?
   - [ ] Are you adding content appropriate for the current audience?
   - [ ] Will this change affect the document's position in the architecture?

2. **Consistency Check**
   - [ ] Does new content match the existing style and depth?
   - [ ] Are you introducing redundancy with other documents?
   - [ ] Do cross-references still work after changes?

3. **Impact Assessment**
   - [ ] Will this change break links from other documents?
   - [ ] Does this update require changes to the main README?
   - [ ] Is this information still current with the codebase?

---

## 🚨 **Anti-Pattern Detection**

### **Red Flags to Avoid**

1. **Content Duplication Indicators**
   - Same information appears in multiple places
   - Copy-pasting between documents
   - Multiple "single sources of truth" for the same topic

2. **Audience Confusion Indicators**
   - Technical implementation details in user-facing guides
   - Business strategy mixed with code implementation
   - Beginner and expert content in the same document

3. **Scope Creep Indicators**
   - Documents that serve multiple distinct purposes
   - Folders containing content that doesn't match their stated purpose
   - Documents that keep growing without focus

4. **Maintenance Debt Indicators**
   - Information that contradicts current implementation
   - Dead links to moved or deleted content
   - Placeholder content that was never completed

### **Resolution Strategies**

1. **For Duplication**: Choose the most authoritative location and link from others
2. **For Audience Confusion**: Split content by audience needs
3. **For Scope Creep**: Break large documents into focused components
4. **For Maintenance Debt**: Remove outdated content, fix links, update current info

---

## 🔄 **Governance Process**

### **Documentation Review Workflow**

1. **Self-Review**: Use checklists above before committing changes
2. **Peer Review**: For significant additions, get review from another developer
3. **Architecture Review**: For new folders or major reorganizations, discuss with team

### **Regular Maintenance Schedule**

- **Weekly**: Check for broken internal links when files are moved/renamed
- **Monthly**: Review new documentation for adherence to guidelines
- **Quarterly**: Audit for outdated content and unnecessary duplication
- **Per Release**: Update implementation details to match current code

### **Decision Framework**

**When in doubt about documentation placement:**

```
Is this content already covered elsewhere?
├─ Yes → Update existing content or link to it
└─ No → Continue

Does this serve a specific audience need?
├─ No → Don't create it
└─ Yes → Continue

Does this fit an existing folder's purpose?
├─ Yes → Place it there
└─ No → Challenge: Is a new folder really needed?
    ├─ No → Find the closest fit
    └─ Yes → Propose new folder with clear purpose
```

---

## 📦 **Archival Mechanism**

When a document's core claims no longer describe the current system **and** a successor document exists, archive it rather than leaving it to rot in place:

1. **Move it with history preserved**: `git mv <doc>` into `docs/99-legacy/superseded-<yyyy-mm>/` (month of archival, e.g. `superseded-2026-07/`).
2. **Add a dated header** as the very first line of the file, in this exact template (quoted from pass 1, commit `9aeb1e6`):

   ```
   > ⚠️ ARCHIVED <Month DD, YYYY> — <one-line reason the doc is stale>. Superseded by: `<path/to/successor.md>`. Kept for historical reference.
   ```

3. **Fix every inbound link** to the old path in the same commit — grep `docs/` (and root/`client`/`data` `CLAUDE.md`) for the old filename/path and repoint each hit to the new `99-legacy/superseded-<yyyy-mm>/` location (or to the successor doc, if that reads better in context).
4. Do this **in a single commit** alongside the move — an archived doc with stale inbound links is worse than not archiving at all.

Archival is not deletion: the doc's content remains readable and git-tracked, just clearly labeled as historical.

---

## 🔄 **Doc-Sync Rule**

Any feature arc or PR that changes system behavior — engine logic, routes, client state ownership, schemas, or game content (`data/*.json`) — must, before being considered done, do ONE of:

- **Update the affected descriptive docs** (`02-architecture/`, `03-workflows/`, `04-frontend/`, `05-backend/`) so they describe the system as it now behaves, OR
- **Explicitly log the staleness** as a dated note or backlog item in `docs/09-troubleshooting/technical-debt-backlog.md` if updating the docs isn't practical in the same PR.

**Why this exists**: the July 2026 staleness audits found Passport-era auth documentation and month-cadence endpoint descriptions that had survived roughly 10 months of refactors (Clerk migration, week-cadence conversion) without a single doc update — despite the underlying systems changing completely. Silent drift like this compounds; each subsequent PR trusts docs that were already wrong.

The `/session-end` skill's step 6 now enforces a documentation-governance compliance check at the end of every session, so this rule has an automated backstop rather than relying purely on developer discipline.

---

## 📊 **Success Metrics**

### **Documentation Health Indicators**

- **Zero Duplication**: No information exists in multiple places
- **Clear Navigation**: Users can find information in predictable locations  
- **Current Content**: All implementation details match actual code
- **Focused Folders**: Each folder serves its stated purpose exclusively
- **Working Links**: All internal references function correctly

### **Quality Measures**

- Documents under 500 lines (split if longer)
- Each document serves a single, clear purpose
- Cross-references connect related information
- Content matches stated audience needs
- Regular updates keep pace with development

---

This governance framework ensures our documentation remains a strategic asset rather than becoming technical debt.