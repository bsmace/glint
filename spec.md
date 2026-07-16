# V1.1-4: Prompt Versioning & History

## Requirements
1. Auto-version saved prompts on each edit — increment version, store previous content + variables
2. New `promptVersions` Dexie table: `{ id, promptId, version, content, variables, createdAt }`
3. Max 10 versions per prompt; oldest auto-pruned when 11th is created
4. Version diff view in side panel: side-by-side comparison
5. Rollback: restore selected version as current prompt content

## Acceptance Criteria
- [ ] Editing a saved prompt creates a new version entry
- [ ] Up to 10 versions per prompt, oldest dropped at 11th
- [ ] Diff shows changes between any two versions
- [ ] Rollback restores prompt to selected version state

## Out of Scope
- Versioning for variables or memory entries
- Comparison across different prompts
- Auto-revert / undo save

## Edge Cases
- Prompt has 0 versions (freshly created, never edited) → version history shows "no history yet"
- Rollback on version 1 → no-op or warn "already at earliest version"
- Prompt deleted → cascade delete all its versions
- Concurrent edits → last-write-wins on version increment (acceptable for single-user)
