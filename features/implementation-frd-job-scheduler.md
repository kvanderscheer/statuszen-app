# Implementation Plan: Job Scheduler System

## Relevant Files

- `server/api/cron/scheduler.post.ts` - Main cron endpoint handler
- `vercel.json` - Cron job configuration
- `server/utils/scheduler/` - Directory for scheduler utilities
  - `server/utils/scheduler/monitor-query.ts` - Database query functions
  - `server/utils/scheduler/job-creator.ts` - BullMQ job creation logic
  - `server/utils/scheduler/regional-router.ts` - Regional queue routing
  - `server/utils/scheduler/retry-handler.ts` - Error handling and retry logic
- `server/utils/queue/` - Directory for queue management
  - `server/utils/queue/bull-config.ts` - BullMQ configuration and connection
  - `server/utils/queue/job-types.ts` - Job type definitions and interfaces
- `app/types/scheduler.ts` - TypeScript types for scheduler system
- `app/types/job-queue.ts` - TypeScript types for job queue operations
- `middleware/cron-auth.ts` - Cron job authentication middleware
- Tests would include:
  - `tests/server/api/cron/scheduler.test.ts`
  - `tests/server/utils/scheduler/` - Unit tests for scheduler utilities
  - `tests/integration/scheduler-e2e.test.ts` - End-to-end scheduler tests

## Phases

- [x] Phase 1: Core Infrastructure Setup
  - [x] 1.1 Create TypeScript type definitions for scheduler system
    - Define job data structures, queue configurations, and scheduling interfaces
  - [x] 1.2 Install and configure BullMQ dependencies  
    - Add `bullmq` and `ioredis` packages to package.json
    - Configure TypeScript types for BullMQ integration
  - [x] 1.3 Set up environment variable configuration
    - Add Redis connection URL and queue configuration variables
    - Configure regional queue names and connection settings
  - [x] 1.4 Create directory structure for scheduler utilities
    - Set up organized folder structure following Nuxt 4 server conventions

- [x] Phase 2: Database Integration & Monitor Query Logic
  - [x] 2.1 Create monitor query utility functions
    - Implement function to fetch monitors where `next_check_at <= NOW()` and `is_active = true`
    - Add database connection pooling optimization
  - [x] 2.2 Implement scheduling timestamp update logic
    - Create function to calculate next check time based on `check_interval_minutes`
    - Implement batch update functionality for `last_scheduled_at` and `next_check_at`
  - [x] 2.3 Add database query optimization
    - Ensure proper indexing on `next_check_at` and `is_active` fields
    - Implement query batching for performance with up to 1000 monitors

- [x] Phase 3: Queue Management & Job Creation (REST-based)
  - [x] 3.1 Configure Upstash REST API connection
    - Set up REST-based queue system replacing BullMQ due to Upstash protocol limitations
    - Built custom REST-based queue implementation
  - [x] 3.2 Implement job creation logic
    - Create function to generate monitoring jobs with unique IDs
    - Implement job data structure matching FRD specifications
  - [x] 3.3 Add job configuration and retry policies
    - Configure job options with retry policies and cleanup settings
    - Set job priorities based on monitor criticality
  - [x] 3.4 Implement job deduplication
    - Add logic to prevent duplicate jobs for same monitor within time window

- [x] Phase 4: Regional Routing & Load Distribution
  - [x] 4.1 Create regional queue routing logic (updated for REST)
    - Implement queue selection based on monitor's `preferred_region`
    - Updated mapping from region codes to REST queue names
  - [x] 4.2 Add fallback region handling (updated for REST)
    - Implement fallback to default region when preferred region unavailable
    - Updated region availability validation for REST API
  - [x] 4.3 Implement load balancing for unspecified regions (updated for REST)
    - Updated round-robin distribution for REST-based queues
    - Added REST queue health checking for optimal distribution
  - [x] 4.4 Convert from BullMQ to REST-based system
    - Successfully migrated from Redis protocol to Upstash REST API
    - Updated all queue operations for REST compatibility

- [ ] Phase 5: Error Handling, Retry Logic & Monitoring
  - [ ] 5.1 Implement comprehensive error handling
    - Add try-catch blocks with specific error types and recovery strategies
    - Ensure individual monitor failures don't stop processing of others
  - [ ] 5.2 Create retry logic with exponential backoff
    - Implement retry mechanism for failed job creation attempts
    - Add circuit breaker pattern for Redis connection failures
  - [ ] 5.3 Add logging and monitoring
    - Implement structured logging for all scheduling operations
    - Add performance metrics tracking (cycle time, success rates, monitor counts)
  - [ ] 5.4 Create alerting for sustained failures
    - Add logic to detect and alert on recurring scheduling failures
    - Implement threshold-based alerting for cycle duration approaching limits

- [x] Phase 6: Main Scheduler Endpoint Implementation
  - [x] 6.1 Create the main cron API endpoint
    - Implemented `/api/cron/scheduler` endpoint with complete workflow orchestration
    - Added proper HTTP method handling and comprehensive response formatting
  - [x] 6.2 Add cron authentication and security
    - Implemented CRON_SECRET validation for unauthorized access protection
    - Added request validation and security headers
  - [ ] 6.3 Configure Vercel cron job
    - Create `vercel.json` configuration with `*/1 * * * *` schedule
    - Set up proper environment variables and secrets management
  - [ ] 6.4 Implement execution time monitoring
    - Add timing instrumentation to ensure 45-second completion target
    - Implement early termination logic if approaching timeout limits

- [ ] Phase 7: Testing & Performance Optimization
  - [ ] 7.1 Create unit tests for core functions
    - Test monitor query logic with various database states
    - Test job creation and regional routing with mocked dependencies
  - [ ] 7.2 Implement integration tests
    - Test full scheduling cycle with test database and Redis
    - Verify proper error handling and recovery scenarios
  - [ ] 7.3 Add performance testing and optimization
    - Load test with 1000 monitors to ensure sub-45-second completion
    - Optimize database queries and Redis operations for performance
  - [ ] 7.4 Create monitoring and observability
    - Set up logging aggregation and metrics collection
    - Add health check endpoints for system monitoring