# Activity Assessment & Shared Services Value Proposition Tool

**Date**: 2026-02-25
**Status**: Approved
**Inspired by**: OrgVue

## Overview

A web application for internal consulting/transformation teams to assess how employees spend their time across business processes, compare actual work allocation against preferred delivery locations, and build cost-based business cases for shared services migration.

## Target Users

- **Admins**: Internal consulting/transformation team members who set up taxonomies, import employee data, configure surveys, tag preferred locations, and analyze results.
- **Respondents**: Employees across the organization who complete time-allocation surveys via unique links (no login required).

## Architecture

Single Next.js monolith with modular route structure:

```
/admin/taxonomy    - Manage APQC taxonomy
/admin/employees   - Import employee data
/admin/surveys     - Create and manage survey campaigns
/admin/analysis    - Dashboards, gap analysis, exports
/survey/[token]    - Respondent survey UI (no auth)
```

Stack: Next.js 15 (App Router) + PostgreSQL + Prisma + Tailwind CSS + shadcn/ui

## Data Model

### Project
Top-level container grouping taxonomy, employees, and campaigns for a consulting engagement.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Project name |
| description | String? | Optional description |
| sharedServicesSalary | Decimal? | Average shared services salary for cost modeling |
| createdAt | DateTime | |

### TaxonomyNode
Self-referential tree representing the process hierarchy (APQC: Category > Process Group > Process > Activity).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| projectId | UUID | FK to Project |
| parentId | UUID? | FK to self (null = root) |
| code | String | e.g., "1.0", "1.1.1" |
| name | String | e.g., "Develop Vision and Strategy" |
| level | Int | 1=Category, 2=Process Group, 3=Process, 4=Activity |
| description | String? | |
| preferredLocation | Enum? | Corporate, BusinessUnit, SharedServices, null=unset |
| locationInherited | Boolean | True if inherited from parent |
| sortOrder | Int | Display ordering within parent |

### Employee

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| projectId | UUID | FK to Project |
| employeeId | String | External employee ID |
| name | String | |
| email | String? | |
| title | String | Job title |
| department | String? | |
| location | String | Physical location / office |
| businessUnit | String? | |
| fullyLoadedSalary | Decimal | Annual fully loaded cost |
| fte | Decimal | Full-time equivalent (default 1.0) |
| jobFamily | String? | Role grouping for role-based surveys |

### SurveyCampaign

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| projectId | UUID | FK to Project |
| name | String | Campaign name |
| status | Enum | Draft, Active, Closed |
| mode | Enum | Individual, RoleBased |
| taxonomyLevel | Int | Which level to survey at (e.g., 4=Activity) |
| createdAt | DateTime | |
| closedAt | DateTime? | |

### SurveyAssignment

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| campaignId | UUID | FK to SurveyCampaign |
| employeeId | UUID? | FK to Employee (Individual mode) |
| roleName | String? | Role name (RoleBased mode) |
| headcount | Int | Number of employees this represents (default 1) |
| token | String | Unique URL token |
| status | Enum | Pending, InProgress, Completed |

### SurveyResponse

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| assignmentId | UUID | FK to SurveyAssignment |
| taxonomyNodeId | UUID | FK to TaxonomyNode |
| percentTime | Decimal | 0-100, must sum to 100 per assignment |
| submittedAt | DateTime? | |

### AdminUser

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| username | String | Unique |
| passwordHash | String | bcrypt hash |
| name | String | |
| createdAt | DateTime | |

## Module Design

### 1. Taxonomy Management (`/admin/taxonomy`)

**Built-in APQC Template**: Ships with a default APQC Process Classification Framework (Levels 1-4) as seed data. Admin clicks "Start with APQC Template" to populate.

**CSV/Excel Import**: Upload file with columns `Code, Name, Level, ParentCode, Description`. Parser validates hierarchy integrity (no orphans, correct nesting). Supports creating from scratch or extending the template.

**Tree Editor UI**: Interactive expandable/collapsible tree view. Inline add/edit/delete/reorder. Similar to a file explorer.

**Preferred Location Tagging**: Each node has a dropdown (Corporate / Business Unit / Shared Services / Unset). Setting on a parent inherits to children unless overridden. Visual indicator distinguishes inherited vs. explicit tags.

### 2. Employee Data Import (`/admin/employees`)

**CSV/Excel Import**: Columns: `EmployeeID, Name, Email, Title, Department, Location, BusinessUnit, FullyLoadedSalary, FTE, JobFamily`. Validation for required fields, numeric salary, duplicate IDs. Preview errors before confirming.

**Employee Table**: Searchable, sortable, filterable data table. Inline editing for corrections. Filter by department, location, business unit.

### 3. Survey Module (`/admin/surveys` + `/survey/[token]`)

**Campaign Setup**: Name campaign, select mode (Individual/RoleBased), pick taxonomy level for survey. Filter employees to include (by department, location, BU) in Individual mode. Define roles with headcount in RoleBased mode.

**Link Generation**: Unique URL per assignment. CSV export of `Name, Email, SurveyLink` for distribution via admin's email tool.

**Campaign Dashboard**: Response status tracking -- completed/pending/in-progress counts, overall response rate.

**Respondent UI** (`/survey/[token]`):
- No login -- token identifies respondent
- Activities listed grouped by parent Process/Process Group
- Percentage input per activity (slider or number)
- Live running total with "X% of 100% allocated" counter
- "I don't do this" quick-zero button
- Auto-save drafts for returning later
- Must sum to exactly 100% to submit
- Mobile-friendly layout
- Thank-you confirmation page with allocation summary

### 4. Analysis & Value Proposition (`/admin/analysis`)

**Gap Analysis Core Logic**:
For each activity, compare:
- **Current State**: Where work is actually done (from survey responses + employee locations), weighted by FTE and salary
- **Future State**: Where work should be done (preferred location tags)
- **Gap**: Delta in FTEs and dollars

**Cost Model**:
- Current Cost = Sum of (employee salary * FTE * % time) for employees at non-preferred locations
- Future Cost = Same FTE hours at shared services labor rates (configurable)
- Savings = Current Cost - Future Cost
- Rollup by Process Group, Category, and total

**Visualizations**:

| Chart | Purpose |
|-------|---------|
| Heat Map | Activities vs. Locations matrix, colored by FTE concentration. Red = non-preferred location |
| Sunburst | Hierarchical taxonomy view, size = FTE/cost, color = alignment with preferred |
| Waterfall | Savings buildup: current cost → savings per area → future state |
| Bar Charts | Side-by-side current vs. preferred location distribution |
| Summary Table | Sortable: Activity, Current Mix, Preferred, FTE Gap, Cost Gap, Savings |

**Exports**:
- PDF executive summary with key findings, top opportunities, embedded charts
- Excel with detailed data tables
- Individual charts as PNG/SVG for PowerPoint

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL |
| ORM | Prisma |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| File Parsing | Papa Parse (CSV) + SheetJS (Excel) |
| Auth | NextAuth.js (Credentials provider) |
| PDF Export | @react-pdf/renderer |
| Tree UI | react-arborist or custom |
| Deployment | Vercel or Docker |

## Authentication

- **Admins**: Simple username/password via NextAuth.js Credentials provider. Session-based.
- **Respondents**: No login. Access via unique token URL. Token validated server-side.

## Key Design Decisions

1. **Project-scoped data**: All data (taxonomy, employees, surveys) scoped to a Project. Supports running multiple engagements.
2. **Flexible location tagging with inheritance**: Tag at any taxonomy level; children inherit unless overridden. Reduces admin effort for large taxonomies.
3. **Dual survey modes**: Individual (per-employee, precise) and Role-Based (representative, scalable) under admin control.
4. **Link-based distribution**: Avoids email infrastructure. CSV export lets admins use their own email tools.
5. **Configurable shared services salary**: Admin sets the target rate, enabling "what if" scenarios.
