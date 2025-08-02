# Generate Implementation Plan From FRD

## Goal

To guide an AI assistant in creating a detailed, step-by-step implementation plan in Markdown format based on an existing Feature Requirements Document (FRD). The task list should guide a developer through implementation.

## Output

- **Format:** Markdown (`.md`)
- **Location:** `/features/`
- **Filename:** `implementation-[frd-file-name].md` (e.g., `implementation-frd-user-profile-editing.md`)

## Process

1.  **Receive FRD Reference:** The user points the AI to a specific FRD file
2.  **Analyze FRD:** The AI reads and analyzes the functional requirements, user stories, and other sections of the specified FRD.
3.  **Assess Current State:** Review the existing codebase to understand existing infrastructre, architectural patterns and conventions. Also, identify any existing components or features that already exist and could be relevant to the FRD requirements. Then, identify existing related files, components, and utilities that can be leveraged or need modification.
4.  **Phase 1: Generate Phases:** Based on the FRD analysis and current state assessment, create the file and generate the main, high-level phases required to implement the feature. Use your judgement on how many high-level phases to use. Present these phases to the user in the specified format (without tasks yet). Inform the user: "I have generated the high-level phases based on the FRD. Ready to generate the tasks? Respond with 'Go' to proceed." 
5.  **Wait for Confirmation:** Pause and wait for the user to respond with "Go".
6.  **Phase 2: Generate Tasks:** Once the user confirms, break down each phase into actionable tasks necessary to complete the phase. Ensure tasks logically follow the phase to cover the implementation details implied by the FRD, and consider existing codebase patterns where relevant without being constrained by them. Sub-tasks may be added as necessary. Add details any implementation details for each task as needed.
7.  **Identify Relevant Files:** Based on the tasks and FRD, identify potential files that will need to be created or modified. List these under the `Relevant Files` section, including corresponding test files if applicable.
8.  **Generate Final Output:** Combine the phases, tasks, sub-tasks, relevant files, and notes into the final Markdown structure.
9.  **Save the Implementation:** Save the generated document in the `/features/` directory with the filename `implementation-[frd-file-name].md`, where `[frd-file-name]` matches the base name of the input FRD file (e.g., if the input was `frd-user-profile-editing.md`, the output is `implementation-frd-user-profile-editing.md`).

## Output Format

The generated task list _must_ follow this structure:

```markdown
## Relevant Files

- as needed

## Phases

- [ ] Phase 1 Title
  - [ ] 1.1 [Task description 1.1]
  - [ ] 1.2 [Task description 1.2]
- [ ] Phase 2 Title
  - [ ] 2.1 [Task description 2.1]
	  - [ ] 2.1.1 [Sub-task description 2.1.1]
- [ ] Phase 3 Title

## Interaction Model

The process explicitly requires a pause after generating phases to get user confirmation ("Go") before proceeding to generate the detailed tasks. This ensures the high-level plan aligns with user expectations before diving into details.

## Target Audience

Assume the primary reader of the task list is a **junior developer** who will implement the feature with awareness of the existing codebase context.
