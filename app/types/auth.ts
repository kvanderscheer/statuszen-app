export interface SignupFormData {
  email: string
  password: string
  fullName: string
  company?: string
  plan: 'free' | 'pro' | 'enterprise'
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
export type TimezoneGroup = 
  | 'America'
  | 'Europe'
  | 'Asia'
  | 'Africa'
  | 'Australia'
  | 'Pacific'
