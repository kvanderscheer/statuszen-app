import type { TimezoneOption } from '~/types/auth'

// Common timezone options grouped by region
export const timezoneOptions: TimezoneOption[] = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', group: 'UTC' },

  // America
  { value: 'America/New_York', label: 'Eastern Time (New York)', group: 'America' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', group: 'America' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', group: 'America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', group: 'America' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', group: 'America' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', group: 'America' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', group: 'America' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', group: 'America' },
  { value: 'America/Mexico_City', label: 'Central Time (Mexico City)', group: 'America' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)', group: 'America' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time (Buenos Aires)', group: 'America' },

  // Europe
  { value: 'Europe/London', label: 'Greenwich Mean Time (London)', group: 'Europe' },
  { value: 'Europe/Dublin', label: 'Greenwich Mean Time (Dublin)', group: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)', group: 'Europe' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', group: 'Europe' },
  { value: 'Europe/Rome', label: 'Central European Time (Rome)', group: 'Europe' },
  { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', group: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Central European Time (Amsterdam)', group: 'Europe' },
  { value: 'Europe/Zurich', label: 'Central European Time (Zurich)', group: 'Europe' },
  { value: 'Europe/Vienna', label: 'Central European Time (Vienna)', group: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Central European Time (Stockholm)', group: 'Europe' },
  { value: 'Europe/Athens', label: 'Eastern European Time (Athens)', group: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Eastern European Time (Helsinki)', group: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow Standard Time', group: 'Europe' },

  // Asia
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', group: 'Asia' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (Seoul)', group: 'Asia' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', group: 'Asia' },
  { value: 'Asia/Beijing', label: 'China Standard Time (Beijing)', group: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time', group: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time', group: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia Time', group: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (Bangkok)', group: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Western Indonesian Time', group: 'Asia' },
  { value: 'Asia/Manila', label: 'Philippine Standard Time', group: 'Asia' },
  { value: 'Asia/Kolkata', label: 'India Standard Time', group: 'Asia' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', group: 'Asia' },
  { value: 'Asia/Riyadh', label: 'Arabia Standard Time (Riyadh)', group: 'Asia' },
  { value: 'Asia/Jerusalem', label: 'Israel Standard Time', group: 'Asia' },

  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', group: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)', group: 'Australia' },
  { value: 'Australia/Brisbane', label: 'Australian Eastern Time (Brisbane)', group: 'Australia' },
  { value: 'Australia/Perth', label: 'Australian Western Time (Perth)', group: 'Australia' },
  { value: 'Australia/Adelaide', label: 'Australian Central Time (Adelaide)', group: 'Australia' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)', group: 'Pacific' },
  { value: 'Pacific/Fiji', label: 'Fiji Time', group: 'Pacific' },

  // Africa
  { value: 'Africa/Cairo', label: 'Eastern European Time (Cairo)', group: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time', group: 'Africa' },
  { value: 'Africa/Lagos', label: 'West Africa Time (Lagos)', group: 'Africa' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (Nairobi)', group: 'Africa' }
]

// Group timezones by region for easier selection
export const timezoneGroups = timezoneOptions.reduce((groups, tz) => {
  if (!groups[tz.group]) {
    groups[tz.group] = []
  }
  groups[tz.group]!.push(tz)
  return groups
}, {} as Record<string, TimezoneOption[]>)

// Get user's current timezone
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

// Format timezone display with current time
export const formatTimezoneWithTime = (timezone: string): string => {
  try {
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const option = timezoneOptions.find(tz => tz.value === timezone)
    return option ? `${option.label} (${time})` : `${timezone} (${time})`
  } catch {
    const option = timezoneOptions.find(tz => tz.value === timezone)
    return option ? option.label : timezone
  }
}
