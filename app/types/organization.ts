import type { Ref } from 'vue'
import type { Organization, OrganizationMember, OrganizationInvitation, OrganizationRole } from './auth'

// API Response Interfaces

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * Response for organization list endpoint
 */
export interface OrganizationsListResponse extends ApiResponse {
  data: Array<Organization & { role: OrganizationRole }>
}

/**
 * Response for single organization endpoint
 */
export interface OrganizationResponse extends ApiResponse {
  data: Organization & {
    role: OrganizationRole
    memberCount: number
  }
}

/**
 * Response for organization members endpoint
 */
export interface OrganizationMembersResponse extends ApiResponse {
  data: OrganizationMember[]
}

/**
 * Response for organization invitations endpoint
 */
export interface OrganizationInvitationsResponse extends ApiResponse {
  data: OrganizationInvitation[]
}

/**
 * Response for organization creation/update operations
 */
export interface OrganizationMutationResponse extends ApiResponse {
  data: Organization
}

// Form Data Interfaces

/**
 * Form data for creating a new organization
 */
export interface CreateOrganizationData {
  name: string
  description?: string
}

/**
 * Form data for updating an organization
 */
export interface UpdateOrganizationData {
  name?: string
  description?: string
}

/**
 * Form data for inviting a member
 */
export interface InviteMemberData {
  email: string
  role?: OrganizationRole
}

/**
 * Form data for transferring ownership
 */
export interface TransferOwnershipData {
  newOwnerId: string
  confirmTransfer: boolean
}

/**
 * Form data for organization deletion confirmation
 */
export interface DeleteOrganizationData {
  confirmDeletion: boolean
  organizationName: string
}

// Validation Interfaces

/**
 * Validation error structure for organization forms
 */
export interface OrganizationValidationError {
  field: string
  message: string
}

/**
 * Validation state for organization forms
 */
export interface OrganizationFormValidationState {
  name: OrganizationValidationError | null
  description: OrganizationValidationError | null
  email: OrganizationValidationError | null
  general: OrganizationValidationError | null
}

/**
 * Validation result for organization operations
 */
export interface OrganizationValidationResult {
  isValid: boolean
  errors: OrganizationValidationError[]
}

// Utility Types

/**
 * Organization with computed properties for UI
 */
export interface OrganizationWithMetadata extends Organization {
  role: OrganizationRole
  memberCount: number
  pendingInvitations: number
  canManage: boolean
  canDelete: boolean
  canInvite: boolean
  canTransferOwnership: boolean
}

/**
 * Organization member with computed properties for UI
 */
export interface OrganizationMemberWithMetadata extends OrganizationMember {
  canRemove: boolean
  canPromoteToOwner: boolean
  isCurrentUser: boolean
}

/**
 * Organization invitation with computed properties for UI
 */
export interface OrganizationInvitationWithMetadata extends OrganizationInvitation {
  canResend: boolean
  canCancel: boolean
  isExpired: boolean
  daysUntilExpiry: number
}

// State Management Types

/**
 * Organization state for composables
 */
export interface OrganizationState {
  currentOrganization: Organization | null
  organizations: OrganizationWithMetadata[]
  members: OrganizationMemberWithMetadata[]
  invitations: OrganizationInvitationWithMetadata[]
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
}

/**
 * Organization context for dependency injection
 */
export interface OrganizationContext {
  currentOrganization: Readonly<Ref<Organization | null>>
  organizations: Readonly<Ref<OrganizationWithMetadata[]>>
  switchOrganization: (organizationId: string) => Promise<boolean>
  refreshOrganizations: () => Promise<void>
  canPerformAction: (action: OrganizationAction, organizationId?: string) => boolean
}

/**
 * Available organization actions for permission checking
 */
export type OrganizationAction
  = | 'create'
    | 'update'
    | 'delete'
    | 'invite'
    | 'remove_member'
    | 'transfer_ownership'
    | 'manage_settings'
    | 'view_members'
    | 'view_invitations'

// Error Types

/**
 * Organization-specific error codes
 */
export type OrganizationErrorCode
  = | 'ORGANIZATION_NOT_FOUND'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'ORGANIZATION_NAME_TAKEN'
    | 'CANNOT_DELETE_LAST_ORGANIZATION'
    | 'CANNOT_REMOVE_LAST_OWNER'
    | 'INVITATION_EXPIRED'
    | 'INVITATION_ALREADY_ACCEPTED'
    | 'USER_ALREADY_MEMBER'
    | 'INVALID_EMAIL'
    | 'RATE_LIMIT_EXCEEDED'

/**
 * Organization error with code and context
 */
export interface OrganizationError {
  code: OrganizationErrorCode
  message: string
  field?: string
  context?: Record<string, any>
}
