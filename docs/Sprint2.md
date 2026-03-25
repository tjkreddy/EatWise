# Sprint 2 - EatWise Product Logic and UI Specification

## 1. Purpose

EatWise helps individuals and households track pantry inventory, reduce food waste, and plan restocking.

This document defines:

1. End-to-end product logic for all core and planned features.
2. UI behavior and screen requirements.
3. Backend data and API contracts needed for implementation.
4. Test and delivery expectations for Sprint 2.

## 2. Product Goals

1. Let authenticated users manage pantry items (create, view, update, delete).
2. Support expiration-aware inventory and low-stock awareness.
3. Support household collaboration with invite codes.
4. Support shopping-list workflows (manual and automatic from pantry state).
5. Provide predictable API contracts and testable behavior.

## 3. User Roles

1. Guest: can view landing page, can sign up/login.
2. Authenticated User: can manage own profile and pantry/household data.
3. Household Owner: can invite and remove members, manage household settings.
4. Household Member: can manage shared pantry and shopping list.

## 4. Feature Scope (Target State)

### 4.1 Authentication

1. Sign up with email, password, optional full name.
2. Login with email/password.
3. JWT token used for protected APIs.
4. Logout clears local session.

### 4.2 Pantry Management

1. List pantry items by active household.
2. Add pantry item with:
   name, quantity, unit, category, expiration date, notes.
3. Edit pantry item fields.
4. Delete pantry item.
5. Sort/filter by category and expiry status.

### 4.3 Alerts and Insights

1. Expiring soon: item expiry <= 7 days.
2. Critical expiry: item expiry <= 2 days.
3. Expired: expiry date < today.
4. Low stock: quantity <= threshold (default threshold = 1, configurable later).

### 4.4 Shopping List

1. Manual add to shopping list.
2. Manual remove or mark purchased.
3. Auto-create suggestion when pantry quantity becomes 0.
4. Shopping list scoped to active household.

### 4.5 Household Collaboration

1. Create household.
2. Generate and share invite code.
3. Join household using invite code.
4. View member list.
5. Owner can remove member.
6. Pantry and shopping list are household-scoped.

## 5. Current vs Sprint 2 Completion

### 5.1 Already Implemented

1. Auth endpoints and login/signup UI.
2. Pantry CRUD backend endpoints.
3. Dashboard list/add/delete/update flows.
4. Basic expiration logic in dashboard.

### 5.2 Pending for Sprint 2

1. Household APIs and data model.
2. Shopping list APIs and UI.
3. Unified API client + env-based backend URL usage.
4. Frontend and backend test coverage.
5. Formal endpoint schema documentation (this document section 9).

## 6. UI Specification

### 6.1 Landing Page

Purpose:
Explain value proposition and route users to signup/login.

Required sections:

1. Hero headline and CTA buttons (`Sign up`, `Log in`).
2. Feature cards: Pantry, Alerts, Household, Shopping.
3. Footer with project/team info.

### 6.2 Signup Page

Fields:

1. Full name (optional).
2. Email (required).
3. Password (required, minimum 6).

Behavior:

1. Client-side validation.
2. On success store token/user and redirect to household gate.
3. On failure show inline error message.

### 6.3 Login Page

Fields:

1. Email.
2. Password.

Behavior:

1. On success redirect to household gate/dashboard.
2. On failure show invalid credentials message.

### 6.4 Household Gate Page (New)

Condition:
Shown when user is authenticated but has no active household.

Actions:

1. Create household.
2. Join household with invite code.

### 6.5 Create Household Page (New)

Fields:

1. Household name.

On success:

1. Display invite code.
2. Copy invite code button.
3. Continue to dashboard.

### 6.6 Join Household Page (New)

Fields:

1. Invite code.

On success:

1. Join membership.
2. Redirect to dashboard.

### 6.7 Dashboard Page

Sections:

1. Top bar: user, household name, logout.
2. Stats cards: total items, expiring soon, expired, members.
3. Alerts panel: expiry and low-stock alerts.
4. Pantry table/cards.
5. Add/Edit item form modal or inline panel.
6. Category filter and quick search.
7. Member list panel.

Behavior:

1. Loads pantry and household context after login.
2. Uses optimistic or post-success state update for CRUD.
3. Shows clear empty state when no items.

### 6.8 Shopping List Page (New)

Sections:

1. Pending list.
2. Completed list (optional first iteration).
3. Add item input.

Actions:

1. Add item.
2. Mark purchased.
3. Delete item.

## 7. Data Model (Sprint 2 Target)

### 7.1 users

1. id (uuid, pk)
2. email (text, unique, not null)
3. password_hash (text, not null)
4. full_name (text, nullable)
5. created_at, updated_at (timestamp)

### 7.2 households

1. id (uuid, pk)
2. name (text, not null)
3. invite_code (text, unique, not null)
4. created_by (uuid, fk users.id)
5. created_at, updated_at

### 7.3 household_members

1. id (uuid, pk)
2. household_id (uuid, fk households.id)
3. user_id (uuid, fk users.id)
4. role (text: owner/member)
5. joined_at
6. unique(household_id, user_id)

### 7.4 pantry_items

1. id (serial/int, pk)
2. household_id (uuid, fk households.id)
3. user_id (uuid, fk users.id) - creator or last updater
4. name (text)
5. quantity (int)
6. unit (text)
7. category (text)
8. expiration_date (date)
9. notes (text)
10. created_at, updated_at

### 7.5 shopping_list_items

1. id (uuid, pk)
2. household_id (uuid, fk households.id)
3. name (text, not null)
4. quantity (int, default 1)
5. unit (text)
6. source (manual|auto_low_stock)
7. status (pending|purchased)
8. created_by (uuid, fk users.id)
9. created_at, updated_at

## 8. Business Logic Rules

1. All pantry and shopping list operations require auth token.
2. User must belong to household to access household data.
3. Owner permissions required for member removal.
4. Invite codes are uppercase alphanumeric and unique.
5. Quantity must be non-negative.
6. Expiration date must be valid `YYYY-MM-DD`.
7. Auto shopping suggestion is generated when item quantity is set to 0.
8. Duplicate household membership is rejected.

## 9. API Contracts (Request/Response Schemas)

All protected routes require header:
`Authorization: Bearer <token>`

### 9.1 Auth

#### POST `/api/auth/signup`

Request:

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "full_name": "Alex"
}
```

Response 200:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Alex",
    "created_at": "2026-03-23T19:30:00Z"
  }
}
```

#### POST `/api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Response 200:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Alex",
    "created_at": "2026-03-23T19:30:00Z"
  }
}
```

### 9.2 Households

#### POST `/api/households`

Request:

```json
{
  "name": "Room 301"
}
```

Response 201:

```json
{
  "id": "uuid",
  "name": "Room 301",
  "invite_code": "AB12CD",
  "created_by": "user-uuid",
  "created_at": "2026-03-23T19:35:00Z"
}
```

#### POST `/api/households/join`

Request:

```json
{
  "invite_code": "AB12CD"
}
```

Response 200:

```json
{
  "message": "joined",
  "household_id": "uuid"
}
```

#### GET `/api/households/me`

Response 200:

```json
{
  "household": {
    "id": "uuid",
    "name": "Room 301",
    "invite_code": "AB12CD"
  },
  "members": [
    {
      "user_id": "uuid",
      "email": "owner@example.com",
      "full_name": "Owner",
      "role": "owner"
    }
  ]
}
```

#### DELETE `/api/households/:id/members/:userId`

Response 200:

```json
{
  "message": "member removed"
}
```

### 9.3 Pantry

#### GET `/api/pantry/items`

Response 200:

```json
[
  {
    "id": 1,
    "household_id": "uuid",
    "user_id": "uuid",
    "name": "Milk",
    "quantity": 1,
    "unit": "L",
    "category": "Dairy",
    "expiration_date": "2026-03-28",
    "notes": "Low fat",
    "created_at": "2026-03-23T19:40:00Z",
    "updated_at": "2026-03-23T19:40:00Z"
  }
]
```

#### POST `/api/pantry/items`

Request:

```json
{
  "name": "Milk",
  "quantity": 1,
  "unit": "L",
  "category": "Dairy",
  "expiration_date": "2026-03-28",
  "notes": "Low fat"
}
```

Response 201: pantry item object.

#### PUT `/api/pantry/items/:id`

Request:

```json
{
  "quantity": 0,
  "notes": "Finished"
}
```

Response 200: updated pantry item object.

#### DELETE `/api/pantry/items/:id`

Response 200:

```json
{
  "message": "deleted"
}
```

### 9.4 Shopping List

#### GET `/api/shopping-list/items`

Response 200:

```json
[
  {
    "id": "uuid",
    "household_id": "uuid",
    "name": "Eggs",
    "quantity": 12,
    "unit": "pcs",
    "source": "manual",
    "status": "pending",
    "created_at": "2026-03-23T19:45:00Z"
  }
]
```

#### POST `/api/shopping-list/items`

Request:

```json
{
  "name": "Eggs",
  "quantity": 12,
  "unit": "pcs"
}
```

Response 201: shopping list item object.

#### PUT `/api/shopping-list/items/:id`

Request:

```json
{
  "status": "purchased"
}
```

Response 200: updated shopping list item.

#### DELETE `/api/shopping-list/items/:id`

Response 200:

```json
{
  "message": "deleted"
}
```

### 9.5 Error Schema

All errors should follow:

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE"
}
```

## 10. Frontend Architecture Guidelines

1. Use `VITE_API_BASE_URL` in `.env` instead of hardcoded URLs.
2. Centralize HTTP calls in `src/lib/apiClient.ts`.
3. Keep page components UI-focused and move data logic to hooks/services.
4. Add shared types under `src/types` aligned with API schemas.

## 11. Testing Strategy

### 11.1 Frontend

1. Unit tests for form validation and mapping helpers.
2. Component tests for household gate and dashboard states.
3. Cypress flows:
   signup/login, create household, join household, pantry CRUD, shopping list.

### 11.2 Backend

1. Handler tests for auth, household, pantry, shopping list.
2. Service tests for business rules (membership checks, invite handling).
3. Integration smoke test against test database or isolated schema.

## 12. Sprint 2 Work Split (4 Members)

### Member 1 - Frontend Integration

1. API client abstraction and env URL migration.
2. Household create/join UI and routing.
3. Dashboard household context integration.

### Member 2 - Frontend Testing and UX

1. Unit tests and Cypress tests.
2. Shopping list UI.
3. Error/loading/empty-state UX improvements.

### Member 3 - Backend Data and APIs

1. DB migrations for household and shopping list tables.
2. Household and shopping list endpoints.
3. Invite code generation and membership rules.

### Member 4 - Backend Security and Quality

1. JWT and household authorization middleware.
2. Pantry scoping by household.
3. `_test.go` coverage and API docs verification.

## 13. Definition of Done

1. Real DB-backed backend starts reliably with configured `DATABASE_URL`.
2. No mock backend path in production startup flow.
3. Household create/join works end-to-end.
4. Pantry and shopping list are shared and scoped by household.
5. UI screens and API behavior match this document.
6. Critical tests pass in frontend and backend pipelines.
