import type { MonitoringResult } from '../../../app/types/results'

/**
 * Test endpoint for results processor with sample data
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const jobType = (query.type as string) || 'HTTP_CHECK'
    
    console.info(`🧪 Testing results processor with ${jobType} sample data`)
    
    // Generate sample monitoring results based on job type
    const sampleResult = generateSampleResult(jobType as any)
    
    // Test manual processing
    const response = await $fetch('/api/results/manual-process', {
      method: 'POST',
      body: {
        result: sampleResult,
        skipValidation: false
      }
    })
    
    return {
      success: true,
      message: `Successfully tested ${jobType} result processing`,
      sampleData: sampleResult,
      processingResult: response,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Test processing failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }
  }
})

/**
 * Generate sample monitoring result for testing
 */
function generateSampleResult(jobType: string): MonitoringResult {
  const baseResult = {
    jobId: `test-${crypto.randomUUID()}`,
    monitorId: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    jobType: jobType as any,
    success: Math.random() > 0.2, // 80% success rate
    execution: {
      region: 'us-east' as const,
      executedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + 1500).toISOString(),
      attemptNumber: 1,
      workerVersion: 'test-worker-1.0.0',
      workerId: 'test-worker-001'
    },
    timing: {
      total: 1234,
      dns: 45,
      connect: 123,
      ssl: 234,
      send: 12,
      wait: 456,
      receive: 234
    },
    metadata: {
      targetIp: '203.0.113.1',
      targetLocation: 'US-East',
      networkPath: 'direct' as const,
      userAgent: 'StatusZen Monitor/1.0'
    }
  }
  
  switch (jobType) {
    case 'HTTP_CHECK':
      return {
        ...baseResult,
        statusCode: 200,
        httpResult: {
          statusCode: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-cache',
            'server': 'nginx/1.20.1'
          },
          bodySize: 1024,
          finalUrl: 'https://api.example.com/health',
          redirectCount: 0,
          redirectChain: [],
          contentType: 'application/json',
          encoding: 'gzip',
          firstByteTime: 456,
          downloadTime: 234,
          expectedStatus: true,
          sslValid: true
        }
      }
      
    case 'HTTPS_CHECK':
      return {
        ...baseResult,
        statusCode: 200,
        httpResult: {
          statusCode: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json',
            'strict-transport-security': 'max-age=31536000'
          },
          bodySize: 512,
          finalUrl: 'https://secure.example.com/api',
          redirectCount: 1,
          redirectChain: ['https://example.com/api'],
          contentType: 'application/json',
          firstByteTime: 456,
          downloadTime: 234,
          expectedStatus: true,
          sslValid: true
        },
        httpsResult: {
          statusCode: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json',
            'strict-transport-security': 'max-age=31536000'
          },
          bodySize: 512,
          finalUrl: 'https://secure.example.com/api',
          redirectCount: 1,
          redirectChain: ['https://example.com/api'],
          contentType: 'application/json',
          firstByteTime: 456,
          downloadTime: 234,
          expectedStatus: true,
          sslValid: true,
          ssl: {
            valid: true,
            protocol: 'TLSv1.3',
            cipher: 'TLS_AES_256_GCM_SHA384',
            certificate: {
              subject: 'CN=*.example.com',
              issuer: 'CN=Let\'s Encrypt Authority X3',
              validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
              daysUntilExpiry: 60,
              fingerprint: 'a1:b2:c3:d4:e5:f6:a1:b2:c3:d4:e5:f6:a1:b2:c3:d4:e5:f6:a1:b2',
              serialNumber: '03:a3:0e:d9:8d:6c:45:89:2a:b1:c2:d3',
              subjectAltNames: ['*.example.com', 'example.com'],
              hostnameMatch: true,
              chainValid: true,
              selfSigned: false,
              revoked: false
            },
            security: {
              grade: 'A+',
              weakCipher: false,
              deprecatedProtocol: false,
              vulnerabilities: []
            }
          }
        }
      }
      
    case 'SSL_CHECK':
      return {
        ...baseResult,
        sslResult: {
          connected: true,
          protocol: 'TLSv1.3',
          cipher: 'TLS_AES_256_GCM_SHA384',
          certificates: [{
            subject: 'CN=secure.example.com',
            issuer: 'CN=DigiCert SHA2 Extended Validation Server CA',
            validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            daysUntilExpiry: 60,
            fingerprint: 'a1:b2:c3:d4:e5:f6:a1:b2:c3:d4:e5:f6:a1:b2:c3:d4:e5:f6:a1:b2',
            serialNumber: '03:a3:0e:d9:8d:6c:45:89:2a:b1:c2:d3',
            publicKeyAlgorithm: 'RSA',
            publicKeySize: 2048,
            signatureAlgorithm: 'SHA256withRSA',
            subjectAltNames: ['secure.example.com', 'www.secure.example.com'],
            hostnameMatch: true,
            selfSigned: false,
            revoked: false,
            chainPosition: 0
          }],
          chainValid: true,
          chainLength: 3,
          rootCaKnown: true,
          security: {
            grade: 'A',
            issues: [],
            recommendations: ['Consider upgrading to TLS 1.3 for improved security']
          },
          ocsp: {
            status: 'good',
            responseTime: 123,
            responderUrl: 'http://ocsp.digicert.com'
          }
        }
      }
      
    case 'PING_CHECK':
      const successfulPings = Math.floor(Math.random() * 2) + 3 // 3-4 successful pings out of 4
      return {
        ...baseResult,
        pingResult: {
          packetsTransmitted: 4,
          packetsReceived: successfulPings,
          packetLossPercentage: ((4 - successfulPings) / 4) * 100,
          timing: {
            min: 12.5,
            max: 23.7,
            avg: 18.2,
            stddev: 4.1,
            median: 17.8
          },
          pings: [
            { sequence: 1, responseTime: 16.2, ttl: 64, success: true },
            { sequence: 2, responseTime: 18.7, ttl: 64, success: true },
            { sequence: 3, responseTime: 12.5, ttl: 64, success: true },
            { 
              sequence: 4, 
              responseTime: successfulPings === 4 ? 23.7 : 0, 
              ttl: successfulPings === 4 ? 64 : 0, 
              success: successfulPings === 4,
              errorMessage: successfulPings === 4 ? undefined : 'Request timeout'
            }
          ],
          targetIp: '203.0.113.1',
          targetHostname: 'example.com',
          thresholds: {
            latencyPassed: true,
            successRatePassed: successfulPings >= 3,
            packetLossPassed: ((4 - successfulPings) / 4) * 100 <= 25
          }
        }
      }
      
    default:
      throw new Error(`Unsupported job type: ${jobType}`)
  }
}