import type { ValidationError } from '~/types/auth'

export const emailValidation = {
  required: (value: string): ValidationError | null => {
    if (!value || value.trim() === '') {
      return { field: 'email', message: 'Email is required' }
    }
    return null
  },

  format: (value: string): ValidationError | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return { field: 'email', message: 'Please enter a valid email address' }
    }
    return null
  }
}

export const passwordValidation = {
  required: (value: string): ValidationError | null => {
    if (!value || value.trim() === '') {
      return { field: 'password', message: 'Password is required' }
    }
    return null
  },

  minLength: (value: string): ValidationError | null => {
    if (value.length < 8) {
      return { field: 'password', message: 'Password must be at least 8 characters long' }
    }
    return null
  },

  strength: (value: string): ValidationError | null => {
    const hasUpperCase = /[A-Z]/.test(value)
    const hasLowerCase = /[a-z]/.test(value)
    const hasNumbers = /\d/.test(value)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value)

    const criteriaCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length

    if (criteriaCount < 3) {
      return {
        field: 'password',
        message: 'Password must contain at least 3 of: uppercase, lowercase, numbers, or special characters'
      }
    }
    return null
  }
}

export const nameValidation = {
  required: (value: string): ValidationError | null => {
    if (!value || value.trim() === '') {
      return { field: 'fullName', message: 'Full name is required' }
    }
    return null
  },

  minLength: (value: string): ValidationError | null => {
    if (value.trim().length < 2) {
      return { field: 'fullName', message: 'Full name must be at least 2 characters long' }
    }
    return null
  },

  format: (value: string): ValidationError | null => {
    const nameRegex = /^[a-zA-Z\s'-]+$/
    if (!nameRegex.test(value)) {
      return { field: 'fullName', message: 'Full name can only contain letters, spaces, hyphens, and apostrophes' }
    }
    return null
  }
}

export const companyValidation = {
  format: (value: string): ValidationError | null => {
    if (value && value.trim().length > 0 && value.trim().length < 2) {
      return { field: 'company', message: 'Company name must be at least 2 characters long' }
    }
    return null
  }
}

export const validateField = (field: string, value: string): ValidationError | null => {
  switch (field) {
    case 'email':
      return emailValidation.required(value) || emailValidation.format(value)

    case 'password':
      return passwordValidation.required(value)
        || passwordValidation.minLength(value)
        || passwordValidation.strength(value)

    case 'fullName':
      return nameValidation.required(value)
        || nameValidation.minLength(value)
        || nameValidation.format(value)

    case 'company':
      return companyValidation.format(value)

    default:
      return null
  }
}

export const validateAllFields = (data: Record<string, string>): ValidationError[] => {
  const errors: ValidationError[] = []

  Object.keys(data).forEach((field) => {
    const error = validateField(field, data[field] || '')
    if (error) {
      errors.push(error)
    }
  })

  return errors
}

export const getPasswordStrength = (password: string): { strength: number, label: string, color: string } => {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  ]

  const strength = checks.filter(Boolean).length

  if (strength === 0) return { strength: 0, label: 'Very Weak', color: 'red' }
  if (strength <= 2) return { strength: 20, label: 'Weak', color: 'red' }
  if (strength === 3) return { strength: 60, label: 'Good', color: 'orange' }
  if (strength === 4) return { strength: 80, label: 'Strong', color: 'blue' }
  return { strength: 100, label: 'Very Strong', color: 'green' }
}
