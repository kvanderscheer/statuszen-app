import type { Ref } from 'vue'
import type { ApiResponse } from './organization'

// Core Monitor Types

/**
 * Monitor type enum for different monitoring methods
 */
export type MonitorType = 'http' | 'https' | 'ping' | 'ssl'

/**
 * Supported monitoring regions
 */
export type MonitorRegion = 'us-east' | 'us-west' | 'eu-west' | 'eu-central' | 'ap-south' | 'ap-southeast' | 'local'

/**
 * Monitor status for UI display
 */
export type MonitorStatus = 'active' | 'inactive' | 'pending' | 'error'

// Configuration Interfaces by Monitor Type

/**
 * HTTP/HTTPS monitor specific configuration
 */
export interface HttpMonitorConfig {
  timeout?: number // seconds, default 10
  expectedStatus?: number // HTTP status code, default 200
  followRedirects?: boolean // default true
  userAgent?: string
  headers?: Record<string, string>
  body?: string // for POST requests
  method?: 'GET' | 'POST' | 'PUT' | 'HEAD' // default GET
}

/**
 * PING monitor specific configuration
 */
export interface PingMonitorConfig {
  timeout?: number // seconds, default 5
  packetCount?: number // number of packets, default 3
  packetSize?: number // bytes, default 56
}

/**
 * SSL certificate monitor specific configuration
 */
export interface SslMonitorConfig {
  daysBeforeExpiryAlert?: number // default 30
  verifyChain?: boolean // default true
  checkRevocation?: boolean // default false
  allowSelfSigned?: boolean // default false
}

/**
 * Union type for all monitor configurations
 */
export type MonitorConfig = HttpMonitorConfig | PingMonitorConfig | SslMonitorConfig

// Core Monitor Interface

/**
 * Monitor interface - client-side representation
 */
export interface Monitor {
  id: string
  organizationId: string
  name: string
  url: string
  type: MonitorType
  config: MonitorConfig
  checkIntervalMinutes: number
  preferredRegion: MonitorRegion
  lastScheduledAt?: string
  nextCheckAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Database record structure for monitors table
 */
export interface MonitorRecord {
  id: string
  organization_id: string
  name: string
  url: string
  type: MonitorType
  config: Record<string, any> // JSONB storage
  check_interval_minutes: number
  preferred_region: MonitorRegion
  last_scheduled_at?: string
  next_check_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// API Response Interfaces

/**
 * Response for monitor list endpoint
 */
export interface MonitorsListResponse extends ApiResponse {
  data: Monitor[]
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

/**
 * Response for single monitor endpoint
 */
export interface MonitorResponse extends ApiResponse {
  data: Monitor
}

/**
 * Response for monitor creation/update operations
 */
export interface MonitorMutationResponse extends ApiResponse {
  data: Monitor
}

/**
 * Response for monitor deletion
 */
export interface MonitorDeleteResponse extends ApiResponse {
  data: {
    id: string
    deleted: boolean
  }
}

// Form Data Interfaces

/**
 * Form data for creating a new monitor
 */
export interface CreateMonitorData {
  name: string
  url: string
  type: MonitorType
  config?: MonitorConfig
  checkIntervalMinutes?: number
  preferredRegion?: MonitorRegion
  organizationId: string
}

/**
 * Form data for updating a monitor
 */
export interface UpdateMonitorData {
  name?: string
  url?: string
  type?: MonitorType
  config?: MonitorConfig
  checkIntervalMinutes?: number
  preferredRegion?: MonitorRegion
  isActive?: boolean
}

/**
 * Form data for bulk operations
 */
export interface BulkMonitorOperationData {
  monitorIds: string[]
  operation: 'activate' | 'deactivate' | 'delete'
}

// Validation Interfaces

/**
 * Validation error structure for monitor forms
 */
export interface MonitorValidationError {
  field: string
  message: string
}

/**
 * Validation state for monitor forms
 */
export interface MonitorFormValidationState {
  name: MonitorValidationError | null
  url: MonitorValidationError | null
  type: MonitorValidationError | null
  config: MonitorValidationError | null
  checkIntervalMinutes: MonitorValidationError | null
  preferredRegion: MonitorValidationError | null
  general: MonitorValidationError | null
}

/**
 * Validation result for monitor operations
 */
export interface MonitorValidationResult {
  isValid: boolean
  errors: MonitorValidationError[]
}

// Utility Types

/**
 * Monitor with computed properties for UI
 */
export interface MonitorWithMetadata extends Monitor {
  status: MonitorStatus
  statusText: string
  nextCheckIn?: string // human readable time until next check
  canEdit: boolean
  canDelete: boolean
  canToggle: boolean
  configSummary: string // human readable config summary
}

/**
 * Monitor type configuration with descriptions
 */
export interface MonitorTypeOption {
  value: MonitorType
  label: string
  description: string
  icon: string
  defaultConfig: MonitorConfig
  configFields: Array<{
    key: string
    label: string
    type: 'number' | 'string' | 'boolean' | 'select'
    required?: boolean
    default?: any
    options?: string[]
    min?: number
    max?: number
    placeholder?: string
    help?: string
  }>
}

/**
 * Monitor region option with details
 */
export interface MonitorRegionOption {
  value: MonitorRegion
  label: string
  flag: string // country flag emoji or icon
  latency?: number // estimated latency in ms
  available: boolean
}

/**
 * Monitor interval preset options
 */
export interface MonitorIntervalOption {
  value: number // minutes
  label: string
  description: string
  recommended?: boolean
}

// State Management Types

/**
 * Monitor state for composables
 */
export interface MonitorState {
  monitors: MonitorWithMetadata[]
  currentMonitor: Monitor | null
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  lastFetch?: Date
}

/**
 * Monitor context for dependency injection
 */
export interface MonitorContext {
  monitors: Readonly<Ref<MonitorWithMetadata[]>>
  currentMonitor: Readonly<Ref<Monitor | null>>
  fetchMonitors: (organizationId?: string) => Promise<void>
  createMonitor: (data: CreateMonitorData) => Promise<Monitor>
  updateMonitor: (id: string, data: UpdateMonitorData) => Promise<Monitor>
  deleteMonitor: (id: string) => Promise<boolean>
  toggleMonitor: (id: string) => Promise<Monitor>
  refreshMonitor: (id: string) => Promise<Monitor>
  getMonitorById: (id: string) => Monitor | null
}

/**
 * Monitor filter options for list views
 */
export interface MonitorFilters {
  type?: MonitorType[]
  status?: MonitorStatus[]
  region?: MonitorRegion[]
  search?: string
  organizationId?: string
}

/**
 * Monitor sort options
 */
export interface MonitorSort {
  field: 'name' | 'type' | 'createdAt' | 'updatedAt' | 'nextCheckAt'
  direction: 'asc' | 'desc'
}

/**
 * Monitor list query parameters
 */
export interface MonitorListQuery {
  page?: number
  limit?: number
  filters?: MonitorFilters
  sort?: MonitorSort
}

// Error Types

/**
 * Monitor-specific error codes
 */
export type MonitorErrorCode
  = | 'MONITOR_NOT_FOUND'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'INVALID_MONITOR_TYPE'
    | 'INVALID_URL_FORMAT'
    | 'INVALID_INTERVAL'
    | 'INVALID_REGION'
    | 'INVALID_CONFIG'
    | 'CONFIG_VALIDATION_FAILED'
    | 'ORGANIZATION_NOT_FOUND'
    | 'MONITOR_LIMIT_EXCEEDED'
    | 'DUPLICATE_MONITOR_NAME'
    | 'RATE_LIMIT_EXCEEDED'

/**
 * Monitor error with code and context
 */
export interface MonitorError {
  code: MonitorErrorCode
  message: string
  field?: string
  context?: Record<string, any>
}

// Constants and Defaults

/**
 * Default monitor configurations by type
 */
export const DEFAULT_MONITOR_CONFIGS: Record<MonitorType, MonitorConfig> = {
  http: {
    timeout: 10,
    expectedStatus: 200,
    followRedirects: true,
    method: 'GET'
  } as HttpMonitorConfig,
  https: {
    timeout: 10,
    expectedStatus: 200,
    followRedirects: true,
    method: 'GET'
  } as HttpMonitorConfig,
  ping: {
    timeout: 5,
    packetCount: 3,
    packetSize: 56
  } as PingMonitorConfig,
  ssl: {
    daysBeforeExpiryAlert: 30,
    verifyChain: true,
    checkRevocation: false,
    allowSelfSigned: false
  } as SslMonitorConfig
}

/**
 * Monitor interval presets in minutes
 */
export const MONITOR_INTERVALS: MonitorIntervalOption[] = [
  { value: 1, label: '1 minute', description: 'Maximum frequency', recommended: false },
  { value: 5, label: '5 minutes', description: 'High frequency', recommended: true },
  { value: 10, label: '10 minutes', description: 'Standard monitoring', recommended: true },
  { value: 15, label: '15 minutes', description: 'Regular monitoring', recommended: false },
  { value: 30, label: '30 minutes', description: 'Low frequency', recommended: false },
  { value: 60, label: '1 hour', description: 'Basic monitoring', recommended: false },
  { value: 240, label: '4 hours', description: 'Minimal monitoring', recommended: false },
  { value: 1440, label: '24 hours', description: 'Daily check', recommended: false }
]

/**
 * Available monitoring regions
 */
export const MONITOR_REGIONS: MonitorRegionOption[] = [
  { value: 'us-east', label: 'US East', flag: '🇺🇸', available: true },
  { value: 'us-west', label: 'US West', flag: '🇺🇸', available: true },
  { value: 'eu-west', label: 'EU West', flag: '🇪🇺', available: true },
  { value: 'eu-central', label: 'EU Central', flag: '🇪🇺', available: true },
  { value: 'ap-south', label: 'Asia Pacific South', flag: '🌏', available: false },
  { value: 'ap-southeast', label: 'Asia Pacific Southeast', flag: '🌏', available: false }
]

/**
 * Monitor type configurations with UI metadata
 */
export const MONITOR_TYPES: MonitorTypeOption[] = [
  {
    value: 'http',
    label: 'HTTP',
    description: 'Monitor HTTP endpoints and APIs',
    icon: 'i-lucide-globe',
    defaultConfig: DEFAULT_MONITOR_CONFIGS.http,
    configFields: [
      { key: 'timeout', label: 'Timeout', type: 'number', default: 10, min: 1, max: 60, help: 'Request timeout in seconds' },
      { key: 'expectedStatus', label: 'Expected Status', type: 'number', default: 200, min: 100, max: 599, help: 'Expected HTTP status code' },
      { key: 'followRedirects', label: 'Follow Redirects', type: 'boolean', default: true, help: 'Follow HTTP redirects' },
      { key: 'method', label: 'Method', type: 'select', default: 'GET', options: ['GET', 'POST', 'PUT', 'HEAD'], help: 'HTTP method to use' }
    ]
  },
  {
    value: 'https',
    label: 'HTTPS',
    description: 'Monitor HTTPS endpoints with SSL validation',
    icon: 'i-lucide-shield-check',
    defaultConfig: DEFAULT_MONITOR_CONFIGS.https,
    configFields: [
      { key: 'timeout', label: 'Timeout', type: 'number', default: 10, min: 1, max: 60, help: 'Request timeout in seconds' },
      { key: 'expectedStatus', label: 'Expected Status', type: 'number', default: 200, min: 100, max: 599, help: 'Expected HTTP status code' },
      { key: 'followRedirects', label: 'Follow Redirects', type: 'boolean', default: true, help: 'Follow HTTP redirects' },
      { key: 'method', label: 'Method', type: 'select', default: 'GET', options: ['GET', 'POST', 'PUT', 'HEAD'], help: 'HTTP method to use' }
    ]
  },
  {
    value: 'ping',
    label: 'Ping',
    description: 'Monitor server connectivity with ICMP ping',
    icon: 'i-lucide-radio',
    defaultConfig: DEFAULT_MONITOR_CONFIGS.ping,
    configFields: [
      { key: 'timeout', label: 'Timeout', type: 'number', default: 5, min: 1, max: 30, help: 'Ping timeout in seconds' },
      { key: 'packetCount', label: 'Packet Count', type: 'number', default: 3, min: 1, max: 10, help: 'Number of ping packets' },
      { key: 'packetSize', label: 'Packet Size', type: 'number', default: 56, min: 32, max: 1024, help: 'Ping packet size in bytes' }
    ]
  },
  {
    value: 'ssl',
    label: 'SSL Certificate',
    description: 'Monitor SSL certificate validity and expiration',
    icon: 'i-lucide-certificate',
    defaultConfig: DEFAULT_MONITOR_CONFIGS.ssl,
    configFields: [
      { key: 'daysBeforeExpiryAlert', label: 'Alert Days', type: 'number', default: 30, min: 1, max: 90, help: 'Days before expiry to alert' },
      { key: 'verifyChain', label: 'Verify Chain', type: 'boolean', default: true, help: 'Verify certificate chain' },
      { key: 'checkRevocation', label: 'Check Revocation', type: 'boolean', default: false, help: 'Check certificate revocation status' },
      { key: 'allowSelfSigned', label: 'Allow Self-Signed', type: 'boolean', default: false, help: 'Allow self-signed certificates' }
    ]
  }
]
