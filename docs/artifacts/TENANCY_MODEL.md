# TENANCY_MODEL

## Goal
Prevent cross-company data leakage and ensure isolated analytics.

## Requirements
- Tenant-scoped storage partitions for questions, responses, and aggregates.
- Tenant-scoped encryption keys.
- Tenant ID required in all admin/dashboard query contexts.
- No cross-tenant joins in reporting APIs.

## Operational controls
- Per-tenant configuration for threshold, workday policy, timezone defaults.
- Tenant-aware audit trails for admin actions (non-response paths only).

## Testing
- Automated isolation tests for API and storage boundaries.
- Negative tests to confirm cross-tenant query denial.
