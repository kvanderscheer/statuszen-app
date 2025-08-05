# FRD: Job Scheduler System

## Introduction/Overview

The Job Scheduler System is responsible for identifying monitors that are due for checking and creating monitoring jobs in appropriate regional BullMQ queues. This system runs as a Vercel cron job and handles the orchestration of monitoring tasks across multiple regions with individual monitor scheduling.

**Goal**: Provide reliable, distributed job scheduling that ensures monitors are checked according to their individual schedules and routed to appropriate regional workers.

## Goals

1. Identify monitors due for checking based on individual schedules every minute
2. Create monitoring jobs in appropriate regional BullMQ queues
3. Handle per-monitor frequency configuration and routing
4. Update monitor scheduling timestamps after job creation
5. Provide retry policies and error handling for job creation failures

## User Stories

1. **As a monitoring system**, I want monitors to be checked according to their individual schedules so that monitoring frequency matches business requirements
2. **As a user**, I want my monitors to be executed from the preferred region so that results reflect real user experience
3. **As a system administrator**, I want failed job creation to be retried so that monitoring remains reliable
4. **As a developer**, I want scheduling operations to be logged so that I can troubleshoot issues
5. **As a business**, I want the scheduler to handle high monitor volumes so that the system can scale

## Functional Requirements

### Scheduling Logic
1. The system must run every minute via Vercel cron job
2. The system must query monitors where `next_check_at <= NOW()` and `is_active = true`
3. The system must calculate next check time based on individual monitor `check_interval_minutes`
4. The system must update `last_scheduled_at` and `next_check_at` after successful job creation
5. The system must handle timezone considerations for consistent scheduling

### Job Creation
6. The system must create BullMQ jobs with monitor details and configuration
7. The system must route jobs to appropriate regional queues based on `preferred_region`
8. The system must include retry policies for each created job
9. The system must set job priorities based on monitor criticality or SLA requirements
10. The system must generate unique job IDs for tracking and deduplication

### Regional Routing
11. The system must support routing to `monitoring-us-east` and `monitoring-eu-west` queues
12. The system must fall back to default region if preferred region is unavailable
13. The system must distribute load across regions when no preference is specified
14. The system must validate region availability before job creation

### Error Handling
15. The system must retry failed job creation attempts with exponential backoff
16. The system must log all scheduling operations and failures
17. The system must continue processing other monitors if individual job creation fails
18. The system must track and alert on sustained scheduling failures

### Performance Requirements
19. The system must complete full scheduling cycle within 45 seconds (Vercel timeout limit)
20. The system must handle up to 1000 monitors per scheduling cycle
21. The system must use database connection pooling for efficiency
22. The system must batch database updates where possible

## Non-Goals (Out of Scope)

- Monitor execution (handled by regional workers)
- Result processing (handled by results processor)
- Alert evaluation (handled by results processor)
- Monitor creation or configuration (handled by monitor management)
- Real-time scheduling (operates on 1-minute intervals)
- Dynamic frequency adjustment based on results
- Geographic optimization beyond basic region routing
- Complex scheduling algorithms (priority queues, resource optimization)

## Design Considerations

### Cron Configuration
```json
{
  "path": "/api/cron/scheduler",
  "schedule": "*/1 * * * *"
}
```

### Job Structure
```javascript
{
  "id": "monitor_<monitor_id>_<timestamp>",
  "type": "HTTP_CHECK|HTTPS_CHECK|PING_CHECK|SSL_CHECK",
  "data": {
    "monitor_id": "uuid",
    "url": "string",
    "config": {}, // monitor-specific configuration
    "organization_id": "uuid"
  },
  "opts": {
    "attempts": 3,
    "backoff": {
      "type": "exponential",
      "delay": 2000
    },
    "removeOnComplete": 100,
    "removeOnFail": 50
  }
}
```

### Queue Selection Logic
```javascript
const getQueueName = (preferredRegion) => {
  const queueMap = {
    'us-east': 'monitoring-us-east',
    'eu-west': 'monitoring-eu-west'
  };
  return queueMap[preferredRegion] || 'monitoring-us-east';
};
```

## Technical Considerations

### Database Optimization
- Use indexed queries on `next_check_at` and `is_active` fields
- Implement connection pooling for database efficiency
- Use batch updates for scheduling timestamp updates
- Consider read replicas for high-volume scenarios

### BullMQ Integration
- Connect to Upstash Redis for queue operations
- Implement proper error handling for Redis connectivity
- Use queue-specific configurations for different regions
- Monitor queue depths and processing rates

### Vercel Constraints
- 60-second maximum duration for cron functions
- Stateless execution environment
- Cold start considerations for Redis connections
- Environment variable management for secrets

### Monitoring and Observability
- Log scheduling cycle start/completion times
- Track number of monitors processed per cycle
- Monitor job creation success/failure rates
- Alert on scheduling cycle duration approaching limits

## Success Metrics

1. **Scheduling Accuracy**: 99.9% of monitors scheduled within 1 minute of due time
2. **Job Creation Success**: 99.95% successful job creation rate
3. **Cycle Performance**: Complete scheduling cycles in < 30 seconds average
4. **Regional Distribution**: Proper job routing to preferred regions 100% of time
5. **Error Recovery**: Failed job creation recovered within 3 attempts

## Open Questions

1. What should be the maximum number of monitors processed per scheduling cycle?
2. Should there be different job priorities based on monitor type or customer tier?
3. How should the system handle monitors with very short intervals (< 1 minute)?
4. What fallback strategy should be used if all regional queues are unavailable?
5. Should there be circuit breaker logic for failing Redis connections?
6. What metrics should trigger scaling to additional regions?
7. How should the system handle clock drift across different Vercel regions?