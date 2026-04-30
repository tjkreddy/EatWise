# Sprint 4 Summary

## Team Members

- **Jugal Kishore Reddy Thangella** – Backend Developer
- **Sadhvini Boyanapally** – Frontend Developer
- **Hasini Jevaji** – Frontend Developer
- **Krishna Chaitanya Padigela** – Backend Developer

---

## 1. Work Completed in Sprint 4

In Sprint 4, we focused on enhancing the robustness of the backend API, standardizing error handling, expanding test coverage, and organizing project documentation for final delivery.

### 1.1 Backend Enhancements & Validation
- **Integer-Only Quantity Validation:** Implemented strict validation to ensure quantities in the shopping list and pantry are positive integers.
- **Standardized Error Contract:** Refactored the entire API to return a consistent JSON error object containing an `error` message and a machine-readable `code`.
- **Full-Field Updates:** Enhanced the shopping list update endpoint to support modification of name, unit, category, and quantity in a single request.
- **Improved Input Parsing:** Developed shared helper functions (`parseOptionalIntegerField`, `parseRequiredStringField`, etc.) to unify validation logic across all handlers.

### 1.2 Documentation & Organization
- **Centralized Docs:** Moved all documentation files from application subdirectories into a root `docs/` folder, organized by category (API, Web, Sprints).
- **Front-Page README:** Upgraded the main repository `README.md` with detailed prerequisites, installation guides, and execution instructions for the full stack.
- **API Documentation Update:** Updated the backend API docs to reflect the new standardized error formats and enhanced shopping list capabilities.

---

## 2. Testing Coverage

### 2.1 Backend Unit & Integration Tests
We have implemented 44 comprehensive tests for the Go backend, covering authentication, household management, pantry logic, and shopping list operations.

**Key Tests Added/Updated in Sprint 4:**
- `TestAddShoppingItemValidationRejectsNonIntegerQuantity`: Verifies strict type checking for item quantities.
- `TestUpdateShoppingItemValidationRejectsNonIntegerQuantity`: Ensures updates maintain data integrity.
- `TestShoppingUpdateAndPurchasedTogglePersistsInDB`: Integration test verifying full-field updates and database persistence.
- `TestShoppingUpdateInvalidBodyErrorContract`: Validates the new standardized error response format.

**Full Backend Test List:**
- `TestCreateHousehold`, `TestJoinHousehold`, `TestGetHousehold`
- `TestRemoveMember`, `TestTransferOwnership`, `TestLeaveHousehold`
- `TestPantryCRUD`, `TestPantryUpdateAllFieldsAndValidation`
- `TestShoppingUpdateAllFieldsAndPurchasedToggle`, `TestClearPurchasedShoppingItems`
- `TestHashPasswordAndCheckPassword`, `TestGenerateJWTAndGetUserIDFromRequest`
- `TestSignupValidation`, `TestLoginValidation`
- ... (44 total tests passing)

### 2.2 Frontend Unit Tests (Vitest)
Located in `eatwise-app/apps/web/src/__tests__/`:
- `authAPI.test.ts`: Authentication service logic.
- `householdAPI.test.ts` & `shoppingListAPI.test.ts`: API interaction layers.
- `Dashboard.test.tsx`, `PantryList.test.tsx`, `ShoppingList.test.tsx`: Component rendering and state.
- `LoginPage.test.tsx`, `SignupPage.test.tsx`, `CreateHouseholdPage.test.tsx`: Page-level flows.

### 2.3 Frontend E2E Tests (Cypress)
Located in `eatwise-app/apps/web/cypress/e2e/`:
- `eatwise.cy.ts`: Full application walkthrough.
- `signup-flow.cy.ts`: End-to-end user registration and household creation.
- `simple.cy.ts`: Basic sanity checks for app loading.

---

## 3. Backend API Documentation
The updated documentation can be found in [docs/api/README.md](../api/README.md). It now includes:
- Detailed error code tables.
- Standardized request/response examples for all shopping list operations.
- Corrected error response JSON structure.
