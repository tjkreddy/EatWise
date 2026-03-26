# Sprint 2 Report

## 1. Sprint 2 Completed Work

### 1.1 Backend (Go API)

1. Implemented authentication endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/login`

2. Implemented household management endpoints:

- create household
- join household via invite code
- get current household and members
- leave household (member flow)
- delete household (owner flow)
- remove household member (owner flow)

3. Implemented pantry endpoints (household-scoped):

- fetch items
- add item
- update item
- delete item

4. Implemented shopping list endpoints (household-scoped):

- fetch shopping items
- add shopping item
- update shopping item purchase state
- delete shopping item

5. Added centralized route dispatch and HTTP method guards.
6. Added helper logic for JWT parsing, invite code generation, and household role/membership checks.

### 1.2 Frontend (React + TypeScript)

1. Added and connected pages:

- pantry list page
- shopping list page
- manage household page

2. Wired left-nav/top-nav routing among dashboard and feature pages.
3. Completed household UX flows:

- create/join household
- invite code copy
- member leave household
- owner delete household

4. Updated dashboard layout and interactions.
5. Fixed category counting by normalizing category values.
6. Converted pantry add form `unit` and `category` fields to dropdown selectors.

### 1.3 Quality and Validation

1. Added Cypress end-to-end coverage for primary flows.
2. Added backend unit tests for helpers and handler behavior.
3. Updated DB-backed backend tests to skip cleanly when DB is unavailable.
4. Verified backend tests using `go test ./...` in `eatwise-app/apps/api`.

## 2. Frontend Test Documentation

### 2.1 Unit Tests (Vitest)

Location: `eatwise-app/apps/web/src/__tests__/`

1. `LandingPage.test.tsx`

- verifies landing page render and CTA visibility.

2. `LoginPage.test.tsx`

- verifies login form rendering and interaction.
- verifies submit behavior and error handling.
- verifies navigation behavior after login.

3. `Dashboard.test.tsx`

- verifies dashboard render and key UI sections.

4. `ShoppingList.test.tsx`

- verifies authenticated/unauthenticated flows.
- verifies loading/error states.
- verifies add/list behavior.

5. `ManageHouseholdPage.test.tsx`

- verifies owner-only visibility for member removal action.
- verifies remove action calls `householdAPI.removeMember` with the selected member.

6. `authAPI.test.ts`

- verifies auth API client behavior.

7. `householdAPI.test.ts`

- verifies household API client behavior.
- includes `removeMember` success and failure scenarios for
  `DELETE /api/households/{householdId}/members/{userId}`.

8. `shoppingListAPI.test.ts`

- verifies shopping-list API client behavior.

### 2.2 Cypress End-to-End Tests

Location: `eatwise-app/apps/web/cypress/e2e/`

1. `simple.cy.ts`

- landing page load
- login/signup navigation clicks
- simple form-fill interaction

2. `eatwise.cy.ts`

- authentication flows
- household management flow
- shopping list flow
- dashboard/navigation/logout flow

## 3. Backend Unit Test Documentation

Location: `eatwise-app/apps/api/`

### 3.1 Pure Unit Tests (No DB Dependency)

File: `unit_handlers_test.go`

1. `TestHashPasswordAndCheckPassword`
2. `TestGenerateJWTAndGetUserIDFromRequest`
3. `TestGetUserIDFromRequestErrors`
4. `TestParseIDFromPath`
5. `TestParseIDFromPathErrors`
6. `TestGenerateInviteCode`
7. `TestParseHouseholdIDForMembers`
8. `TestEnableCORSOptions`
9. `TestEnableCORSPassThrough`
10. `TestRespondJSONAndRespondError`
11. `TestHandlerMethodGuards`
12. `TestHouseholdsRootHandlerMethodDispatch`
13. `TestHouseholdSubrouteHandlerUnauthorized`
14. `TestSignupValidationWithoutDBAccess`
15. `TestLoginInvalidBodyWithoutDBAccess`

### 3.2 DB-Backed API Tests

File: `main_test.go`

1. `TestCreateHousehold`
2. `TestCreateHouseholdAlreadyInHousehold`
3. `TestJoinHousehold`
4. `TestGetHousehold`
5. `TestRemoveMember`
6. `TestRemoveMemberNotOwner`
7. `TestPantryUnauthorizedWithoutHousehold`
8. `TestPantryCRUD`

Note:

- DB-backed tests auto-skip when DB is unavailable.

## 4. Backend API Documentation

### 4.1 API Basics

Source: `eatwise-app/apps/api/main.go`

Base URL (local): `http://localhost:8080`

Protected endpoint header:

- `Authorization: Bearer <jwt>`

CORS behavior:

- allows `GET, POST, PUT, DELETE, OPTIONS`
- allows headers `Content-Type, Authorization`

### 4.2 Authentication Endpoints

1. `POST /api/auth/signup`

- creates user and returns token + user.

Example request:

```json
{
  "email": "user@example.com",
  "password": "TestPassword123",
  "full_name": "Jane Doe"
}
```

2. `POST /api/auth/login`

- logs in user and returns token + user.

Example request:

```json
{
  "email": "user@example.com",
  "password": "TestPassword123"
}
```

### 4.3 Household Endpoints

1. `POST /api/households`

- create household for authenticated user as owner.

2. `DELETE /api/households`

- delete current household (owner only).

3. `POST /api/households/join`

- join household by invite code.

Example request:

```json
{
  "invite_code": "AB12CD"
}
```

4. `POST /api/households/leave`

- leave household (members only; owner cannot directly leave).

5. `GET /api/households/me`

- return current household and members.

6. `DELETE /api/households/{householdId}`

- delete specific household (owner only).

7. `DELETE /api/households/{householdId}/members/{userId}`

- remove member from household (owner only).
- constraints:
  - owner cannot remove self via this endpoint.
  - target user must already be a member of the household.
- success response:

```json
{
  "message": "member removed"
}
```

- common status codes for this endpoint:
  - `200` member removed
  - `400` invalid request (for example owner removing self)
  - `403` requester is not household owner
  - `404` target user not found in household

### 4.4 Pantry Endpoints

1. `GET /api/pantry/items`

- list pantry items for current household.

2. `POST /api/pantry/items`

- add pantry item.

Example request:

```json
{
  "name": "Milk",
  "quantity": 2,
  "unit": "liters",
  "category": "Dairy",
  "expiration_date": "2026-03-30",
  "notes": "Low fat"
}
```

3. `PUT /api/pantry/items/{id}`

- update pantry item fields.

4. `DELETE /api/pantry/items/{id}`

- delete pantry item.

### 4.5 Shopping List Endpoints

1. `GET /api/shopping-list`

- list shopping items for current household.

2. `POST /api/shopping-list`

- add shopping item.

Example request:

```json
{
  "name": "Bread",
  "quantity": 1,
  "unit": "pieces",
  "category": "Bakery"
}
```

3. `PUT /api/shopping-list/{id}`

- update shopping item (primarily `purchased` state).

Example request:

```json
{
  "purchased": true
}
```

4. `DELETE /api/shopping-list/{id}`

- delete shopping item.

### 4.6 Response and Error Notes

1. API uses a mix of plain-text errors (`http.Error`) and JSON errors (`respondError`) depending on handler.
2. Common HTTP status codes used:

- `200` success
- `201` created
- `400` bad request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `405` method not allowed
- `409` conflict
- `500` internal server error

### 4.7 Environment Variables

1. `DATABASE_URL` (required)
2. `JWT_SECRET` (recommended)
