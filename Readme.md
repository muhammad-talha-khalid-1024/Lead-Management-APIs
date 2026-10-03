# Lead Management API

A RESTful backend API for a Real Estate Lead Management System, built as a technical coding assignment.

The application manages the complete lead lifecycle from creation and qualification through agent assignment, conversion/drop, supervisor approval, and closure.

## Technology Stack

* Node.js
* TypeScript
* Express.js
* PostgreSQL
* Prisma ORM
* JWT Authentication
* bcryptjs
* Zod
* Jest
* Supertest

---

# 1. How to Run the Application

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* PostgreSQL

## Clone the repository

```bash
git clone <repository-url>
cd lead-management-api
```

## Install dependencies

```bash
npm install
```

## Configure environment variables

Create a `.env` file:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lead_management"
JWT_SECRET="change-this-to-a-long-random-secret-key"
JWT_EXPIRES_IN="7d"
```

Update `DATABASE_URL` according to your PostgreSQL configuration.

## Create the database

Create a PostgreSQL database named:

```text
lead_management
```

## Run Prisma migrations

```bash
npx prisma migrate dev
```

## Generate Prisma Client

```bash
npx prisma generate
```

## Seed the database

```bash
npm run prisma:seed
```

## Start the development server

```bash
npm run dev
```

The API will run on:

```text
http://localhost:5000
```

## Production build

```bash
npm run build
npm start
```

---

# 2. Architecture Overview

The application follows a layered architecture:

```text
Client
  │
  ▼
Routes
  │
  ▼
Middleware
  │
  ├── Authentication
  ├── Authorization
  └── Request Validation
  │
  ▼
Controllers
  │
  ▼
Services
  │
  ▼
Prisma ORM
  │
  ▼
PostgreSQL
```

### Routes

Define HTTP endpoints and connect requests to the appropriate middleware and controllers.

### Middleware

Responsible for cross-cutting concerns such as:

* JWT authentication
* Role-based authorization
* Request validation
* Error handling

### Controllers

Handle HTTP-specific responsibilities:

* Reading request parameters
* Calling services
* Returning HTTP responses
* Mapping business errors to HTTP status codes

### Services

Contain the main business logic, including:

* Lead creation
* Duplicate detection
* Qualification
* Agent assignment
* Conversion
* Drop workflow
* Approval
* Timeline/history creation
* Workflow transition validation

### Prisma

Prisma is used as the ORM for database access and transactions.

---

# 3. Database / Schema Overview

PostgreSQL is used as the primary relational database.

The main entities are:

```text
User
Role
Lead
LeadTimeline
LeadHistory
```

## Lead

The `Lead` model contains the main lead information:

```text
id
createdById
name
phone
whatsappNumber
email
source
campaign
interestedLocation
propertyType
bedrooms
budgetFrom
budgetTo
movingDate
priority
status
qualificationComment
notQualifiedReason
notQualifiedComment
assignedAgentId
propertyId
unitId
convertedComment
droppedReason
droppedComment
createdAt
updatedAt
```

## Role

Users are associated with a role.

The supported roles are:

```text
lead-generation
lead-generation-supervisor
agent-supervisor
agent
```

## LeadTimeline

Timeline is a dedicated table for business events.

Examples:

```text
LEAD_CREATED
QUALIFICATION_STARTED
LEAD_QUALIFIED
LEAD_NOT_QUALIFIED
AGENT_ASSIGNED
LEAD_CONVERTED
LEAD_DROPPED
OUTCOME_APPROVED
LEAD_CLOSED
```

Timeline represents the chronological business event feed.

## LeadHistory

History is intentionally separate from Timeline.

It stores detailed audit information:

```text
action
performedById
oldData
newData
createdAt
```

This allows the system to record what data changed in addition to recording the human-readable business event.

---

# 4. Lead Workflow

The lead lifecycle is:

```text
NEW
 │
 ▼
LEAD_GENERATION_FOLLOW_UP
 │
 ▼
QUALIFIED
 │
 ▼
PENDING_AGENT_ASSIGNMENT
 │
 ▼
AGENT_ASSIGNED
 │
 ├───────────────┐
 │               │
 ▼               ▼
CONVERTED_      DROPPED_
PENDING_        PENDING_
APPROVAL        APPROVAL
 │               │
 └───────┬───────┘
         ▼
       CLOSED
```

There is deliberately no `NOT_QUALIFIED` status.

A lead marked as not qualified retains its current workflow status while the not-qualified reason and comment are stored separately.

---

# 5. API Overview

## Authentication

### Login

```http
POST /api/auth/login
```

Returns a JWT token that is used for authenticated endpoints.

---

## Leads

### Create Lead

```http
POST /api/leads
```

Roles:

```text
lead-generation
lead-generation-supervisor
```

### List Leads

```http
GET /api/leads
```

Supports role-based access, pagination, and filtering.

Example:

```http
GET /api/leads?page=1&limit=20&status=AGENT_ASSIGNED
```

### Get Lead

```http
GET /api/leads/:id
```

---

## Qualification

### Qualify Lead

```http
POST /api/leads/:id/qualify
```

Roles:

```text
lead-generation
lead-generation-supervisor
```

Example:

```json
{
  "qualificationComment": "Customer requires a 2-bedroom apartment in West Bay",
  "interestedLocation": "West Bay",
  "budgetFrom": 6000,
  "budgetTo": 8000
}
```

Successful workflow:

```text
LEAD_GENERATION_FOLLOW_UP
        ↓
QUALIFIED
        ↓
PENDING_AGENT_ASSIGNMENT
```

### Mark Not Qualified

```http
POST /api/leads/:id/not-qualified
```

Roles:

```text
lead-generation
lead-generation-supervisor
```

---

## Agent Assignment

### Assign Agent

```http
POST /api/leads/:id/assign
```

Role:

```text
agent-supervisor
```

Example:

```json
{
  "agentId": 123
}
```

Workflow:

```text
PENDING_AGENT_ASSIGNMENT
        ↓
AGENT_ASSIGNED
```

---

## Agent Outcomes

### Convert Lead

```http
POST /api/leads/:id/convert
```

Role:

```text
agent
```

Example:

```json
{
  "propertyId": 123,
  "unitId": 456,
  "comment": "Customer agreed to proceed with the property"
}
```

Workflow:

```text
AGENT_ASSIGNED
        ↓
CONVERTED_PENDING_APPROVAL
```

### Drop Lead

```http
POST /api/leads/:id/drop
```

Role:

```text
agent
```

Example:

```json
{
  "reason": "BUDGET_ISSUE",
  "comment": "Customer cannot increase the budget"
}
```

Workflow:

```text
AGENT_ASSIGNED
        ↓
DROPPED_PENDING_APPROVAL
```

---

## Approval

### Approve Outcome

```http
POST /api/leads/:id/approve
```

Role:

```text
lead-generation-supervisor
```

The supervisor can approve:

```text
CONVERTED_PENDING_APPROVAL
DROPPED_PENDING_APPROVAL
```

Both transition to:

```text
CLOSED
```

---

## Timeline

### Get Lead Timeline

```http
GET /api/leads/:id/timeline
```

Timeline events are returned chronologically and remain available after the lead is closed.

---

# 6. Authentication Instructions

All protected endpoints require a JWT token.

Header:

```http
Authorization: Bearer <JWT_TOKEN>
```

## Test Users

The seed data creates users for each role.

| Role                       | Email                          |
| -------------------------- | ------------------------------ |
| Lead Generation            | `lead@example.com`             |
| Lead Generation Supervisor | `lead.supervisor@example.com`  |
| Agent                      | `agent@example.com`            |
| Agent Supervisor           | `agent.supervisor@example.com` |

Development/test password:

```text
Password@123
```

These credentials are intended for local development/testing only and should not be used in production.

---

# 7. Assumptions

The following assumptions were made based on the assignment requirements.

### Lead ownership

Lead Generation users are responsible for leads they create.

Duplicate detection is therefore scoped to the same Lead Generation user rather than globally across every user.

### Duplicate handling

A duplicate is treated as a possible duplicate rather than an automatic merge.

The API returns the existing lead IDs and allows the user to explicitly continue using `forceCreate=true`.

### Not-qualified workflow

Because the assignment does not define a `NOT_QUALIFIED` LeadStatus, not-qualified information is stored using dedicated fields rather than adding an extra status.

### Agent access

Agents can only access leads assigned to themselves.

### Approval

Conversion and drop operations require supervisor approval before a lead becomes `CLOSED`.

### Audit persistence

Timeline and History records are retained after a lead is closed.

### Property and Unit

`propertyId` and `unitId` are stored as references/identifiers because the assignment focuses on the Lead Management API and does not define complete Property or Unit domain models.

---

# 8. Important Technical Decisions

## Prisma Transactions

Workflow changes and their corresponding Timeline/History records are created inside the same database transaction.

For example, qualification performs:

```text
Validate lead
       ↓
Create qualification timeline/history
       ↓
Update lead status
       ↓
Create qualified timeline/history
       ↓
Update final status
       ↓
Commit
```

If any operation fails, the transaction is rolled back.

This prevents inconsistent audit data.

---

## Separate Timeline and History

Timeline and History were implemented as separate tables because they serve different purposes.

### Timeline

Provides a chronological business event feed.

### History

Provides detailed data-change auditing through:

```text
oldData
newData
```

This separation keeps the domain model clearer and allows each structure to evolve independently.

---

## Role-Based Query Scoping

Lead access is restricted at the database query level.

For example, an agent's query includes:

```text
assignedAgentId = authenticatedUserId
```

This prevents relying only on controller-level checks.

---

## Explicit Workflow Transitions

Lead statuses are controlled using explicit allowed transitions.

Invalid transitions are rejected instead of allowing arbitrary status updates.

For example:

```text
NEW → QUALIFIED
```

is rejected because the required intermediate workflow state is missing.

---

## Zod Validation

Zod validates request payloads before business logic executes.

This separates:

```text
Invalid request data
```

from:

```text
Valid request but invalid business state
```

For example:

```text
Invalid JSON/request field → 422
Invalid lead workflow state → 400
Possible duplicate → 409
```

---

## JWT Authentication

JWT was selected because the assignment requires a stateless REST API authentication mechanism.

The token contains the authenticated user's identity and role information.

---

# 9. Testing

Automated tests were added for the most important business rules.

Current test coverage includes:

```text
✓ Successful lead qualification
✓ Agent assignment
✓ Invalid workflow transition
✓ Agent cannot access another agent's lead
✓ Duplicate lead detection
✓ Timeline and History creation
```

Tests use:

```text
Jest
Supertest
PostgreSQL test database
```

A separate test database is used:

```text
lead_management_test
```

This prevents tests from modifying the development database.

Run tests:

```bash
npm test -- --runInBand
```

---

# 10. Trade-offs Due to the 48-Hour Time Limit

The implementation prioritizes the core business requirements and important architectural concerns.

The following areas were intentionally kept lightweight:

### Property and Unit Management

The assignment requires property and unit IDs during conversion but does not require complete Property/Unit CRUD modules.

Therefore, only the identifiers are stored on the Lead.

### Advanced Search

Basic pagination and status filtering are supported. A more advanced search engine was not introduced because it was outside the core assignment requirements.

### Notifications

No email, SMS, WhatsApp, or push notification system was implemented.

### Background Jobs

The system does not currently use a queue such as BullMQ or RabbitMQ because asynchronous processing was not required for the assignment.

### Caching

Redis caching was not introduced because the assignment is focused on business workflow correctness rather than high-scale caching.

### API Documentation

The API structure is straightforward, but a full OpenAPI/Swagger specification was not prioritized within the available time.

### Observability

Basic error logging is included, but a full centralized logging and monitoring solution was not implemented.

---

# 11. Production Improvements

For a production implementation, I would consider the following improvements.

## API Documentation

Add a complete OpenAPI/Swagger specification including:

* Authentication
* Request schemas
* Response schemas
* Error responses
* Role requirements
* Workflow rules

## Automated Testing

Expand testing to include:

* All API endpoints
* Authorization matrix
* All workflow transitions
* Validation edge cases
* Transaction rollback scenarios
* Concurrent updates
* Database constraint failures
* Pagination and filtering

## Concurrency Protection

Add stronger protection around workflow transitions to handle simultaneous requests safely.

For example, two agents should not be able to update the same lead outcome concurrently.

## Database Optimization

Review query plans and add/adjust indexes based on production traffic.

Potential indexes include:

```text
createdById
assignedAgentId
status
phone
email
whatsappNumber
createdAt
```

## Structured Logging

Introduce structured logging with request IDs and correlation IDs.

This would make production debugging and tracing easier.

## Monitoring

Add:

* Application metrics
* Error monitoring
* Database monitoring
* Health checks
* Alerting

## Rate Limiting

Add endpoint-specific rate limits, especially for:

```text
Login
Lead creation
Public/externally exposed APIs
```

## Configuration Management

Use a secure secret/configuration management system rather than storing production secrets in `.env` files.

## Background Processing

Introduce queues for tasks such as:

```text
Notifications
Email
WhatsApp integration
Reports
Large exports
External service synchronization
```

## API Versioning

For a long-lived production API, introduce versioning such as:

```text
/api/v1/leads
```

This allows future breaking changes without immediately affecting existing consumers.

## Soft Deletes

Depending on business requirements, consider soft deletion for users and selected domain records instead of physical deletion.

## Audit Improvements

History could be enhanced with additional metadata such as:

```text
IP address
request ID
user agent
source system
```

where required by compliance and security policies.

---

# 12. Error Handling

The API distinguishes between different categories of errors.

### 400 Bad Request

Used for invalid business workflow operations.

Example:

```text
Attempting to qualify a NEW lead
```

### 401 Unauthorized

Used when authentication is missing or invalid.

### 403 Forbidden

Used when an authenticated user does not have the required role.

### 404 Not Found

Used when a resource cannot be accessed/found.

### 409 Conflict

Used for possible duplicate leads.

### 422 Unprocessable Entity

Used for request validation errors.

### 500 Internal Server Error

Used for unexpected server-side errors.

---

# 13. Security Considerations

The application includes:

* JWT authentication
* bcrypt password hashing
* Role-based authorization
* Zod request validation
* Helmet security headers
* CORS configuration
* PostgreSQL relational constraints
* Transactional workflow updates

Production deployment should additionally use:

* HTTPS
* Secure secret management
* Restricted CORS origins
* Rate limiting
* Database connection security
* Security monitoring
* Regular dependency updates

---

# 14. Project Scripts

Common commands:

```bash
# Development
npm run dev

# Build
npm run build

# Start production build
npm start

# Generate Prisma Client
npm run prisma:generate

# Create/apply Prisma migration
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Prisma Studio
npm run prisma:studio

# Tests
npm test -- --runInBand
```

---

# 15. Conclusion

This project implements the core Real Estate Lead Management workflow with:

* RESTful API design
* JWT authentication
* Role-based access control
* PostgreSQL persistence
* Prisma ORM
* Explicit workflow transitions
* Duplicate lead detection
* Agent assignment
* Conversion/drop approval workflow
* Separate Timeline and History auditing
* Transaction-safe business operations
* Automated business-rule testing

The implementation focuses on correctness, maintainability, and clear separation between API, business logic, persistence, and auditing while keeping the scope appropriate for the 48-hour technical assignment.
