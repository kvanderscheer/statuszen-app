# BullMQ Message Specification for Backend Workers

## Overview

This document specifies the exact message formats, queue structures, and processing requirements for the StatusZen monitoring system's BullMQ implementation. Backend workers must implement handlers for all specified job types and produce results in the defined formats.

## Queue Architecture

### Queue Names and Purposes

| Queue Name | Purpose | Worker Location | Concurrency |
|------------|---------|----------------|-------------|
| `monitoring-us-east` | Monitoring jobs for US East region | Vercel iad1 | 5 |
| `monitoring-eu-west` | Monitoring jobs for EU West region | Vercel fra1 | 5 |
| `results` | Completed monitoring results | Main API | 10 |
| `alerts` | Alert notifications to be sent | Main API | 3 |

### Queue Configuration

```javascript
// Standard BullMQ configuration for all queues
const queueConfig = {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
  settings: {
    stalledInterval: 30000,
    maxStalledCount: 1,
  }
};
```

## Job Types & Message Formats

### 1. HTTP_CHECK

**Queue**: `monitoring-us-east`, `monitoring-eu-west`  
**Purpose**: Monitor HTTP endpoints for availability and performance

```typescript
interface HttpCheckJob {
  type: 'HTTP_CHECK';
  
  // Job Identification
  jobId: string;                    // Unique job identifier
  monitorId: string;                // Monitor UUID from database
  organizationId: string;           // Organization UUID
  
  // HTTP Configuration
  config: {
    url: string;                    // Target URL (http:// or https://)
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
    headers?: Record<string, string>; // Custom headers
    body?: string;                  // Request body for POST/PUT
    timeout: number;                // Request timeout in milliseconds (default: 30000)
    followRedirects: boolean;       // Whether to follow HTTP redirects (default: true)
    maxRedirects: number;          // Maximum number of redirects (default: 5)
    expectedStatusCodes: number[];  // Array of acceptable HTTP status codes
    validateSSL: boolean;          // Whether to validate SSL certificates (default: true)
    userAgent?: string;            // Custom User-Agent header
  };
  
  // Scheduling Metadata
  metadata: {
    scheduledAt: string;           // ISO 8601 timestamp when job was scheduled
    region: 'us-east' | 'eu-west'; // Preferred execution region
    priority: 'low' | 'normal' | 'high' | 'urgent'; // Job priority
    monitorName: string;           // Human-readable monitor name
    tags?: string[];               // Optional tags for categorization
  };
}
```

**Example HTTP_CHECK Job:**
```json
{
  "type": "HTTP_CHECK",
  "jobId": "job_01H8Z9X6M2N3P4Q5R6S7T8U9V0",
  "monitorId": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "config": {
    "url": "https://api.example.com/health",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "Accept": "application/json",
      "X-API-Version": "v1"
    },
    "timeout": 30000,
    "followRedirects": true,
    "maxRedirects": 5,
    "expectedStatusCodes": [200, 201, 202],
    "validateSSL": true,
    "userAgent": "StatusZen Monitor/1.0"
  },
  "metadata": {
    "scheduledAt": "2024-01-15T10:30:00.000Z",
    "region": "us-east",
    "priority": "normal",
    "monitorName": "API Health Check - Production",
    "tags": ["api", "production", "health-check"]
  }
}
```

### 2. HTTPS_CHECK

**Queue**: `monitoring-us-east`, `monitoring-eu-west`  
**Purpose**: Monitor HTTPS endpoints with enhanced SSL validation

```typescript
interface HttpsCheckJob {
  type: 'HTTPS_CHECK';
  
  // Job Identification (same as HTTP_CHECK)
  jobId: string;
  monitorId: string;
  organizationId: string;
  
  // HTTPS Configuration (extends HTTP_CHECK)
  config: {
    url: string;                    // Must be https:// URL
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
    headers?: Record<string, string>;
    body?: string;
    timeout: number;
    followRedirects: boolean;
    maxRedirects: number;
    expectedStatusCodes: number[];
    
    // SSL-Specific Configuration
    ssl: {
      validateCertificate: boolean;      // Validate SSL certificate chain (default: true)
      validateHostname: boolean;         // Validate certificate hostname (default: true)
      checkExpiry: boolean;             // Check certificate expiry (default: true)
      expiryWarningDays: number;        // Days before expiry to warn (default: 30)
      allowSelfSigned: boolean;         // Allow self-signed certificates (default: false)
      cipherSuites?: string[];          // Allowed cipher suites (optional)
      tlsVersions: string[];            // Allowed TLS versions ['TLSv1.2', 'TLSv1.3']
    };
    
    userAgent?: string;
  };
  
  // Scheduling Metadata (same as HTTP_CHECK)
  metadata: {
    scheduledAt: string;
    region: 'us-east' | 'eu-west';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    monitorName: string;
    tags?: string[];
  };
}
```

**Example HTTPS_CHECK Job:**
```json
{
  "type": "HTTPS_CHECK",
  "jobId": "job_01H8Z9X6M2N3P4Q5R6S7T8U9V1",
  "monitorId": "550e8400-e29b-41d4-a716-446655440001",
  "organizationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "config": {
    "url": "https://secure.example.com/api",
    "method": "GET",
    "timeout": 25000,
    "followRedirects": true,
    "maxRedirects": 3,
    "expectedStatusCodes": [200],
    "ssl": {
      "validateCertificate": true,
      "validateHostname": true,
      "checkExpiry": true,
      "expiryWarningDays": 14,
      "allowSelfSigned": false,
      "tlsVersions": ["TLSv1.2", "TLSv1.3"]
    }
  },
  "metadata": {
    "scheduledAt": "2024-01-15T10:31:00.000Z",
    "region": "eu-west",
    "priority": "high",
    "monitorName": "Secure API - Payment Gateway"
  }
}
```

### 3. SSL_CHECK

**Queue**: `monitoring-us-east`, `monitoring-eu-west`  
**Purpose**: Dedicated SSL certificate monitoring without HTTP request

```typescript
interface SslCheckJob {
  type: 'SSL_CHECK';
  
  // Job Identification
  jobId: string;
  monitorId: string;
  organizationId: string;
  
  // SSL Configuration
  config: {
    hostname: string;               // Hostname to check (e.g., 'example.com')
    port: number;                  // Port number (default: 443)
    timeout: number;               // Connection timeout in milliseconds (default: 10000)
    
    // Certificate Validation Options
    validation: {
      checkExpiry: boolean;              // Check certificate expiry (default: true)
      expiryWarningDays: number;        // Days before expiry to warn (default: 30)
      checkChain: boolean;              // Validate certificate chain (default: true)
      checkRevocation: boolean;         // Check certificate revocation (default: false)
      allowSelfSigned: boolean;         // Allow self-signed certificates (default: false)
      validateHostname: boolean;        // Validate certificate hostname (default: true)
    };
    
    // Protocol Options
    protocol: {
      tlsVersions: string[];           // Supported TLS versions ['TLSv1.2', 'TLSv1.3']
      cipherSuites?: string[];         // Preferred cipher suites (optional)
      sni: boolean;                    // Use Server Name Indication (default: true)
    };
  };
  
  // Scheduling Metadata
  metadata: {
    scheduledAt: string;
    region: 'us-east' | 'eu-west';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    monitorName: string;
    tags?: string[];
  };
}
```

**Example SSL_CHECK Job:**
```json
{
  "type": "SSL_CHECK",
  "jobId": "job_01H8Z9X6M2N3P4Q5R6S7T8U9V2",
  "monitorId": "550e8400-e29b-41d4-a716-446655440002",
  "organizationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "config": {
    "hostname": "secure.example.com",
    "port": 443,
    "timeout": 15000,
    "validation": {
      "checkExpiry": true,
      "expiryWarningDays": 30,
      "checkChain": true,
      "checkRevocation": true,
      "allowSelfSigned": false,
      "validateHostname": true
    },
    "protocol": {
      "tlsVersions": ["TLSv1.2", "TLSv1.3"],
      "sni": true
    }
  },
  "metadata": {
    "scheduledAt": "2024-01-15T10:32:00.000Z",
    "region": "us-east",
    "priority": "normal",
    "monitorName": "SSL Certificate - Main Domain",
    "tags": ["ssl", "certificate", "security"]
  }
}
```

### 4. PING_CHECK

**Queue**: `monitoring-us-east`, `monitoring-eu-west`  
**Purpose**: ICMP ping monitoring for network connectivity

```typescript
interface PingCheckJob {
  type: 'PING_CHECK';
  
  // Job Identification
  jobId: string;
  monitorId: string;
  organizationId: string;
  
  // Ping Configuration
  config: {
    host: string;                  // Hostname or IP address to ping
    timeout: number;               // Ping timeout in milliseconds (default: 5000)
    interval: number;              // Interval between pings in milliseconds (default: 1000)
    count: number;                 // Number of ping packets to send (default: 4)
    packetSize: number;           // Packet size in bytes (default: 64)
    ttl?: number;                 // Time to live (optional, system default)
    
    // Thresholds
    thresholds: {
      maxLatency: number;          // Maximum acceptable latency in ms
      minSuccessRate: number;      // Minimum success rate as percentage (0-100)
      maxPacketLoss: number;       // Maximum packet loss as percentage (0-100)
    };
  };
  
  // Scheduling Metadata
  metadata: {
    scheduledAt: string;
    region: 'us-east' | 'eu-west';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    monitorName: string;
    tags?: string[];
  };
}
```

**Example PING_CHECK Job:**
```json
{
  "type": "PING_CHECK",
  "jobId": "job_01H8Z9X6M2N3P4Q5R6S7T8U9V3",
  "monitorId": "550e8400-e29b-41d4-a716-446655440003",
  "organizationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "config": {
    "host": "example.com",
    "timeout": 5000,
    "interval": 1000,
    "count": 4,
    "packetSize": 64,
    "thresholds": {
      "maxLatency": 100,
      "minSuccessRate": 95,
      "maxPacketLoss": 5
    }
  },
  "metadata": {
    "scheduledAt": "2024-01-15T10:33:00.000Z",
    "region": "us-east",
    "priority": "normal",
    "monitorName": "Network Connectivity - Main Server",
    "tags": ["network", "connectivity", "ping"]
  }
}
```

## Result Message Format

### Standard Result Structure

All monitoring jobs must produce a result message that gets published to the `results` queue. The result format is standardized across all job types:

```typescript
interface MonitoringResult {
  // Job Reference
  jobId: string;                    // Original job ID
  monitorId: string;                // Monitor UUID from original job
  organizationId: string;           // Organization UUID from original job
  jobType: 'HTTP_CHECK' | 'HTTPS_CHECK' | 'SSL_CHECK' | 'PING_CHECK';
  
  // Execution Results
  success: boolean;                 // Overall success of the monitoring check
  statusCode?: number;             // HTTP status code (HTTP/HTTPS only)
  errorMessage?: string;           // Error description if success: false
  errorCode?: string;              // Standardized error code (see Error Codes section)
  
  // Timing Information
  timing: {
    total: number;                 // Total execution time in milliseconds
    dns?: number;                  // DNS resolution time (if applicable)
    connect?: number;              // Connection establishment time
    ssl?: number;                  // SSL handshake time (if applicable)
    send?: number;                 // Request send time (HTTP/HTTPS only)
    wait?: number;                 // Wait for first byte (HTTP/HTTPS only)
    receive?: number;              // Response receive time (HTTP/HTTPS only)
  };
  
  // Regional Context
  execution: {
    region: 'us-east' | 'eu-west';   // Region where job was executed
    executedAt: string;              // ISO 8601 timestamp when job started
    completedAt: string;             // ISO 8601 timestamp when job completed
    attemptNumber: number;           // Retry attempt number (1-based)
    workerVersion: string;           // Worker application version
    workerId?: string;               // Optional worker instance identifier
  };
  
  // Type-Specific Results (see individual sections below)
  httpResult?: HttpResult;
  httpsResult?: HttpsResult;
  sslResult?: SslResult;
  pingResult?: PingResult;
  
  // Additional Metadata
  metadata: {
    targetIp?: string;             // Resolved IP address of target
    targetLocation?: string;       // Detected geographic location of target
    networkPath?: 'direct' | 'cdn' | 'proxy'; // Detected network routing
    userAgent?: string;            // User agent used for request (HTTP/HTTPS)
  };
}
```

### HTTP Result Details

```typescript
interface HttpResult {
  // Response Information
  statusCode: number;              // HTTP response status code
  statusText: string;              // HTTP status text (e.g., "OK", "Not Found")
  headers: Record<string, string>; // Response headers (lowercased keys)
  bodySize: number;                // Response body size in bytes
  
  // Request Information
  finalUrl: string;                // Final URL after redirects
  redirectCount: number;           // Number of redirects followed
  redirectChain?: string[];        // Chain of redirect URLs
  
  // Content Validation
  contentType: string;             // Content-Type header value
  encoding?: string;               // Content encoding (gzip, br, etc.)
  
  // Performance Metrics
  firstByteTime: number;          // Time to first byte in milliseconds
  downloadTime: number;           // Time to download full response
  
  // Validation Results
  expectedStatus: boolean;        // Whether status code was in expected list
  sslValid?: boolean;            // SSL validation result (HTTPS only)
}
```

### HTTPS Result Details

```typescript
interface HttpsResult extends HttpResult {
  // SSL/TLS Information
  ssl: {
    valid: boolean;                // Overall SSL validation result
    protocol: string;              // TLS protocol version (e.g., "TLSv1.3")
    cipher: string;               // Cipher suite used
    
    // Certificate Information
    certificate: {
      subject: string;             // Certificate subject
      issuer: string;              // Certificate issuer
      validFrom: string;           // ISO 8601 valid from date
      validTo: string;             // ISO 8601 valid to date
      daysUntilExpiry: number;     // Days until certificate expires
      fingerprint: string;         // SHA-256 certificate fingerprint
      serialNumber: string;        // Certificate serial number
      
      // Subject Alternative Names
      subjectAltNames: string[];   // List of SAN entries
      
      // Validation Results
      hostnameMatch: boolean;      // Whether certificate matches hostname
      chainValid: boolean;         // Whether certificate chain is valid
      selfSigned: boolean;         // Whether certificate is self-signed
      revoked: boolean;           // Whether certificate is revoked (if checked)
    };
    
    // Security Analysis
    security: {
      grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'; // SSL security grade
      weakCipher: boolean;         // Whether weak ciphers were detected
      deprecatedProtocol: boolean; // Whether deprecated protocols were used
      vulnerabilities: string[];   // List of detected vulnerabilities
    };
  };
}
```

### SSL Result Details

```typescript
interface SslResult {
  // Connection Information
  connected: boolean;             // Whether SSL connection was established
  protocol: string;               // TLS protocol version
  cipher: string;                // Cipher suite negotiated
  
  // Certificate Chain
  certificates: {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysUntilExpiry: number;
    fingerprint: string;
    serialNumber: string;
    publicKeyAlgorithm: string;
    publicKeySize: number;
    signatureAlgorithm: string;
    subjectAltNames: string[];
    
    // Validation Results
    hostnameMatch: boolean;
    selfSigned: boolean;
    revoked: boolean;
    chainPosition: number;         // Position in certificate chain (0 = leaf)
  }[];
  
  // Chain Validation
  chainValid: boolean;
  chainLength: number;
  rootCaKnown: boolean;
  
  // Security Assessment
  security: {
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    issues: string[];             // List of security issues found
    recommendations: string[];    // Security improvement recommendations
  };
  
  // OCSP Information (if checked)
  ocsp?: {
    status: 'good' | 'revoked' | 'unknown';
    responseTime: number;
    responderUrl: string;
  };
}
```

### Ping Result Details

```typescript
interface PingResult {
  // Packet Statistics
  packetsTransmitted: number;     // Number of packets sent
  packetsReceived: number;        // Number of packets received
  packetLossPercentage: number;   // Packet loss as percentage (0-100)
  
  // Timing Statistics (all in milliseconds)
  timing: {
    min: number;                  // Minimum round-trip time
    max: number;                  // Maximum round-trip time
    avg: number;                  // Average round-trip time
    stddev: number;               // Standard deviation
    median: number;               // Median round-trip time
  };
  
  // Individual Ping Results
  pings: {
    sequence: number;             // ICMP sequence number
    responseTime: number;         // Round-trip time in milliseconds
    ttl: number;                  // Time to live value
    success: boolean;             // Whether this ping succeeded
    errorMessage?: string;        // Error message if ping failed
  }[];
  
  // Target Information
  targetIp: string;               // Resolved IP address
  targetHostname: string;         // Original hostname
  
  // Threshold Validation
  thresholds: {
    latencyPassed: boolean;       // Whether latency threshold was met
    successRatePassed: boolean;   // Whether success rate threshold was met
    packetLossPassed: boolean;    // Whether packet loss threshold was met
  };
}
```

## Error Handling & Codes

### Standardized Error Codes

Workers must use these standardized error codes in the `errorCode` field:

#### Network Errors (1xxx)
- `1001` - DNS resolution failed
- `1002` - Connection timeout
- `1003` - Connection refused
- `1004` - Network unreachable
- `1005` - Host unreachable
- `1006` - Connection reset by peer
- `1007` - SSL handshake failed
- `1008` - SSL certificate validation failed

#### HTTP Errors (2xxx)
- `2001` - HTTP request timeout
- `2002` - Invalid URL format
- `2003` - Too many redirects
- `2004` - Response body too large
- `2005` - Invalid HTTP response
- `2006` - Unexpected status code
- `2007` - Content validation failed

#### SSL/TLS Errors (3xxx)
- `3001` - SSL certificate expired
- `3002` - SSL certificate not yet valid
- `3003` - SSL certificate hostname mismatch
- `3004` - SSL certificate chain invalid
- `3005` - SSL certificate revoked
- `3006` - SSL certificate self-signed (when not allowed)
- `3007` - SSL protocol version not supported
- `3008` - SSL cipher suite not supported

#### ICMP Errors (4xxx)
- `4001` - ICMP not permitted (firewall/OS restrictions)
- `4002` - Host unreachable via ICMP
- `4003` - ICMP timeout
- `4004` - ICMP destination unreachable
- `4005` - ICMP time exceeded

#### System Errors (9xxx)
- `9001` - Worker internal error
- `9002` - Invalid job configuration
- `9003` - Resource limit exceeded
- `9004` - Worker timeout
- `9005` - Queue connection failed

### Error Message Format

Error messages should be clear, actionable, and include relevant technical details:

```json
{
  "success": false,
  "errorCode": "1002",
  "errorMessage": "Connection timeout after 30000ms while connecting to example.com:443. DNS resolved to 203.0.113.1.",
  "metadata": {
    "targetIp": "203.0.113.1",
    "timeoutMs": 30000,
    "dnsResolutionTime": 245
  }
}
```

## Queue Processing Requirements

### Job Consumption

```javascript
// Worker must implement this pattern for job consumption
const worker = new Worker('monitoring-us-east', async (job) => {
  const { type, jobId, monitorId, organizationId, config, metadata } = job.data;
  
  try {
    let result;
    switch (type) {
      case 'HTTP_CHECK':
        result = await processHttpCheck(job.data);
        break;
      case 'HTTPS_CHECK':
        result = await processHttpsCheck(job.data);
        break;
      case 'SSL_CHECK':
        result = await processSslCheck(job.data);
        break;
      case 'PING_CHECK':
        result = await processPingCheck(job.data);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    
    // Publish result to results queue
    await resultsQueue.add('PROCESS_RESULT', result);
    
    return result;
  } catch (error) {
    // Log error and let BullMQ handle retry logic
    console.error(`Job ${jobId} failed:`, error);
    throw error;
  }
}, {
  concurrency: 5,
  removeOnComplete: 100,
  removeOnFail: 50,
});
```

### Result Publishing

All results must be published to the `results` queue using this pattern:

```javascript
// Publish monitoring result
await resultsQueue.add('PROCESS_RESULT', {
  // Standard result object as defined above
  jobId: originalJob.jobId,
  monitorId: originalJob.monitorId,
  organizationId: originalJob.organizationId,
  jobType: originalJob.type,
  success: true,
  // ... rest of result data
}, {
  priority: originalJob.metadata.priority === 'urgent' ? 1 : 
           originalJob.metadata.priority === 'high' ? 2 : 
           originalJob.metadata.priority === 'normal' ? 3 : 4,
  delay: 0, // Process immediately
});
```

### Job Acknowledgment

- Workers must only acknowledge jobs after successfully publishing results to the results queue
- Failed jobs should be thrown to trigger BullMQ retry logic
- Workers must handle all job types defined in this specification
- Workers should implement graceful shutdown to finish processing current jobs

## Validation Requirements

### Job Payload Validation

Workers must validate all incoming job payloads:

1. **Required Fields**: Ensure all required fields are present and non-empty
2. **Type Safety**: Validate field types match the TypeScript interfaces
3. **URL Validation**: Validate URLs are well-formed and use allowed protocols
4. **Timeout Limits**: Ensure timeouts are within acceptable ranges (1000ms - 60000ms)
5. **Array Limits**: Limit array sizes (e.g., max 10 expected status codes)
6. **String Lengths**: Limit string field lengths to prevent abuse

### Result Validation

Before publishing results, validate:

1. **Required Fields**: All mandatory result fields are present
2. **Data Types**: All fields match expected types
3. **Timestamp Format**: ISO 8601 format for all timestamps
4. **Numeric Ranges**: Timing values are non-negative, percentages are 0-100
5. **Error Consistency**: If success=false, errorMessage and errorCode are present

## Performance Requirements

### Processing Time Limits

- **HTTP/HTTPS Checks**: Maximum 30 seconds total execution time
- **SSL Checks**: Maximum 15 seconds total execution time  
- **Ping Checks**: Maximum 10 seconds total execution time
- **Result Publishing**: Maximum 5 seconds to publish result

### Memory Usage

- Maximum 256MB memory per job processing
- Clean up resources after each job completion
- Avoid memory leaks in long-running worker processes

### Concurrency

- Process up to 5 jobs concurrently per worker instance
- Implement proper async/await patterns for I/O operations
- Use connection pooling where applicable

## Testing Requirements

### Unit Tests

Workers must include unit tests for:
- Each job type processing function
- Error handling for all error codes
- Result formatting and validation
- Configuration validation

### Integration Tests

- End-to-end job processing with real queue
- Network connectivity testing with various scenarios
- SSL certificate validation with different certificate types
- Error condition simulation and handling

### Load Testing

- Sustained processing of 100+ jobs per minute
- Memory usage under continuous load
- Queue backup and recovery scenarios

---

This specification document provides complete details for implementing BullMQ job processing in the backend worker system. All job types, result formats, error codes, and processing requirements are defined to ensure consistent implementation across all workers.