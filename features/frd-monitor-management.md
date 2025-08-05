# FRD: Monitor Management System

## Introduction/Overview

The Monitor Management System is the core component that handles the creation, configuration, and lifecycle management of website monitoring checks. This system manages individual monitors (no separate sites table needed) with different monitoring types (HTTP, HTTPS, PING, SSL) and their scheduling configurations.

**Goal**: Provide a comprehensive system for managing website monitoring configurations with flexible scheduling and multi-region support.

## Goals

1. Enable users to create and configure monitors for different check types (HTTP, HTTPS, PING, SSL)
2. Support individual monitor scheduling with variable frequencies (per-monitor configuration)
3. Provide CRUD operations for monitor management
4. Handle monitor scheduling and region preferences
5. Store monitoring configurations in a structured, queryable format

## User Stories

1. **As a site owner**, I want to create a new monitor for my website so that I can track its availability
2. **As a user**, I want to configure different check intervals for different monitors so that critical services are monitored more frequently
3. **As a user**, I want to specify preferred monitoring regions so that checks are performed from locations relevant to my users
4. **As a user**, I want to set custom configurations for each monitor so that checks match my service requirements
5. **As an admin**, I want to view all monitors for an organization so that I can manage monitoring across all services

## Functional Requirements

### Core Monitor Operations
1. The system must allow creating new monitors with URL, type, and configuration
2. The system must support four monitor types: HTTP, HTTPS, PING, and SSL certificate checks
3. The system must allow updating monitor configurations including intervals and regions
4. The system must allow deactivating/reactivating monitors without deletion
5. The system must allow permanent deletion of monitors
6. The system must associate monitors with organizations for multi-tenancy

### Scheduling Configuration
7. The system must allow setting individual check intervals per monitor (default: 5 minutes)
8. The system must track last scheduled time and next check time for each monitor
9. The system must support preferred region selection for monitoring execution
10. The system must calculate next check times based on individual monitor intervals

### Monitor Configuration
11. The system must store custom configuration per monitor type in JSONB format
12. The system must validate monitor URLs and configuration parameters
13. The system must track monitor creation and update timestamps
14. The system must maintain active/inactive status for each monitor

### API Endpoints
15. The system must provide REST endpoints at `/api/monitors` for CRUD operations
16. The system must return monitor lists filtered by organization
17. The system must provide individual monitor details by ID
18. The system must validate organization ownership before allowing operations

### Data Persistence
19. The system must store all monitor data in the PostgreSQL monitors table
20. The system must enforce referential integrity with organizations table
21. The system must provide efficient querying for scheduling operations

## Non-Goals (Out of Scope)

- Real-time monitoring execution (handled by scheduler and workers)
- Alert rule management (separate component)
- Monitor result storage and analysis (separate component)
- Dashboard visualization (separate frontend concern)
- Multi-user permission management within organizations
- Monitor grouping or tagging systems
- Bulk monitor operations
- Monitor templates or presets

## Design Considerations

### Database Schema
```sql
CREATE TABLE monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'http', 'https', 'ping', 'ssl'
  config JSONB, -- timeout, expected_status, etc.
  
  -- Scheduling configuration
  check_interval_minutes INTEGER DEFAULT 5,
  preferred_region VARCHAR(20) DEFAULT 'us-east',
  last_scheduled_at TIMESTAMP,
  next_check_at TIMESTAMP,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Configuration Examples
- **HTTP/HTTPS**: `{"timeout": 10, "expected_status": 200, "follow_redirects": true}`
- **PING**: `{"timeout": 5, "packet_count": 3}`
- **SSL**: `{"days_before_expiry_alert": 30, "verify_chain": true}`

## Technical Considerations

### Framework Integration
- Built with H3/Nitro framework for Vercel deployment
- Uses Supabase PostgreSQL client for database operations
- Implements organization-based access control
- Supports JSONB for flexible monitor configurations

### Validation Requirements
- URL format validation for all monitor types
- Monitor type validation against allowed values
- Region validation against supported regions
- Interval validation (minimum 1 minute, maximum configurable)

### Performance Considerations
- Index on organization_id for efficient filtering
- Index on next_check_at for scheduler queries
- JSONB indexing for configuration queries if needed

## Success Metrics

1. **API Performance**: All monitor CRUD operations complete in < 200ms
2. **Data Integrity**: 100% referential integrity maintained with organizations
3. **Configuration Flexibility**: Support for 4 monitor types with custom configurations
4. **Scheduling Accuracy**: Next check times calculated correctly for all intervals
5. **Organization Isolation**: Zero cross-organization data access incidents

## Open Questions

1. What are the minimum and maximum allowed check intervals?
2. Should there be validation for specific URL patterns by monitor type?
3. What configuration parameters are required vs optional for each monitor type?
4. Should monitors have a maximum inactive period before automatic cleanup?
5. What indexing strategy is needed for JSONB configuration queries?
6. Should there be rate limiting on monitor creation per organization?