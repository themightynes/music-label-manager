# PRD: Admin Dialogue Builder

## Introduction/Overview

The Admin Dialogue Builder is a comprehensive content management tool that enables administrators to create, edit, and manage both executive meeting dialogues and artist conversation dialogues within the Music Label Manager game. Currently, all dialogue content is stored in JSON files (`data/actions.json` for executive meetings and `data/dialogue.json` for artist dialogues) and must be edited manually, which is error-prone and lacks validation.

This feature will provide a user-friendly interface for non-technical content creators to manage dialogue content with real-time validation, live previews, and a unified CRUD interface for both dialogue types. The tool will integrate seamlessly with the existing admin section and maintain backward compatibility with the current JSON-based data structure.

**Problem Solved:** Content creators currently need to:
- Manually edit JSON files with risk of syntax errors
- Restart the dev server to see changes
- Navigate complex nested structures without validation
- Test changes in full game sessions

**Solution:** A dedicated admin UI that provides structured forms, validation, preview capabilities, and direct JSON file management.

## Goals

1. **Enable Non-Technical Content Creation:** Allow content designers to create and edit dialogues without JSON knowledge or developer assistance
2. **Reduce Content Errors:** Provide real-time validation of dialogue structure, required fields, and effect keys
3. **Accelerate Content Iteration:** Enable immediate preview of dialogues as players would see them
4. **Maintain Data Integrity:** Ensure all saved dialogues conform to existing type definitions and are backward compatible
5. **Support Both Dialogue Systems:** Provide unified interface for executive meetings and artist dialogues with system-specific controls
6. **Complete CRUD Operations:** Support full lifecycle management (Create, Read, Update, Delete) with proper validation

## User Stories

### Primary User: Content Designer

1. **As a content designer**, I want to browse all existing executive meetings and artist dialogues in one place, so that I can quickly find and edit specific content without searching through JSON files.

2. **As a content designer**, I want to create a new executive meeting with a role, prompt, and multiple choices, so that I can add new decision points for players without developer help.

3. **As a content designer**, I want to see a live preview of how my dialogue will appear in-game, so that I can verify formatting and choice layout before saving.

4. **As a content designer**, I want to add immediate and delayed effects to dialogue choices using dropdowns of valid effect keys, so that I don't accidentally create invalid effect references.

5. **As a content designer**, I want to set the target scope for executive meetings (global/predetermined/user_selected), so that I can control which artists are affected by player choices.

6. **As a content designer**, I want to create artist dialogues with mood and energy range requirements, so that I can provide context-appropriate conversations for different artist emotional states.

7. **As a content designer**, I want to receive clear error messages when required fields are missing or invalid, so that I can fix issues before attempting to save.

8. **As a content designer**, I want to delete outdated or test dialogues, so that I can keep the dialogue library clean and organized.

9. **As a content designer**, I want all my changes to be immediately reflected in the JSON files, so that developers can deploy updated content without additional processing.

10. **As a content designer**, I want to reorder dialogue choices within a meeting, so that I can control the presentation order for optimal player experience.

### Secondary User: Game Developer

11. **As a game developer**, I want the admin tool to validate dialogue structure against TypeScript types, so that I can trust that saved content won't break the game.

12. **As a game developer**, I want dialogue changes to be saved directly to the JSON files in the correct format, so that the existing game logic continues to work without modification.

## Functional Requirements

### Core UI & Navigation

1. The system must provide a dedicated admin page accessible at `/admin/dialogue-builder` route.
2. The system must use the existing `withAdmin` HOC to restrict access to authenticated admin users only.
3. The system must integrate with the existing `AdminLayout` component and appear in the admin tools list.
4. The system must display a tabbed interface with two tabs: "Executive Meetings" and "Artist Dialogues".
5. The system must display all dialogues in a searchable, filterable list view within each tab.

### Executive Meetings Management

6. The system must allow admins to create new executive meeting dialogues with the following fields:
   - Meeting ID (string, unique, validated format)
   - Meeting Name (string, required)
   - Role ID (dropdown: ceo, a&r, cmo, cco, head_of_distribution)
   - Category (dropdown: business, marketing, creative, distribution)
   - Target Scope (dropdown: global, predetermined, user_selected)
   - Prompt text (textarea, supports {artistName} placeholder)
   - Prompt Before Selection (optional textarea, shown when target_scope is user_selected)
   - Choices array (minimum 1 choice required)

7. The system must allow admins to add multiple choices to each meeting dialogue with:
   - Choice ID (string, unique within meeting)
   - Choice Label (string, required, player-visible text)
   - Immediate Effects (key-value pairs)
   - Delayed Effects (key-value pairs)

8. The system must provide a dropdown of predefined effect keys including:
   - money
   - reputation
   - creative_capital
   - artist_mood
   - artist_energy
   - artist_popularity
   - Plus a "Custom Flag" option for additional effect keys

9. The system must validate that when target_scope is "user_selected", the prompt contains the `{artistName}` placeholder.

10. The system must allow admins to reorder choices using drag-and-drop or up/down buttons.

11. The system must allow admins to edit existing executive meeting dialogues by clicking on them in the list view.

12. The system must allow admins to delete executive meeting dialogues with a confirmation prompt.

### Artist Dialogues Management

13. The system must allow admins to create new artist dialogue scenes with the following fields:
    - Scene ID (string, unique, validated format)
    - Emotional State (string, descriptive text)
    - Mood Range: Min (number 0-100) and Max (number 0-100)
    - Energy Range: Min (number 0-100) and Max (number 0-100)
    - Prompt text (textarea, artist's dialogue)
    - Choices array (minimum 1 choice required)

14. The system must allow admins to add multiple choices to each artist dialogue with:
    - Choice ID (string, unique within scene)
    - Choice Label (string, required, player-visible text)
    - Immediate Effects (key-value pairs)
    - Delayed Effects (key-value pairs)

15. The system must validate that mood and energy ranges are between 0-100 and that min ≤ max.

16. The system must allow admins to reorder choices within artist dialogues.

17. The system must allow admins to edit existing artist dialogue scenes.

18. The system must allow admins to delete artist dialogue scenes with a confirmation prompt.

### Validation & Error Handling

19. The system must display inline error messages for invalid fields as the admin types.

20. The system must prevent saving when critical validation errors exist (missing required fields, invalid ID format, out-of-range values).

21. The system must validate dialogue IDs are unique within their respective data files before saving.

22. The system must validate effect keys and display warnings for unrecognized custom flags (but still allow saving).

23. The system must display a summary of all validation errors at the top of the form when save is attempted with errors present.

### Preview Functionality

24. The system must provide a "Preview" button that displays the dialogue in a modal using the same UI components that players see in-game.

25. The preview for executive meetings must render using the `DialogueInterface` component pattern.

26. The preview for artist dialogues must render using the `ArtistDialogueModal` component pattern.

27. The preview must show realistic effect badges (green for positive, red for negative, outlined for delayed).

28. The preview must not actually apply effects or modify game state—it is display-only.

### Data Persistence

29. The system must save executive meetings directly to `data/actions.json` file in the correct structure.

30. The system must save artist dialogues directly to `data/dialogue.json` file in the correct structure.

31. The system must preserve the version number at the top of each JSON file when saving.

32. The system must preserve any existing dialogues not being edited when saving changes.

33. The system must maintain the exact JSON structure expected by existing game logic (no breaking changes to schema).

34. The system must provide success/failure feedback after save operations with specific error details if save fails.

### API Endpoints

35. The system must provide a GET endpoint `/api/admin/dialogues/executive` to fetch all executive meetings.

36. The system must provide a GET endpoint `/api/admin/dialogues/artist` to fetch all artist dialogue scenes.

37. The system must provide a POST endpoint `/api/admin/dialogues/executive` to create new executive meetings.

38. The system must provide a PATCH endpoint `/api/admin/dialogues/executive/:id` to update existing executive meetings.

39. The system must provide a DELETE endpoint `/api/admin/dialogues/executive/:id` to remove executive meetings.

40. The system must provide a POST endpoint `/api/admin/dialogues/artist` to create new artist dialogue scenes.

41. The system must provide a PATCH endpoint `/api/admin/dialogues/artist/:id` to update existing artist dialogue scenes.

42. The system must provide a DELETE endpoint `/api/admin/dialogues/artist/:id` to remove artist dialogue scenes.

43. All API endpoints must require admin authentication using Clerk auth middleware.

44. All API endpoints must validate request payloads using Zod schemas before processing.

45. All API endpoints must handle file system errors gracefully and return appropriate HTTP status codes.

### UI Components & Styling

46. The system must use shadcn/ui components (Button, Card, Badge, Dialog, Tabs, Input, Textarea, Select) for consistent styling.

47. The system must follow the existing admin UI patterns and color system (brand-* and semantic color classes).

48. The system must display dialogue lists using Card components with hover states and click handlers.

49. The system must use forms with proper labels, placeholders, and help text for each field.

50. The system must provide visual indicators for required vs. optional fields.

51. The system must use the existing Loader2 and AlertCircle icons for loading and error states.

52. The system must be responsive and usable on desktop screens (tablet/mobile support is not required for admin tools).

## Non-Goals (Out of Scope)

1. **Database Migration:** This MVP will not migrate dialogue storage from JSON files to a database. Future iterations may explore database-backed content management.

2. **Branching Dialogue Trees:** This feature will not support conditional choice visibility or multi-level dialogue trees. Each dialogue remains a single prompt with flat choice array.

3. **AI-Assisted Content Generation:** No integration with AI services for prompt generation or content suggestions in MVP.

4. **Version History/Rollback:** No built-in undo functionality or change history tracking beyond basic browser undo (Ctrl+Z).

5. **Collaborative Editing:** No real-time collaboration features or conflict resolution for multiple admins editing simultaneously.

6. **Import/Export Individual Dialogues:** No ability to export single dialogues as standalone JSON files or import them. Changes always affect the main data files.

7. **Batch Operations:** No ability to apply bulk changes to multiple dialogues at once (e.g., "increase all money effects by 10%").

8. **Analytics Dashboard:** No tracking of which dialogues are selected most frequently or player choice patterns.

9. **Rich Text Editing:** Dialogue prompt text will be plain text only, no markdown rendering or WYSIWYG editor.

10. **Testing with Mock Game State:** Preview will show dialogue UI only, not simulate how effects would apply to actual game state.

11. **Duplicate/Clone Functionality:** No built-in "duplicate dialogue" feature in MVP (can be added in future iteration).

12. **Search/Filter by Effects:** List view search will be name/ID only, not searchable by effect types or values.

## Design Considerations

### Component Reuse

- **Existing Components to Reuse:**
  - `DialogueInterface` from [client/src/components/executive-meetings/DialogueInterface.tsx](client/src/components/executive-meetings/DialogueInterface.tsx) for executive meeting previews
  - `ArtistDialogueModal` from [client/src/components/artist-dialogue/ArtistDialogueModal.tsx](client/src/components/artist-dialogue/ArtistDialogueModal.tsx) for artist dialogue previews
  - `withAdmin` HOC from [client/src/admin/withAdmin.tsx](client/src/admin/withAdmin.tsx) for authentication
  - shadcn/ui primitives: `Button`, `Card`, `Badge`, `Dialog`, `Tabs`, `Input`, `Textarea`, `Select`, `Label`

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ Admin: Dialogue Builder                         │
├─────────────────────────────────────────────────┤
│ [Executive Meetings] [Artist Dialogues]         │ ← Tabs
├─────────────────────────────────────────────────┤
│ Search: [_________]  [+ New Meeting]            │
├─────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐        │
│ │ Meeting Card 1  │ │ Meeting Card 2  │        │
│ │ CEO: Strategic  │ │ A&R: Scouting   │        │
│ │ [Edit] [Delete] │ │ [Edit] [Delete] │        │
│ └─────────────────┘ └─────────────────┘        │
└─────────────────────────────────────────────────┘

When editing:
┌─────────────────────────────────────────────────┐
│ ← Back to List        Edit Meeting: ceo_priorities│
├─────────────────────────────────────────────────┤
│ Meeting ID: [ceo_priorities____________]        │
│ Name: [CEO: Strategic Priorities_______]        │
│ Role: [CEO ▼]  Category: [business ▼]          │
│ Target Scope: [global ▼]                        │
│                                                  │
│ Prompt:                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ What's the priority for this quarter?       │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Choices:                                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Choice 1                            [↑][↓][×]│ │
│ │ Label: [Focus on artist development____]    │ │
│ │                                              │ │
│ │ Immediate Effects:                           │ │
│ │ [artist_mood ▼] [+2]  [+ Add Effect]       │ │
│ │                                              │ │
│ │ Delayed Effects:                             │ │
│ │ [quality_bonus ▼] [+5]  [+ Add Effect]     │ │
│ └─────────────────────────────────────────────┘ │
│ [+ Add Choice]                                   │
│                                                  │
│ [Preview] [Save Changes] [Cancel]                │
└─────────────────────────────────────────────────┘
```

### Color System

- Use `bg-brand-burgundy` for primary actions (Save, Create)
- Use `text-brand-rose` for highlights and active states
- Use semantic classes: `bg-success` (green) for positive effects, `bg-destructive` (red) for negative effects
- Use `bg-sidebar` or neutral tones for cards and containers
- Follow existing tier badge colors if displaying executive roles

### Form Validation Visual Patterns

- Required fields: Red asterisk `*` next to label
- Invalid fields: Red border + inline error message below field
- Valid fields: Green checkmark icon (optional, avoid clutter)
- Disabled save button when errors present: Use `disabled` state with tooltip

## Technical Considerations

### Frontend Architecture

1. **Page Location:** Create `client/src/pages/AdminDialogueBuilder.tsx` wrapped with `withAdmin` HOC
2. **State Management:** Use React Hook Form with Zod validation for form state
3. **API Integration:** Use TanStack Query (`useQuery`, `useMutation`) for data fetching and cache invalidation
4. **Component Structure:**
   - `AdminDialogueBuilder.tsx` - Main page with tabs
   - `ExecutiveMeetingList.tsx` - List view for executive meetings
   - `ExecutiveMeetingForm.tsx` - Create/edit form for executive meetings
   - `ArtistDialogueList.tsx` - List view for artist dialogues
   - `ArtistDialogueForm.tsx` - Create/edit form for artist dialogues
   - `EffectEditor.tsx` - Reusable component for adding/editing effect key-value pairs
   - `DialoguePreview.tsx` - Modal wrapper for preview functionality

### Backend Architecture

1. **Route Location:** Add admin routes in `server/routes.ts` under `/api/admin/dialogues/*`
2. **Service Layer:** Create `server/services/dialogueAdminService.ts` to handle:
   - Reading JSON files (reuse existing `serverGameData` methods where possible)
   - Writing JSON files with validation
   - Backup/restore operations (optional for MVP)
3. **Validation:** Define Zod schemas in `shared/api/contracts.ts` for admin requests:
   - `CreateExecutiveMeetingSchema`
   - `UpdateExecutiveMeetingSchema`
   - `CreateArtistDialogueSchema`
   - `UpdateArtistDialogueSchema`
4. **File System Operations:** Use Node.js `fs.promises` for async file read/write
5. **Authentication Middleware:** Reuse existing Clerk admin check middleware

### Type Safety

- Extend existing types from `shared/types/gameTypes.ts` (e.g., `DialogueChoice`, `RoleMeeting`, `DialogueScene`)
- Ensure TypeScript types match JSON structure exactly
- Use type guards for runtime validation where necessary

### Error Handling

- Frontend: Display user-friendly error messages in toast notifications and inline form errors
- Backend: Log errors to console with stack traces; return sanitized error messages to client
- File System Errors: Handle ENOENT (file not found), EACCES (permission denied), ENOSPC (disk full)
- Validation Errors: Return 400 Bad Request with detailed field-level error messages

### Performance Considerations

- Lazy load dialogue lists if data files become very large (defer to future optimization)
- Debounce validation checks on text inputs (300ms delay)
- Use optimistic updates for delete operations to improve perceived performance
- Cache dialogue data in TanStack Query with 5-minute stale time

## Success Metrics

### Quantitative Metrics

1. **Reduction in Content Editing Time:** Content designers can create a new dialogue in under 5 minutes (vs. 15+ minutes with manual JSON editing)
2. **Error Rate Reduction:** Zero JSON syntax errors in committed dialogue files after tool is in use
3. **Content Iteration Speed:** Content changes can be previewed immediately (vs. requiring dev server restart)
4. **Tool Adoption:** 100% of dialogue content edits are done through admin tool after 1-week training period

### Qualitative Metrics

5. **User Satisfaction:** Content designers report the tool is intuitive and reduces friction in their workflow
6. **Developer Confidence:** Developers trust that saved dialogues will not break game logic (validated structure)
7. **Content Quality:** Preview functionality leads to better-reviewed dialogue before deployment

### Success Criteria for MVP Completion

8. Admin can successfully create a new executive meeting with 3 choices and see it saved to `data/actions.json`
9. Admin can successfully edit an existing artist dialogue, change mood ranges, and save changes
10. Admin can preview both executive meetings and artist dialogues in realistic player view
11. Admin cannot save dialogues with missing required fields or invalid data
12. All CRUD operations (Create, Read, Update, Delete) work for both dialogue types without errors

## Open Questions

1. **File Write Permissions:** In production (Railway deployment), does the Node.js process have write permissions to the `data/` directory? If not, we may need to deploy JSON changes separately via git commits rather than direct file writes.

2. **Concurrent Edits:** If two admins edit different dialogues simultaneously, will last-write-wins cause data loss? Should we implement file locking or advisory warnings?

3. **Server Restart:** After saving changes to JSON files, does the game engine automatically reload data, or is a server restart required? If restart required, should the admin tool trigger a graceful restart?

4. **Backup Strategy:** Should the admin tool automatically create backups of JSON files before overwriting them? If so, where should backups be stored and how many versions should be retained?

5. **Effect Key Validation:** Should the system maintain a whitelist of valid effect keys in a separate config file, or should it dynamically allow any string as a custom flag?

6. **ID Format Convention:** Should dialogue IDs follow a specific naming convention (e.g., `{role}_{meeting_name}` for executive meetings)? Should the system auto-generate IDs or require manual entry?

7. **Testing Strategy:** Should we create a separate test JSON file for admins to experiment with before committing changes to production files?

8. **Localization:** Are dialogue prompts and choices ever localized (translated)? If yes, how should the admin tool support multi-language content?

9. **Integration with Game State:** Should the preview mode optionally show how effects would apply to a mock artist (with example mood/energy/popularity values)?

10. **Authentication Scope:** Should all admins have equal permissions, or should there be role-based restrictions (e.g., "Content Editor" can edit but not delete, "Content Admin" has full CRUD)?

---

## Appendix: Referenced Files

### Frontend Files
- [client/src/components/artist-dialogue/ArtistDialogueModal.tsx](client/src/components/artist-dialogue/ArtistDialogueModal.tsx) - Artist dialogue UI component
- [client/src/components/executive-meetings/ExecutiveMeetings.tsx](client/src/components/executive-meetings/ExecutiveMeetings.tsx) - Executive meeting selection UI
- [client/src/components/executive-meetings/DialogueInterface.tsx](client/src/components/executive-meetings/DialogueInterface.tsx) - Shared dialogue display component
- [client/src/machines/executiveMeetingMachine.ts](client/src/machines/executiveMeetingMachine.ts) - XState machine for executive meetings
- [client/src/machines/artistDialogueMachine.ts](client/src/machines/artistDialogueMachine.ts) - XState machine for artist dialogues
- [client/src/admin/withAdmin.tsx](client/src/admin/withAdmin.tsx) - Admin authentication HOC
- [client/src/admin/AdminLayout.tsx](client/src/admin/AdminLayout.tsx) - Admin home page

### Backend Files
- [server/data/gameData.ts](server/data/gameData.ts) - Data loading and validation service
- [server/routes.ts](server/routes.ts) - API endpoint definitions

### Data Files
- [data/actions.json](data/actions.json) - Executive meeting dialogues
- [data/dialogue.json](data/dialogue.json) - Artist dialogue scenes

### Type Definitions
- [shared/types/gameTypes.ts](shared/types/gameTypes.ts) - Core type definitions (DialogueChoice, RoleMeeting, DialogueScene)
- [shared/api/contracts.ts](shared/api/contracts.ts) - API request/response schemas

### UI Components
- [client/src/components/ui/dialog.tsx](client/src/components/ui/dialog.tsx) - shadcn/ui Dialog component
