import type {
  MonitorValidationError,
  MonitorType,
  MonitorRegion,
  MonitorConfig,
  HttpMonitorConfig,
  PingMonitorConfig,
  SslMonitorConfig,
  CreateMonitorData,
  UpdateMonitorData
} from '~/types/monitor'

// URL Validation Utilities

/**
 * Validates URL format based on monitor type
 */
export const urlValidation = {
  required: (value: string): MonitorValidationError | null => {
    if (!value || value.trim() === '') {
      return { field: 'url', message: 'URL is required' }
    }
    return null
  },

  format: (value: string, type?: MonitorType): MonitorValidationError | null => {
    if (!value) return null

    const trimmedValue = value.trim()

    // Basic URL format validation
    try {
      const url = new URL(trimmedValue)

      // Type-specific validation
      if (type === 'http' && url.protocol !== 'http:') {
        return { field: 'url', message: 'HTTP monitors must use http:// protocol' }
      }

      if (type === 'https' && url.protocol !== 'https:') {
        return { field: 'url', message: 'HTTPS monitors must use https:// protocol' }
      }

      if (type === 'ssl' && url.protocol !== 'https:') {
        return { field: 'url', message: 'SSL monitors must use https:// protocol' }
      }

      if (type === 'ping') {
        // For ping, allow hostname or IP without protocol
        if (url.protocol && !['http:', 'https:'].includes(url.protocol)) {
          return { field: 'url', message: 'Ping monitors should use hostname or IP address' }
        }
      }

      return null
    } catch (error) {
      // If URL constructor fails, try hostname validation for ping
      if (type === 'ping') {
        const hostnameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
        if (hostnameRegex.test(trimmedValue)) {
          return null
        }
      }

      return { field: 'url', message: 'Please enter a valid URL' }
    }
  },

  length: (value: string): MonitorValidationError | null => {
    if (value && (value.length < 8 || value.length > 500)) {
      return { field: 'url', message: 'URL must be between 8 and 500 characters' }
    }
    return null
  }
}

// Monitor Name Validation

export const monitorNameValidation = {
  required: (value: string): MonitorValidationError | null => {
    if (!value || value.trim() === '') {
      return { field: 'name', message: 'Monitor name is required' }
    }
    return null
  },

  length: (value: string): MonitorValidationError | null => {
    if (value && (value.trim().length < 2 || value.trim().length > 255)) {
      return { field: 'name', message: 'Monitor name must be between 2 and 255 characters' }
    }
    return null
  },

  format: (value: string): MonitorValidationError | null => {
    if (value) {
      // Allow letters, numbers, spaces, hyphens, underscores, and common punctuation
      const nameRegex = /^[a-zA-Z0-9\s\-_.,()]+$/
      if (!nameRegex.test(value)) {
        return { field: 'name', message: 'Monitor name contains invalid characters' }
      }
    }
    return null
  }
}

// Monitor Type Validation

export const monitorTypeValidation = {
  required: (value: MonitorType | undefined): MonitorValidationError | null => {
    if (!value) {
      return { field: 'type', message: 'Monitor type is required' }
    }
    return null
  },

  valid: (value: MonitorType): MonitorValidationError | null => {
    const validTypes: MonitorType[] = ['http', 'https', 'ping', 'ssl']
    if (!validTypes.includes(value)) {
      return { field: 'type', message: 'Invalid monitor type' }
    }
    return null
  }
}

// Check Interval Validation

export const intervalValidation = {
  valid: (value: number): MonitorValidationError | null => {
    if (value < 1 || value > 1440) {
      return { field: 'checkIntervalMinutes', message: 'Check interval must be between 1 and 1440 minutes (24 hours)' }
    }
    return null
  },

  recommended: (value: number): MonitorValidationError | null => {
    if (value < 5) {
      return { field: 'checkIntervalMinutes', message: 'Intervals less than 5 minutes may impact performance' }
    }
    return null
  }
}

// Region Validation

export const regionValidation = {
  valid: (value: MonitorRegion): MonitorValidationError | null => {
    const validRegions: MonitorRegion[] = ['us-east', 'us-west', 'eu-west', 'eu-central', 'ap-south', 'ap-southeast', 'local']
    if (!validRegions.includes(value)) {
      return { field: 'preferredRegion', message: 'Invalid monitoring region' }
    }
    return null
  },

  available: (value: MonitorRegion): MonitorValidationError | null => {
    const availableRegions: MonitorRegion[] = ['us-east', 'us-west', 'eu-west', 'eu-central', 'local']
    if (!availableRegions.includes(value)) {
      return { field: 'preferredRegion', message: 'Selected region is not currently available' }
    }
    return null
  }
}

// Configuration Validation by Type

export const configValidation = {
  http: (config: HttpMonitorConfig): MonitorValidationError | null => {
    if (config.timeout && (config.timeout < 1 || config.timeout > 60)) {
      return { field: 'config', message: 'HTTP timeout must be between 1 and 60 seconds' }
    }

    if (config.expectedStatus && (config.expectedStatus < 100 || config.expectedStatus > 599)) {
      return { field: 'config', message: 'Expected status code must be between 100 and 599' }
    }

    if (config.method && !['GET', 'POST', 'PUT', 'HEAD'].includes(config.method)) {
      return { field: 'config', message: 'Invalid HTTP method' }
    }

    return null
  },

  https: (config: HttpMonitorConfig): MonitorValidationError | null => {
    // HTTPS uses same validation as HTTP
    return configValidation.http(config)
  },

  ping: (config: PingMonitorConfig): MonitorValidationError | null => {
    if (config.timeout && (config.timeout < 1 || config.timeout > 30)) {
      return { field: 'config', message: 'Ping timeout must be between 1 and 30 seconds' }
    }

    if (config.packetCount && (config.packetCount < 1 || config.packetCount > 10)) {
      return { field: 'config', message: 'Packet count must be between 1 and 10' }
    }

    if (config.packetSize && (config.packetSize < 32 || config.packetSize > 1024)) {
      return { field: 'config', message: 'Packet size must be between 32 and 1024 bytes' }
    }

    return null
  },

  ssl: (config: SslMonitorConfig): MonitorValidationError | null => {
    if (config.daysBeforeExpiryAlert && (config.daysBeforeExpiryAlert < 1 || config.daysBeforeExpiryAlert > 90)) {
      return { field: 'config', message: 'Alert days must be between 1 and 90' }
    }

    return null
  }
}

// Combined Configuration Validation

export const validateMonitorConfig = (type: MonitorType, config: MonitorConfig): MonitorValidationError | null => {
  if (!config) return null

  switch (type) {
    case 'http':
    case 'https':
      return configValidation.http(config as HttpMonitorConfig)
    case 'ping':
      return configValidation.ping(config as PingMonitorConfig)
    case 'ssl':
      return configValidation.ssl(config as SslMonitorConfig)
    default:
      return { field: 'config', message: 'Invalid monitor type for configuration' }
  }
}

// Organization Validation

export const organizationValidation = {
  required: (value: string | undefined): MonitorValidationError | null => {
    if (!value || value.trim() === '') {
      return { field: 'organizationId', message: 'Organization is required' }
    }
    return null
  },

  format: (value: string): MonitorValidationError | null => {
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (value && !uuidRegex.test(value)) {
      return { field: 'organizationId', message: 'Invalid organization ID format' }
    }
    return null
  }
}

// Field-level Validation Functions

export const validateMonitorField = (field: string, value: any, type?: MonitorType): MonitorValidationError | null => {
  switch (field) {
    case 'name':
      return monitorNameValidation.required(value)
        || monitorNameValidation.length(value)
        || monitorNameValidation.format(value)

    case 'url':
      return urlValidation.required(value)
        || urlValidation.format(value, type)
        || urlValidation.length(value)

    case 'type':
      return monitorTypeValidation.required(value)
        || monitorTypeValidation.valid(value)

    case 'checkIntervalMinutes':
      return value !== undefined ? intervalValidation.valid(value) : null

    case 'preferredRegion':
      return value ? (regionValidation.valid(value) || regionValidation.available(value)) : null

    case 'organizationId':
      return organizationValidation.required(value)
        || organizationValidation.format(value)

    case 'config':
      return type && value ? validateMonitorConfig(type, value) : null

    default:
      return null
  }
}

// Form-level Validation Functions

export const validateCreateMonitorData = (data: CreateMonitorData): MonitorValidationError[] => {
  const errors: MonitorValidationError[] = []

  // Validate each field
  const fields: (keyof CreateMonitorData)[] = ['name', 'url', 'type', 'organizationId']
  fields.forEach((field) => {
    const error = validateMonitorField(field, data[field], data.type)
    if (error) {
      errors.push(error)
    }
  })

  // Validate optional fields if present
  if (data.checkIntervalMinutes !== undefined) {
    const error = validateMonitorField('checkIntervalMinutes', data.checkIntervalMinutes)
    if (error) errors.push(error)
  }

  if (data.preferredRegion) {
    const error = validateMonitorField('preferredRegion', data.preferredRegion)
    if (error) errors.push(error)
  }

  if (data.config) {
    const error = validateMonitorField('config', data.config, data.type)
    if (error) errors.push(error)
  }

  return errors
}

export const validateUpdateMonitorData = (data: UpdateMonitorData, currentType?: MonitorType): MonitorValidationError[] => {
  const errors: MonitorValidationError[] = []

  // Validate each field if present
  if (data.name !== undefined) {
    const error = validateMonitorField('name', data.name)
    if (error) errors.push(error)
  }

  if (data.url !== undefined) {
    const error = validateMonitorField('url', data.url, data.type || currentType)
    if (error) errors.push(error)
  }

  if (data.type !== undefined) {
    const error = validateMonitorField('type', data.type)
    if (error) errors.push(error)
  }

  if (data.checkIntervalMinutes !== undefined) {
    const error = validateMonitorField('checkIntervalMinutes', data.checkIntervalMinutes)
    if (error) errors.push(error)
  }

  if (data.preferredRegion !== undefined) {
    const error = validateMonitorField('preferredRegion', data.preferredRegion)
    if (error) errors.push(error)
  }

  if (data.config !== undefined) {
    const error = validateMonitorField('config', data.config, data.type || currentType)
    if (error) errors.push(error)
  }

  return errors
}

// Comprehensive Validation Function

export const validateAllMonitorFields = (data: Record<string, any>, type?: MonitorType): MonitorValidationError[] => {
  const errors: MonitorValidationError[] = []

  Object.keys(data).forEach((field) => {
    const error = validateMonitorField(field, data[field], type)
    if (error) {
      errors.push(error)
    }
  })

  return errors
}

// Validation Result Helper

export const getValidationResult = (errors: MonitorValidationError[]) => {
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Monitor URL Processing

export const processMonitorUrl = (url: string, type: MonitorType): string => {
  if (!url) return url

  const trimmedUrl = url.trim()

  // For ping monitors, ensure no protocol is included
  if (type === 'ping') {
    try {
      const urlObj = new URL(trimmedUrl)
      return urlObj.hostname
    } catch {
      // If it's not a valid URL, assume it's already a hostname/IP
      return trimmedUrl
    }
  }

  // For HTTP/HTTPS/SSL, ensure proper protocol
  if ((type === 'http' || type === 'https' || type === 'ssl') && !trimmedUrl.startsWith('http')) {
    const protocol = type === 'http' ? 'http://' : 'https://'
    return protocol + trimmedUrl
  }

  return trimmedUrl
}

// Configuration Helpers

export const getDefaultConfigForType = (type: MonitorType): MonitorConfig => {
  switch (type) {
    case 'http':
    case 'https':
      return {
        timeout: 10,
        expectedStatus: 200,
        followRedirects: true,
        method: 'GET'
      } as HttpMonitorConfig
    case 'ping':
      return {
        timeout: 5,
        packetCount: 3,
        packetSize: 56
      } as PingMonitorConfig
    case 'ssl':
      return {
        daysBeforeExpiryAlert: 30,
        verifyChain: true,
        checkRevocation: false,
        allowSelfSigned: false
      } as SslMonitorConfig
    default:
      return {}
  }
}

export const mergeConfigWithDefaults = (type: MonitorType, config: Partial<MonitorConfig>): MonitorConfig => {
  const defaults = getDefaultConfigForType(type)
  return { ...defaults, ...config }
}

// Validation State Helpers for Forms

export const createEmptyValidationState = () => ({
  name: null,
  url: null,
  type: null,
  config: null,
  checkIntervalMinutes: null,
  preferredRegion: null,
  general: null
})

export const errorsToValidationState = (errors: MonitorValidationError[]) => {
  const state = createEmptyValidationState()

  errors.forEach((error) => {
    switch (error.field) {
      case 'name':
        state.name = error
        break
      case 'url':
        state.url = error
        break
      case 'type':
        state.type = error
        break
      case 'config':
        state.config = error
        break
      case 'checkIntervalMinutes':
        state.checkIntervalMinutes = error
        break
      case 'preferredRegion':
        state.preferredRegion = error
        break
      default:
        if (!state.general) state.general = error
        break
    }
  })

  return state
}
