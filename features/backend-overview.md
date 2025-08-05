# Website Monitoring SaaS - Backend Architecture

## Overview

A distributed website monitoring SaaS application built with H3/Nitro, deployed on Vercel, using BullMQ message queues on Upstash Redis for reliable job processing across multiple regions.

**Note**: Detailed specifications for core components have been extracted into separate FRDs:
- [Monitor Management System](./frd-monitor-management.md)
- [Job Scheduler System](./frd-job-scheduler.md) 
- [Main API System](./frd-main-api.md)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Deployment                       │
├─────────────────────┬───────────────────────────────────────┤
│   Main API App      │           Worker Apps                 │
│   (serverless)      │         (serverless)                  │
│                     │                                       │
│ ┌─────────────────┐ │  ┌─────────────────┐ ┌──────────────┐ │
│ │ H3/Nitro API    │ │  │ BullMQ Worker   │ │ BullMQ Worker│ │
│ │ Routes          │ │  │ (us-east-1)     │ │ (eu-west-1)  │ │
│ │                 │ │  │                 │ │              │ │
│ │ /api/sites      │ │  │ Queue Consumer  │ │ Queue Consumer│ │
│ │ /api/monitors   │ │  │ HTTP Checks     │ │ HTTP Checks  │ │
│ │ /api/dashboard  │ │  │ SSL Validation  │ │ SSL Valid.   │ │
│ │ /api/alerts     │ │  │ ICMP Ping       │ │ ICMP Ping    │ │
│ └─────────────────┘ │  └─────────────────┘ └──────────────┘ │
│                     │                                       │
│ ┌─────────────────┐ │                                       │
│ │ BullMQ Queue    │ │                                       │
│ │ Producer        │ │                                       │
│ │                 │ │                                       │
│ │ • Creates jobs  │ │                                       │
│ │ • Routes by     │ │                                       │
│ │   region        │ │                                       │
│ │ • Handles       │ │                                       │
│ │   retries       │ │                                       │
│ │ • Processes     │ │                                       │
│ │   results       │ │                                       │
│ └─────────────────┘ │                                       │
└─────────────────────┴───────────────────────────────────────┘
                                │
                   ┌─────────────────┐
                   │  Upstash Redis  │
                   │                 │
                   │ BullMQ Queues:  │
                   │ • monitoring-us │
                   │ • monitoring-eu │
                   │ • alerts        │
                   │ • results       │
                   └─────────────────┘
                                │
                   ┌─────────────────┐
                   │  Supabase       │
                   │  PostgreSQL     │
                   │                 │
                   │ • Organizations │
                   │ • Monitors      │
                   │ • Results       │
                   │ • Alerts        │
                   └─────────────────┘
```

## Technology Stack

- **Backend Framework**: H3/Nitro (JavaScript)
- **Deployment**: Vercel (serverless functions + cron)
- **Message Queue**: BullMQ on Upstash Redis
- **Database**: Supabase PostgreSQL
- **Regions**: US East, EU West (expandable)

## Requirements Met

- ✅ **Distributed architecture**: Multi-region workers with centralized orchestration
- ✅ **Efficient**: BullMQ queues with automatic retries and job persistence
- ✅ **Straightforward**: Simple codebase, minimal infrastructure complexity
- ✅ **Multiple monitoring types**: HTTP, HTTPS, ICMP Ping, SSL Certificate validation
- ✅ **Metrics collection**: Response times, status codes, availability
- ✅ **Message queue**: BullMQ for reliable job distribution
- ✅ **Scalability**: 100 sites initially, designed to scale to 1000s
- ✅ **Variable monitoring frequency**: Per-monitor scheduling
- ✅ **Near real-time**: < 10 second alert processing
- ✅ **Multi-region monitoring**: Global perspective on site performance
- ✅ **Multiple alert channels**: Email, SMS, webhooks, Slack, voice

## Project Structure

```
monitoring-saas/
├── apps/
│   ├── api/                    # Main API (deployed to Vercel)
│   │   ├── api/
│   │   │   ├── monitors/       # Monitor CRUD operations*
│   │   │   ├── dashboard/      # Dashboard data endpoints*
│   │   │   ├── alerts/         # Alert management*
│   │   │   └── cron/
│   │   │       ├── scheduler.js    # Job creation & routing*
│   │   │       └── processor.js    # Result processing
│   │   ├── nitro.config.ts
│   │   ├── vercel.json
│   │   └── package.json
│   │
│   ├── worker-us-east/         # US East Worker
│   │   ├── api/worker.js       # BullMQ job consumer
│   │   ├── vercel.json         # Region: iad1
│   │   └── package.json
│   │
│   └── worker-eu-west/         # EU West Worker
│       ├── api/worker.js       # BullMQ job consumer
│       ├── vercel.json         # Region: fra1
│       └── package.json
│
├── packages/
│   ├── shared/
│   │   ├── database.js         # Supabase client & queries
│   │   ├── queues.js           # BullMQ queue configurations
│   │   ├── monitoring.js       # Monitoring execution engine
│   │   └── notifications.js    # Alert delivery systems
│   └── types/                  # TypeScript type definitions
│
└── package.json               # Workspace root
```

**Note**: Components marked with * are detailed in separate FRDs (see overview section).

## Core Components

### 1. Regional Workers
**Locations**: 
- `apps/worker-us-east/api/worker.js`
- `apps/worker-eu-west/api/worker.js`

**Responsibilities**:
- Consume monitoring jobs from regional queues
- Execute HTTP/HTTPS/PING/SSL checks
- Push results to results queue
- Handle job failures and retries

**Key Features**:
- BullMQ worker with concurrency control
- Automatic retry with exponential backoff
- Regional execution for global perspective
- Error handling and logging

### 2. Results Processor (Main API)
**Location**: `apps/api/api/cron/processor.js`

**Responsibilities**:
- Process monitoring results from all regions
- Store results in Supabase PostgreSQL
- Evaluate alert conditions
- Trigger notification jobs

**Key Features**:
- BullMQ worker for result processing
- Alert condition evaluation
- Database persistence
- Alert job creation

## Message Queue Structure

### Queue Names
- `monitoring-us-east` - Jobs for US East region workers
- `monitoring-eu-west` - Jobs for EU West region workers  
- `results` - Results from all monitoring executions
- `alerts` - Alert notifications to be sent

### Job Types
- `HTTP_CHECK` - HTTP endpoint monitoring
- `HTTPS_CHECK` - HTTPS endpoint monitoring
- `PING_CHECK` - ICMP ping monitoring
- `SSL_CHECK` - SSL certificate validation
- `PROCESS_RESULT` - Result processing and storage
- `SEND_ALERT` - Alert notification delivery

### BullMQ Configuration
- **Retry attempts**: 3 with exponential backoff
- **Job persistence**: Redis-backed for reliability
- **Concurrency**: 5 jobs per worker, 10 for result processing
- **Job cleanup**: Keep last 100 completed, 50 failed jobs
- **Dead letter queue**: Failed jobs preserved for debugging

## Database Schema

### Core Tables
```sql
-- Monitoring results
CREATE TABLE monitor_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id),
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  region VARCHAR(20),
  checked_at TIMESTAMP DEFAULT NOW()
);

-- Alert configurations
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id),
  condition_type VARCHAR(50), -- 'response_time', 'status_code', 'downtime'
  threshold_value NUMERIC,
  notification_channels JSONB, -- email, sms, webhook, slack
  is_active BOOLEAN DEFAULT true
);
```

**Note**: The `monitors` table schema is detailed in the [Monitor Management System FRD](./frd-monitor-management.md).

## Deployment Configuration

### Main API (vercel.json)
```json
{
  "functions": {
    "api/cron/*.js": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/scheduler",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/processor", 
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**Note**: Detailed cron job specifications are in the [Job Scheduler System FRD](./frd-job-scheduler.md).

### Regional Workers (vercel.json)
```json
{
  "regions": ["iad1"], // or ["fra1"] for EU
  "functions": {
    "api/worker.js": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/worker",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

## Data Flow

### Monitoring Execution Flow
1. **Scheduler** (every minute) identifies monitors due for checking
2. **Jobs created** in appropriate regional BullMQ queues
3. **Regional workers** consume jobs and execute monitoring
4. **Results pushed** to results queue upon completion
5. **Results processor** stores data and evaluates alerts
6. **Alert jobs created** for notification delivery
7. **Notifications sent** via configured channels

### Alert Processing Flow
1. **Monitor result** evaluated against alert rules
2. **Alert condition** triggered if thresholds exceeded
3. **Alert job** created in alerts queue
4. **Notification worker** processes alert job
5. **Multi-channel delivery** (email, SMS, Slack, webhook, voice)
6. **Alert state** tracked to prevent spam

## Scaling Strategy

### Phase 1: Vercel MVP (Current)
- **Target**: 100-1000 sites
- **Cost**: Near-zero with Vercel free tier
- **Limitations**: 15-60 second function timeouts
- **Benefits**: Minimal operational overhead

### Phase 2: Railway Migration
- **Target**: 1000+ sites  
- **Infrastructure**: Long-running containers
- **Benefits**: No timeout limits, persistent connections
- **Migration**: Code remains identical, only deployment changes

### Horizontal Scaling
- **Additional regions**: Deploy workers in new Vercel regions
- **Queue partitioning**: Split queues by customer or priority
- **Database optimization**: Read replicas, connection pooling
- **Caching layer**: Redis for frequently accessed data

## Monitoring & Observability

### Built-in Metrics
- Queue depth and processing rates
- Job success/failure rates  
- Regional response time differences
- Alert delivery success rates
- Database query performance

### Health Checks
- Worker endpoint health checks
- Queue connectivity monitoring
- Database connection validation
- External service availability

## Development Workflow

### Local Development
1. **Supabase local** for database
2. **Upstash Redis** for queues (or local Redis)
3. **Vercel dev** for API development
4. **Separate terminals** for worker simulation

### Testing Strategy
- **Unit tests** for monitoring engines
- **Integration tests** for queue processing
- **End-to-end tests** for alert workflows
- **Load testing** for scaling validation

### Deployment Process
1. **Main API** deployed to Vercel
2. **US East worker** deployed to Vercel (iad1 region)
3. **EU West worker** deployed to Vercel (fra1 region)
4. **Environment variables** configured for all deployments
5. **Database migrations** applied via Supabase

## Cost Considerations

### Vercel Free Tier Limits
- **100GB bandwidth** per month
- **100 hours** serverless function execution
- **Unlimited** static deployments
- **12 cron jobs** per project

### Operational Costs (Estimated Monthly)
- **Vercel Pro** (if exceeded): $20/month
- **Upstash Redis**: $10-50/month (based on usage)  
- **Supabase**: $25/month (Pro tier)
- **Total estimated**: $55-95/month for 1000+ sites

## Security Considerations

- **Cron endpoint protection** with secret tokens
- **Database access** via Supabase RLS policies
- **Redis access** secured with TLS and authentication
- **Environment variables** for all sensitive configuration
- **Input validation** on all monitoring targets
- **Rate limiting** on public endpoints

## Future Enhancements

### Features
- **Custom monitoring scripts** for complex checks
- **Synthetic transaction monitoring** for user flows
- **Performance budgets** and trend analysis
- **Status page generation** for monitored sites
- **API monitoring** with request/response validation

### Technical Improvements
- **GraphQL API** for flexible data queries
- **WebSocket real-time** updates for dashboards
- **Machine learning** for anomaly detection
- **Global CDN** for status page delivery
- **Advanced alerting** with escalation policies
