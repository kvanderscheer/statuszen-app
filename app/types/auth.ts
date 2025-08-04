export interface SignupFormData {
  email: string
  password: string
  fullName: string
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  company?: string
  plan: 'free' | 'pro' | 'enterprise'
  emailVerified: boolean
  phoneNumber?: string
  timezone: string
  createdAt: string
  updatedAt: string
  currentOrganizationId?: string
  organizations?: Array<{
    id: string
    name: string
    role: OrganizationRole
  }>
}

// Database table structure for user_profiles
export interface UserProfileRecord {
  id: string
  full_name: string
  company: string | null
  plan: 'free' | 'pro' | 'enterprise'
  email_verified: boolean
  phone_number?: string | null
  timezone: string
  avatar_url?: string | null
  current_organization_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface SignupResponse {
  user: unknown
  session: unknown
  error?: {
    message: string
    code?: string
  }
}

export interface ValidationError {
  field: string
  message: string
}

export interface FormValidationState {
  email: ValidationError | null
  password: ValidationError | null
  fullName: ValidationError | null
  company: ValidationError | null
}

export interface Plan {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  description: string
  price: number
  features: string[]
  popular?: boolean
  available: boolean
}

// Profile update data
export interface ProfileUpdateData {
  fullName?: string
  company?: string
  phoneNumber?: string
  timezone?: string
}

// Profile update database record
export interface ProfileUpdateRecord {
  full_name?: string
  company?: string | null
  phone_number?: string | null
  timezone?: string
}

// Timezone definition
export interface TimezoneOption {
  value: string
  label: string
  group: string
}

// Common timezones grouped by region
export type TimezoneGroup
  = | 'America'
    | 'Europe'
    | 'Asia'
    | 'Africa'
    | 'Australia'
    | 'Pacific'

// Organization-related types

/**
 * Organization role enum
 */
export type OrganizationRole = 'owner' | 'member'

/**
 * Organization interface - client-side representation
 */
export interface Organization {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * Database record structure for organizations table
 */
export interface OrganizationRecord {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * Organization member interface - client-side representation
 */
export interface OrganizationMember {
  organizationId: string
  userId: string
  role: OrganizationRole
  joinedAt: string
  user?: {
    id: string
    fullName: string
    email: string
  }
}

/**
 * Database record structure for organization_members table
 */
export interface OrganizationMemberRecord {
  organization_id: string
  user_id: string
  role: OrganizationRole
  joined_at: string
}

/**
 * Organization invitation status
 */
export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

/**
 * Organization invitation interface - client-side representation
 */
export interface OrganizationInvitation {
  id: string
  organizationId: string
  email: string
  invitedBy: string
  status: OrganizationInvitationStatus
  token: string
  expiresAt: string
  createdAt: string
  organization?: Organization
  inviter?: {
    id: string
    fullName: string
    email: string
  }
}

/**
 * Database record structure for organization_invitations table
 */
export interface OrganizationInvitationRecord {
  id: string
  organization_id: string
  email: string
  invited_by: string
  status: OrganizationInvitationStatus
  token: string
  expires_at: string
  created_at: string
}
