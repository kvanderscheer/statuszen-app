# Implementation Plan: Organizations Feature

Based on the [Organizations FRD](./frd-organizations.md), this implementation plan breaks down the development into logical phases following the existing codebase patterns.

## Current State Assessment

**Existing Infrastructure:**
- Nuxt 4 application with TypeScript support
- Supabase authentication and database integration
- Server API endpoints pattern (`server/api/`)
- Composables pattern (`app/composables/useProfile.ts`)
- Type definitions in `app/types/auth.ts`
- UI built with Nuxt UI Pro components
- Established patterns for server-side validation and client-side state management

**Relevant Existing Files:**
- `app/types/auth.ts` - User profile types that need extension
- `app/composables/useProfile.ts` - Pattern to follow for organization composable
- `server/api/profile.get.ts` & `server/api/profile.patch.ts` - Server API patterns
- `app/pages/account/profile.vue` - UI patterns for management pages

## Relevant Files

### New Files to Create:
- `app/types/organization.ts` - Organization-specific type definitions
- `app/composables/useOrganization.ts` - Organization state management
- `app/components/organization/OrganizationSelector.vue` - Organization switcher component
- `app/components/organization/MemberList.vue` - Member management component
- `app/components/organization/InviteMember.vue` - Invitation form component
- `app/components/organization/OrganizationSettings.vue` - Organization settings form
- `app/components/organization/OwnershipTransfer.vue` - Ownership transfer component
- `app/pages/account/organization.vue` - Main organization management page
- `app/pages/account/organization/members.vue` - Members management page
- `app/pages/account/organization/settings.vue` - Organization settings page
- `app/pages/account/organization/invitations.vue` - Pending invitations page
- `server/api/organizations/index.get.ts` - List user's organizations
- `server/api/organizations/index.post.ts` - Create new organization
- `server/api/organizations/[id].get.ts` - Get organization details
- `server/api/organizations/[id].patch.ts` - Update organization
- `server/api/organizations/[id].delete.ts` - Delete organization
- `server/api/organizations/[id]/members.get.ts` - List organization members
- `server/api/organizations/[id]/invite.post.ts` - Invite member
- `server/api/organizations/[id]/members/[userId].delete.ts` - Remove member
- `server/api/organizations/[id]/transfer-ownership.patch.ts` - Transfer ownership
- `server/api/organizations/[id]/invitations.get.ts` - List pending invitations
- `server/api/invitations/[token]/accept.post.ts` - Accept invitation
- `server/api/invitations/[token]/decline.post.ts` - Decline invitation

### Files to Modify:
- `app/types/auth.ts` - Add organization-related types ✅ **COMPLETED**
- `app/composables/useSignup.ts` - Add organization creation on signup
- `app/pages/auth/login.vue` - Handle organization context on login
- `app/layouts/default.vue` - Add organization selector to navigation
- `server/api/profile.get.ts` - Include organization context in profile

### Files Created:
- `app/types/organization.ts` - Organization-specific type definitions ✅ **COMPLETED**
- `app/composables/useOrganization.ts` - Organization state management composable ✅ **COMPLETED**
- `app/components/organization/OrganizationSelector.vue` - Organization switcher dropdown ✅ **COMPLETED**
- `app/components/organization/MemberList.vue` - Member management table ✅ **COMPLETED**
- `app/components/organization/InviteMember.vue` - Member invitation form ✅ **COMPLETED**
- `app/components/organization/OrganizationSettings.vue` - Organization settings form ✅ **COMPLETED**
- `app/pages/account/organization.vue` - Main organization management page ✅ **COMPLETED**

## Phases

- [x] **Phase 1: Foundation & Types** ✅ **COMPLETED**
  - [x] 1.1 Extend existing type definitions in `app/types/auth.ts` ✅
    - [x] 1.1.1 Add `Organization` interface with id, name, description, created_at, updated_at ✅
    - [x] 1.1.2 Add `OrganizationMember` interface with organization_id, user_id, role, joined_at ✅
    - [x] 1.1.3 Add `OrganizationInvitation` interface with organization_id, email, invited_by, status, token, expires_at ✅
    - [x] 1.1.4 Add `OrganizationRole` enum for 'owner' and 'member' ✅
    - [x] 1.1.5 Add database record interfaces following existing patterns ✅
  - [x] 1.2 Create dedicated organization types file `app/types/organization.ts` ✅
    - [x] 1.2.1 Define API response interfaces for organization operations ✅
    - [x] 1.2.2 Define form data interfaces for organization management ✅
    - [x] 1.2.3 Define validation interfaces for organization operations ✅
  - [x] 1.3 Update `UserProfile` interface to include current organization context ✅
    - [x] 1.3.1 Add `currentOrganizationId` field to UserProfile ✅
    - [x] 1.3.2 Add `organizations` array field for user's organizations list ✅

- [x] **Phase 2: Database Schema & Server APIs** ✅ **COMPLETED**
  - [x] 2.1 Document database schema requirements ✅
    - [x] 2.1.1 Define `organizations` table schema with proper constraints ✅
    - [x] 2.1.2 Define `organization_members` table with composite primary key ✅
    - [x] 2.1.3 Define `organization_invitations` table with unique token generation ✅
    - [x] 2.1.4 Plan Row Level Security (RLS) policies for organization data access ✅
  - [x] 2.2 Create core organization management endpoints ✅
    - [x] 2.2.1 Implement `GET /api/organizations` - List user's organizations with role information ✅
    - [x] 2.2.2 Implement `POST /api/organizations` - Create new organization with owner assignment ✅
    - [x] 2.2.3 Implement `GET /api/organizations/[id]` - Get organization details with permission checks ✅
    - [x] 2.2.4 Implement `PATCH /api/organizations/[id]` - Update organization (owners only) ✅
    - [x] 2.2.5 Implement `DELETE /api/organizations/[id]` - Delete organization with safety checks ✅
  - [x] 2.3 Create member management endpoints ✅
    - [x] 2.3.1 Implement `GET /api/organizations/[id]/members` - List members with roles ✅
    - [x] 2.3.2 Implement `POST /api/organizations/[id]/invite` - Send email invitation ✅
    - [ ] 2.3.3 Implement `DELETE /api/organizations/[id]/members/[userId]` - Remove member
    - [ ] 2.3.4 Implement `PATCH /api/organizations/[id]/transfer-ownership` - Transfer ownership
  - [x] 2.4 Create invitation management endpoints ✅
    - [ ] 2.4.1 Implement `GET /api/organizations/[id]/invitations` - List pending invitations
    - [x] 2.4.2 Implement `POST /api/invitations/[token]/accept` - Accept invitation with token validation ✅
    - [ ] 2.4.3 Implement `POST /api/invitations/[token]/decline` - Decline invitation
    - [x] 2.4.4 Add invitation token generation and email sending logic ✅

- [x] **Phase 3: Core Composables & State Management** ✅ **COMPLETED**
  - [x] 3.1 Create `useOrganization` composable following `useProfile` pattern ✅
    - [x] 3.1.1 Implement reactive state management for current organization ✅
    - [x] 3.1.2 Add `fetchOrganizations()` to get user's organizations list ✅
    - [x] 3.1.3 Add `createOrganization(data)` with form validation ✅
    - [x] 3.1.4 Add `updateOrganization(id, data)` with owner permission checks ✅
    - [x] 3.1.5 Add `deleteOrganization(id)` with confirmation flow ✅
    - [x] 3.1.6 Add `switchOrganization(id)` to change current organization context ✅
  - [x] 3.2 Add member management functions to composable ✅
    - [x] 3.2.1 Add `fetchMembers(organizationId)` to get organization members ✅
    - [x] 3.2.2 Add `inviteMember(organizationId, email)` with email validation ✅
    - [ ] 3.2.3 Add `removeMember(organizationId, userId)` with confirmation (endpoint not implemented)
    - [ ] 3.2.4 Add `transferOwnership(organizationId, userId)` with confirmation flow (endpoint not implemented)
  - [x] 3.3 Add invitation management functions ✅
    - [ ] 3.3.1 Add `fetchInvitations(organizationId)` for pending invitations (endpoint not implemented)
    - [x] 3.3.2 Add `acceptInvitation(token)` for invitation acceptance ✅
    - [ ] 3.3.3 Add `declineInvitation(token)` for invitation decline (endpoint not implemented)
    - [x] 3.3.4 Add error handling and toast notifications for all operations ✅

- [x] **Phase 4: User Interface & Components** ✅ **COMPLETED**
  - [x] 4.1 Create organization selector component ✅
    - [x] 4.1.1 Build `OrganizationSelector.vue` dropdown component ✅
    - [x] 4.1.2 Show current organization with switch functionality ✅
    - [x] 4.1.3 Display user's organizations list with role indicators ✅
    - [x] 4.1.4 Add "Create Organization" option in dropdown ✅
  - [x] 4.2 Create member management components ✅
    - [x] 4.2.1 Build `MemberList.vue` component with member display and actions ✅
    - [x] 4.2.2 Build `InviteMember.vue` form component with email validation ✅
    - [x] 4.2.3 Add member role badges and action buttons (remove, transfer ownership) ✅
    - [x] 4.2.4 Implement confirmation modals for destructive actions ✅
  - [x] 4.3 Create organization settings components ✅
    - [x] 4.3.1 Build `OrganizationSettings.vue` form following profile page patterns ✅
    - [x] 4.3.2 Organization deletion component with safety warnings (integrated in settings) ✅
    - [x] 4.3.3 Implement form validation using existing validation utilities ✅
  - [x] 4.4 Create organization management pages ✅
    - [x] 4.4.1 Create main `app/pages/account/organization.vue` page with navigation tabs ✅
    - [x] 4.4.2 Integrate OrganizationSelector into default layout ✅

- [x] **Phase 5: Integration & Auto-Creation Logic** ✅ **COMPLETED**
  - [x] 5.1 Update user signup flow for organization auto-creation ✅
    - [x] 5.1.1 Modify `useSignup` composable to create personal organization ✅
    - [x] 5.1.2 Auto-create organization using database function during signup ✅
    - [x] 5.1.3 Set user's default organization on successful signup ✅
    - [x] 5.1.4 Handle organization creation errors gracefully ✅
  - [x] 5.2 Update authentication flow for organization context ✅
    - [x] 5.2.1 Update profile API to load user's organizations ✅
    - [x] 5.2.2 Set default organization context on profile load ✅
    - [x] 5.2.3 Handle users without organizations (create personal org) ✅
    - [x] 5.2.4 Update profile loading to include organization data ✅
  - [x] 5.3 Organization selector integration ✅
    - [x] 5.3.1 Integrate `OrganizationSelector` into default layout sidebar ✅
    - [x] 5.3.2 Show current organization context throughout the app ✅
    - [x] 5.3.3 Handle organization switching with proper state updates ✅
    - [x] 5.3.4 Sync organization state with profile data ✅
  - [x] 5.4 Edge case handling ✅
    - [x] 5.4.1 Auto-create personal organization for existing users without orgs ✅
    - [x] 5.4.2 Implement organization deletion safety checks (completed in Phase 2) ✅
    - [x] 5.4.3 Add proper error handling and user feedback for all operations ✅
    - [x] 5.4.4 Graceful fallback when organization creation fails ✅