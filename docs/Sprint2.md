# Sprint 2 Report

## 1. Detailed Work Completed in Sprint 2

### Backend (Go API)

1. Implemented authentication endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/login`

2. Implemented household management endpoints:

- create household
- join household via invite code
- get current household details and members
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

5. Added route dispatch and method guards for API route groups.
6. Added helper logic for token parsing, invite code generation, and household membership/ownership checks.

### Frontend (React + TypeScript)

1. Added and connected feature pages:

- pantry list page
- shopping list page
- manage household page

2. Connected left-nav and top-nav routing between dashboard and feature pages.
3. Added household UX flow:

- create/join household
- invite code copy
- leave household for member
- delete household for owner

4. Updated dashboard layout per requests (header cards and content cleanup).
5. Fixed dashboard category counting logic by normalizing category values.
6. Updated pantry add form fields `unit` and `category` to use dropdown selections.

### Quality and Validation

1. Added Cypress coverage for key frontend flows.
2. Added backend unit tests for pure helpers and handler method behavior.
3. Updated backend DB-backed tests to skip cleanly when DB is unavailable.
4. Verified backend test suite using `go test ./...` in `eatwise-app/apps/api`.

## 2. Frontend Tests

### Frontend Unit Tests (Vitest)

Location: `eatwise-app/apps/web/src/__tests__/`

1. `LandingPage.test.tsx`

- validates landing page render and CTA visibility.

2. `LoginPage.test.tsx`

- validates login form rendering.
- validates input interaction.
- validates submit behavior and error handling.
- validates post-login navigation behavior.

3. `Dashboard.test.tsx`

- validates dashboard render and expected content sections.

4. `ShoppingList.test.tsx`

- validates authenticated render path.
- validates unauthenticated redirect path.
- validates loading and error states.
- validates add/list shopping item behaviors.

5. `authAPI.test.ts`

- validates auth API utility behavior.

6. `householdAPI.test.ts`

- validates household API utility behavior.

7. `shoppingListAPI.test.ts`

- validates shopping list API utility behavior.

### Cypress Tests (Frontend E2E)

Location: `eatwise-app/apps/web/cypress/e2e/`

1. `simple.cy.ts`

- verifies landing page load.
- verifies login and signup navigation clicks.
- verifies simple form-fill interaction.

2. `eatwise.cy.ts`

- verifies authentication flows.
- verifies household management flow.
- verifies shopping list flow.
- verifies dashboard/navigation/logout flow.

## 3. Backend Unit Tests

Location: `eatwise-app/apps/api/`

### Pure Unit Tests

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

### DB-Backed API Tests

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

Implementation source: `eatwise-app/apps/api/main.go`

Base URL (local): `http://localhost:8080`

Protected endpoint auth header:

- `Authorization: Bearer <jwt>`

### Authentication APIs

1. `POST /api/auth/signup`

- creates user and returns token + user.

Example body:

```json
{
  "email": "user@example.com",
  "password": "TestPassword123",
  "full_name": "Jane Doe"
}
```

2. `POST /api/auth/login`

- logs in user and returns token + user.

Example body:

```json
{
  "email": "user@example.com",
  "password": "TestPassword123"
}
```

### Household APIs

1. `POST /api/households`

- create household for authenticated user as owner.

2. `DELETE /api/households`

- delete current household (owner only).

3. `POST /api/households/join`

- join household by invite code.

Example body:

```json
{
  "invite_code": "AB12CD"
}
```

4. `POST /api/households/leave`

- leave household (member only, owner cannot directly leave).

5. `GET /api/households/me`

- return current household and members.

6. `DELETE /api/households/{householdId}`

- delete specific household (owner only).

7. `DELETE /api/households/{householdId}/members/{userId}`

- remove member from household (owner only).

### Pantry APIs

1. `GET /api/pantry/items`

- list pantry items for current household.

2. `POST /api/pantry/items`

- add pantry item.

Example body:

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

### Shopping List APIs

1. `GET /api/shopping-list`

- list shopping items for current household.

2. `POST /api/shopping-list`

- add shopping item.

Example body:

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

Example body:

```json
{
  "purchased": true
}
```

4. `DELETE /api/shopping-list/{id}`

- delete shopping item.

### Common Status Codes

1. `200` success
2. `201` created
3. `400` bad request
4. `401` unauthorized
5. `403` forbidden
6. `404` not found
7. `405` method not allowed
8. `409` conflict
9. `500` internal server error

### Environment Variables

1. `DATABASE_URL` (required)
2. `JWT_SECRET` (recommended)
