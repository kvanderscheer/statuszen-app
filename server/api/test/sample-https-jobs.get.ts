/**
 * Get sample HTTPS monitoring job configurations for testing
 * GET /api/test/sample-https-jobs
 */

import type { MonitoringJobData } from '~/types/job-queue'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const format = query.format as string || 'all'

  // Sample HTTPS monitoring jobs that match real app usage
  const samples = {
    basic: {
      description: 'Basic HTTPS check',
      monitor: {
        id: 'monitor_https_basic_001',
        name: 'Basic HTTPS Monitor',
        url: 'https://httpbin.org/status/200',
        type: 'https' as const,
        check_interval_minutes: 5,
        config: {
          timeout: 30,
          expectedStatus: 200,
          followRedirects: true,
          validateSSL: true,
          sslExpiry: true,
          sslExpiryDays: 30,
          maxResponseTime: 5000
        },
        organization_id: 'org_test_basic',
        preferred_region: 'us-east' as const
      },
      expectedJobData: {
        monitor_id: 'monitor_https_basic_001',
        url: 'https://httpbin.org/status/200',
        type: 'https' as const,
        config: {
          timeout: 30,
          expectedStatus: 200,
          followRedirects: true,
          validateSSL: true,
          sslExpiry: true,
          sslExpiryDays: 30,
          maxResponseTime: 5000,
          check_interval_minutes: 5,
          preferred_region: 'us-east'
        },
        organization_id: 'org_test_basic',
        scheduled_at: new Date().toISOString(),
        timeout_seconds: 30,
        retry_count: 0
      } as MonitoringJobData
    },

    advanced: {
      description: 'Advanced HTTPS check with headers and text validation',
      monitor: {
        id: 'monitor_https_advanced_002',
        name: 'Advanced HTTPS Monitor',
        url: 'https://httpbin.org/json',
        type: 'https' as const,
        check_interval_minutes: 2,
        config: {
          timeout: 45,
          expectedStatus: 200,
          followRedirects: true,
          validateSSL: true,
          sslExpiry: true,
          sslExpiryDays: 14,
          maxResponseTime: 3000,
          headers: {
            'User-Agent': 'StatusZen Monitor/2.0',
            'Accept': 'application/json',
            'X-Test-Header': 'monitoring'
          },
          expectedText: '"slideshow"',
          unexpectedText: 'error',
          method: 'GET'
        },
        organization_id: 'org_test_advanced',
        preferred_region: 'eu-west' as const
      },
      expectedJobData: {
        monitor_id: 'monitor_https_advanced_002',
        url: 'https://httpbin.org/json',
        type: 'https' as const,
        config: {
          timeout: 45,
          expectedStatus: 200,
          followRedirects: true,
          validateSSL: true,
          sslExpiry: true,
          sslExpiryDays: 14,
          maxResponseTime: 3000,
          headers: {
            'User-Agent': 'StatusZen Monitor/2.0',
            'Accept': 'application/json',
            'X-Test-Header': 'monitoring'
          },
          expectedText: '"slideshow"',
          unexpectedText: 'error',
          method: 'GET',
          check_interval_minutes: 2,
          preferred_region: 'eu-west'
        },
        organization_id: 'org_test_advanced',
        scheduled_at: new Date().toISOString(),
        timeout_seconds: 45,
        retry_count: 0
      } as MonitoringJobData
    },

    ecommerce: {
      description: 'E-commerce site monitoring',
      monitor: {
        id: 'monitor_ecommerce_003',
        name: 'E-commerce Site Monitor',
        url: 'https://httpbin.org/delay/1',
        type: 'https' as const,
        check_interval_minutes: 1, // High frequency for critical site
        config: {
          timeout: 20,
          expectedStatus: 200,
          followRedirects: true,
          validateSSL: true,
          sslExpiry: true,
          sslExpiryDays: 7, // Alert sooner for critical sites
          maxResponseTime: 2000, // Strict performance requirement
          headers: {
            'User-Agent': 'StatusZen E-commerce Monitor/1.0',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Encoding': 'gzip, deflate'
          },
          expectedText: 'httpbin',
          method: 'GET'
        },
        organization_id: 'org_ecommerce_prod',
        preferred_region: 'us-east' as const
      },
      expectedJobData: {
        monitor_id: 'monitor_ecommerce_003',
        url: 'https://httpbin.org/delay/1',
        type: 'https' as const,
        config: {
          timeout: 20,
          expectedStatus: 200,
          followRedirects: true,
          validateSSL: true,
          sslExpiry: true,
          sslExpiryDays: 7,
          maxResponseTime: 2000,
          headers: {
            'User-Agent': 'StatusZen E-commerce Monitor/1.0',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Encoding': 'gzip, deflate'
          },
          expectedText: 'httpbin',
          method: 'GET',
          check_interval_minutes: 1,
          preferred_region: 'us-east'
        },
        organization_id: 'org_ecommerce_prod',
        scheduled_at: new Date().toISOString(),
        timeout_seconds: 20,
        retry_count: 0
      } as MonitoringJobData
    }
  }

  // Return specific sample or all samples
  switch (format) {
    case 'basic':
      return { sample: samples.basic, curlExample: getCurlExample('basic', samples.basic) }
    case 'advanced':
      return { sample: samples.advanced, curlExample: getCurlExample('advanced', samples.advanced) }
    case 'ecommerce':
      return { sample: samples.ecommerce, curlExample: getCurlExample('ecommerce', samples.ecommerce) }
    default:
      return {
        samples,
        usage: {
          description: 'Sample HTTPS monitoring job configurations',
          endpoints: {
            'GET /api/test/sample-https-jobs': 'Get all samples',
            'GET /api/test/sample-https-jobs?format=basic': 'Get basic sample',
            'GET /api/test/sample-https-jobs?format=advanced': 'Get advanced sample',
            'GET /api/test/sample-https-jobs?format=ecommerce': 'Get e-commerce sample',
            'POST /api/test/create-https-job': 'Create actual job from sample'
          }
        },
        curlExamples: {
          basic: getCurlExample('basic', samples.basic),
          advanced: getCurlExample('advanced', samples.advanced),
          ecommerce: getCurlExample('ecommerce', samples.ecommerce)
        }
      }
  }
})

function getCurlExample(type: string, sample: any) {
  const payload = {
    monitorId: sample.monitor.id,
    name: sample.monitor.name,
    url: sample.monitor.url,
    checkInterval: sample.monitor.check_interval_minutes,
    timeout: sample.monitor.config.timeout,
    expectedStatus: sample.monitor.config.expectedStatus,
    region: sample.monitor.preferred_region,
    organizationId: sample.monitor.organization_id,
    ...sample.monitor.config
  }

  return `curl -X POST http://localhost:3000/api/test/create-https-job \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`
}