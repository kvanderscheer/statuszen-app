# Implementation Plan: Monitor Management System

## Relevant Files

### New Files to Create
- ✅ `app/types/monitor.ts` - Monitor-related TypeScript interfaces and types
- ✅ `app/utils/monitor-validation.ts` - Monitor validation utilities extending existing patterns
- ✅ `server/api/monitors/index.get.ts` - List monitors endpoint with organization filtering
- ✅ `server/api/monitors/index.post.ts` - Create monitor endpoint with validation
- ✅ `server/api/monitors/[id].get.ts` - Get single monitor endpoint with ownership validation
- ✅ `server/api/monitors/[id].patch.ts` - Update monitor endpoint with validation
- ✅ `server/api/monitors/[id].delete.ts` - Delete monitor endpoint with ownership validation
- ✅ `app/composables/useMonitors.ts` - Monitor management composable with CRUD operations
- ✅ `app/pages/monitors/index.vue` - Monitor list page with filtering and search
- ✅ `app/pages/monitors/create.vue` - Monitor creation page with form validation
- ✅ `app/pages/monitors/[id]/edit.vue` - Monitor editing page with existing data
- ✅ `app/components/MonitorForm.vue` - Reusable monitor form component
- ✅ `app/components/MonitorCard.vue` - Monitor display component for lists
- ✅ `app/components/MonitorTypeSelect.vue` - Monitor type selection component
- ✅ `app/components/MonitorConfigForm.vue` - Dynamic configuration form based on monitor type

### Files to Modify
- ✅ `app/layouts/default.vue` - Monitor navigation already exists in layout
- ✅ `supabase/migrations/` - Create new migration file for monitors table and indexes

### Files to Reference (No Changes)
- `app/types/organization.ts` - Reference for API response patterns and validation interfaces
- `app/types/auth.ts` - Reference for organization relationship patterns
- `app/utils/validation.ts` - Reference for validation utility patterns
- `server/api/organizations/index.get.ts` - Reference for authentication and database query patterns

## Phases

- [x] **Phase 1: Database & Types Foundation**
  - [x] 1.1 Create Supabase migration for monitors table with proper indexes and constraints
    - [x] 1.1.1 Define monitors table schema with UUID primary key
    - [x] 1.1.2 Add foreign key constraint to organizations table
    - [x] 1.1.3 Create indexes on organization_id, next_check_at, and is_active fields
    - [x] 1.1.4 Add check constraints for monitor types and valid intervals
  - [x] 1.2 Create comprehensive TypeScript interfaces in `app/types/monitor.ts`
    - [x] 1.2.1 Define core Monitor interface following existing patterns
    - [x] 1.2.2 Create MonitorRecord interface for database operations
    - [x] 1.2.3 Define monitor type-specific configuration interfaces
    - [x] 1.2.4 Create API response interfaces extending existing ApiResponse pattern
    - [x] 1.2.5 Define form data interfaces for create/update operations
    - [x] 1.2.6 Create validation error interfaces following existing patterns

- [x] **Phase 2: Backend API Implementation**
  - [x] 2.1 Implement monitor validation utilities in `app/utils/monitor-validation.ts`
    - [x] 2.1.1 Create URL validation for different monitor types (HTTP/HTTPS/ping)
    - [x] 2.1.2 Implement monitor type validation against allowed values
    - [x] 2.1.3 Add region validation for supported regions
    - [x] 2.1.4 Create interval validation with min/max constraints
    - [x] 2.1.5 Implement JSONB configuration validation per monitor type
    - [x] 2.1.6 Create comprehensive field validation function following existing patterns
  - [x] 2.2 Create GET `/api/monitors` endpoint for listing organization monitors
    - [x] 2.2.1 Implement user authentication using existing serverSupabaseUser pattern
    - [x] 2.2.2 Add organization-based filtering using organization membership
    - [x] 2.2.3 Implement optional filtering by monitor type and status
    - [x] 2.2.4 Add pagination support with limit/offset parameters
    - [x] 2.2.5 Include proper error handling following existing API patterns
    - [x] 2.2.6 Return monitors with calculated next_check_at times
  - [x] 2.3 Create POST `/api/monitors` endpoint for monitor creation
    - [x] 2.3.1 Implement request body validation using monitor validation utilities
    - [x] 2.3.2 Verify user has access to specified organization
    - [x] 2.3.3 Calculate initial next_check_at based on check_interval_minutes
    - [x] 2.3.4 Insert monitor record with proper timestamp handling
    - [x] 2.3.5 Return created monitor with success response format
    - [x] 2.3.6 Handle database errors and constraint violations
  - [x] 2.4 Create GET `/api/monitors/[id]` endpoint for single monitor retrieval
    - [x] 2.4.1 Implement monitor ID validation and existence check
    - [x] 2.4.2 Verify user has access to monitor's organization
    - [x] 2.4.3 Return monitor details with configuration data
    - [x] 2.4.4 Handle not found and permission denied cases
  - [x] 2.5 Create PATCH `/api/monitors/[id]` endpoint for monitor updates
    - [x] 2.5.1 Validate partial update data using existing validation patterns
    - [x] 2.5.2 Verify ownership and update permissions
    - [x] 2.5.3 Recalculate next_check_at if interval changed
    - [x] 2.5.4 Update monitor record with proper timestamp handling
    - [x] 2.5.5 Return updated monitor data
  - [x] 2.6 Create DELETE `/api/monitors/[id]` endpoint for monitor deletion
    - [x] 2.6.1 Verify monitor existence and ownership
    - [x] 2.6.2 Implement soft delete by setting is_active to false
    - [x] 2.6.3 Consider hard delete option for data privacy
    - [x] 2.6.4 Return deletion confirmation response

- [x] **Phase 3: Frontend Composables & Utilities**
  - [x] 3.1 Create monitor management composable in `app/composables/useMonitors.ts`
    - [x] 3.1.1 Implement reactive state management for monitors list
    - [x] 3.1.2 Create fetchMonitors function with organization filtering
    - [x] 3.1.3 Implement createMonitor function with optimistic updates
    - [x] 3.1.4 Create updateMonitor function with local state synchronization
    - [x] 3.1.5 Implement deleteMonitor function with confirmation
    - [x] 3.1.6 Add loading states and error handling following existing patterns
    - [x] 3.1.7 Implement client-side validation using monitor validation utilities
    - [x] 3.1.8 Add real-time updates integration if needed
  - [x] 3.2 Extend validation utilities for monitor-specific validations
    - [x] 3.2.1 Create monitor name validation (required, length, format)
    - [x] 3.2.2 Implement URL validation with protocol-specific rules
    - [x] 3.2.3 Add configuration validation for each monitor type
    - [x] 3.2.4 Create form-level validation functions
    - [x] 3.2.5 Implement real-time validation for form fields

- [x] **Phase 4: UI Components & Pages**
  - [x] 4.1 Create reusable monitor form component in `app/components/MonitorForm.vue`
    - [x] 4.1.1 Implement form layout using existing Nuxt UI Pro patterns
    - [x] 4.1.2 Create monitor type selection with descriptions
    - [x] 4.1.3 Add dynamic configuration fields based on monitor type
    - [x] 4.1.4 Implement real-time validation with error display
    - [x] 4.1.5 Add region selection dropdown with current options
    - [x] 4.1.6 Create interval configuration with helpful presets
    - [x] 4.1.7 Implement form submission with loading states
  - [x] 4.2 Create monitor display component in `app/components/MonitorCard.vue`
    - [x] 4.2.1 Design card layout showing monitor status and details
    - [x] 4.2.2 Add monitor type indicators with appropriate icons
    - [x] 4.2.3 Display last check time and next scheduled check
    - [x] 4.2.4 Show monitor status (active/inactive) with visual indicators
    - [x] 4.2.5 Add quick action buttons (edit, delete, enable/disable)
    - [x] 4.2.6 Implement responsive design for mobile devices
  - [x] 4.3 Create monitor type selection component in `app/components/MonitorTypeSelect.vue`
    - [x] 4.3.1 Design selection interface with type descriptions
    - [x] 4.3.2 Add visual icons for each monitor type
    - [x] 4.3.3 Include configuration examples for each type
    - [x] 4.3.4 Implement selection validation and feedback
  - [x] 4.4 Create dynamic configuration form in `app/components/MonitorConfigForm.vue`
    - [x] 4.4.1 Implement type-specific configuration fields
    - [x] 4.4.2 Add helpful placeholders and validation hints
    - [x] 4.4.3 Create configuration presets for common scenarios
    - [x] 4.4.4 Implement JSON schema validation for advanced users
  - [x] 4.5 Create monitor list page in `app/pages/monitors/index.vue`
    - [x] 4.5.1 Implement page layout with header and actions
    - [x] 4.5.2 Add monitor filtering by type, status, and region
    - [x] 4.5.3 Implement search functionality by name and URL
    - [x] 4.5.4 Create responsive grid layout for monitor cards
    - [x] 4.5.5 Add pagination or infinite scroll for large lists
    - [x] 4.5.6 Implement bulk actions (enable/disable multiple)
    - [x] 4.5.7 Add empty state with helpful creation prompts
  - [x] 4.6 Create monitor creation page in `app/pages/monitors/create.vue`
    - [x] 4.6.1 Implement page layout with step-by-step flow
    - [x] 4.6.2 Add form validation with real-time feedback
    - [x] 4.6.3 Create success state with next steps guidance
    - [x] 4.6.4 Implement form persistence for draft monitors
    - [x] 4.6.5 Add cancel confirmation to prevent data loss
  - [x] 4.7 Create monitor editing page in `app/pages/monitors/[id]/edit.vue`
    - [x] 4.7.1 Load existing monitor data with error handling
    - [x] 4.7.2 Pre-populate form fields with current values
    - [x] 4.7.3 Implement change tracking for unsaved modifications
    - [x] 4.7.4 Add delete confirmation modal
    - [x] 4.7.5 Create update success feedback

- [ ] **Phase 5: Integration & Testing**
  - [ ] 5.1 Integrate monitor management with existing organization system
    - [ ] 5.1.1 Ensure monitor access respects organization membership
    - [ ] 5.1.2 Add monitor count to organization dashboard if applicable  
    - [ ] 5.1.3 Implement organization switching with monitor context updates
    - [ ] 5.1.4 Add monitor-related permissions to organization roles
  - [ ] 5.2 Add navigation and routing integration
    - [ ] 5.2.1 Add monitors navigation item to main app navigation
    - [ ] 5.2.2 Implement breadcrumb navigation for monitor pages
    - [ ] 5.2.3 Add monitor quick actions to organization dashboard
    - [ ] 5.2.4 Create monitor-related notification integration points
  - [ ] 5.3 Implement comprehensive error handling and user feedback
    - [ ] 5.3.1 Add toast notifications for all monitor operations
    - [ ] 5.3.2 Implement error boundary components for monitor pages
    - [ ] 5.3.3 Create helpful error messages for common failures
    - [ ] 5.3.4 Add retry mechanisms for failed API calls
  - [ ] 5.4 Performance optimization and caching
    - [ ] 5.4.1 Implement monitor list caching with proper invalidation
    - [ ] 5.4.2 Add optimistic updates for better perceived performance
    - [ ] 5.4.3 Implement virtual scrolling for large monitor lists
    - [ ] 5.4.4 Add lazy loading for monitor configuration details
  - [ ] 5.5 Testing and validation
    - [ ] 5.5.1 Test all API endpoints with various data scenarios
    - [ ] 5.5.2 Validate organization-based access control
    - [ ] 5.5.3 Test form validation with edge cases
    - [ ] 5.5.4 Verify responsive design on mobile devices
    - [ ] 5.5.5 Test error handling and recovery scenarios
    - [ ] 5.5.6 Run TypeScript compilation and ESLint validation

## Implementation Notes

### Database Design Considerations
- Use UUID for monitor IDs to prevent enumeration
- Index on `organization_id` and `next_check_at` for scheduler queries
- JSONB config field allows flexible monitor-specific settings
- Soft delete capability through `is_active` field

### API Design Patterns
- Follow existing `ApiResponse<T>` interface for consistency
- Use HTTP status codes appropriately (200, 201, 400, 401, 404, 500)
- Implement proper error messages with field-specific validation feedback
- Support partial updates in PATCH endpoints

### Frontend Architecture
- Use existing Nuxt UI Pro components for consistency
- Implement proper loading states and error boundaries
- Follow existing validation patterns from auth system
- Use TypeScript strictly for type safety

### Security Considerations
- Always verify organization membership before monitor operations
- Validate all input data both client and server-side
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on monitor creation if needed

### Performance Optimization
- Use database indexes for common query patterns
- Implement proper pagination for large monitor lists
- Cache organization membership for API requests
- Consider monitor result storage patterns for future features

This implementation plan provides a comprehensive roadmap for adding monitor management functionality while maintaining consistency with the existing codebase architecture and patterns.