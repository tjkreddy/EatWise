# Frontend Tests - Setup and Execution Guide

This document explains how to set up and run the frontend tests for EatWise.

## Prerequisites

- Backend API running on `http://localhost:8080`
- Frontend dev server running on `http://localhost:5173`
- Node.js and npm installed

## Setup Instructions

### 1. Install Test Dependencies

Navigate to the web app directory and install required test packages:

```bash
cd eatwise-app/apps/web
npm install --save-dev vitest happy-dom @vitest/ui @vitest/coverage-v8 cypress @cypress/schematic
```

### 2. Unit Tests with Vitest

**What's Tested:**
- Form validation (shopping list, pantry items)
- State transitions (add, update, delete, mark purchased)
- Error handling
- Date calculations and status logic

**Run Unit Tests:**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:cov
```

**Sample Unit Test Output:**

```
✓ src/__tests__/validation.test.ts (20 tests)
  ✓ Form Validation
    ✓ Shopping List Item Validation
      ✓ should reject empty name
      ✓ should accept valid item with name and quantity
      ✓ should reject zero or negative quantity
      ✓ should accept positive quantity
      ✓ should handle optional fields gracefully
    ✓ Pantry Item Validation
      ✓ should reject item without name
      ✓ should validate expiration date format
      ✓ should accept future expiration dates
  ✓ State Transitions
    ✓ Shopping List State
      ✓ should add item to list
      ✓ should mark item as purchased
      ✓ should delete item from list
      ✓ should separate pending and completed items
    ✓ Dashboard State
      ✓ should filter items by category
      ✓ should calculate expiration status
  ✓ Error Handling
    ✓ should handle API errors gracefully
    ✓ should display error message for network failures
    ✓ should handle invalid form submission

Test Files  1 passed (1)
Tests  20 passed (20)
```

### 3. E2E Tests with Cypress

**What's Tested:**
- User authentication (signup, login)
- Household creation and management
- Shopping list CRUD operations
- Dashboard household display
- Navigation between pages
- Error states and validation

**Run E2E Tests:**

```bash
# Open Cypress interactive test runner
npm run cypress:open

# Run Cypress tests headlessly
npm run cypress:run

# Run specific test file
npm run cypress:run -- --spec "cypress/e2e/eatwise.cy.ts"
```

**Recommended Test Execution Order:**

1. Start backend API:
   ```bash
   cd eatwise-app/apps/api
   go run main.go
   ```

2. Start frontend dev server (new terminal):
   ```bash
   cd eatwise-app/apps/web
   npm run dev
   ```

3. Run Cypress tests (new terminal):
   ```bash
   cd eatwise-app/apps/web
   npm run cypress:open
   # OR for headless mode:
   npm run cypress:run
   ```

## Test Scenarios Covered

### Authentication Flow
- ✅ New user signup with email, password, and optional name
- ✅ User login with credentials
- ✅ Invalid password rejection
- ✅ Logout and session clearing

### Household Management
- ✅ Create new household
- ✅ Display invite code
- ✅ Copy/share functionality
- ✅ Join household with invite code

### Shopping List Operations
- ✅ Navigate to shopping list page
- ✅ Add item with name, quantity, unit, and category
- ✅ Add multiple items
- ✅ Mark item as purchased (checkbox)
- ✅ Unmark purchased items
- ✅ Delete items from list
- ✅ Form validation (required fields, positive quantity)
- ✅ Empty state handling

### Dashboard Updates
- ✅ Display household name in header
- ✅ Show household members panel
- ✅ Display member avatars and emails
- ✅ Handle loading state for members
- ✅ Show error messages if household fails to load

### Navigation
- ✅ Navigate between dashboard and shopping list
- ✅ Proper route transitions
- ✅ Logout redirects to login

## Test Files

- **Unit Tests**: `src/__tests__/validation.test.ts`
  - 20 test cases covering validation and state logic
  - No API calls required
  - Fast execution (< 1 second)

- **E2E Tests**: `cypress/e2e/eatwise.cy.ts`
  - 30+ test cases covering full user workflows
  - Requires running backend and frontend
  - Execution time: 2-5 minutes depending on system

## Expected Pass Rates

After successful setup:

- **Unit Tests**: 20/20 passing (~100%)
- **E2E Tests**: 30+/30+ passing (~100%)
- **Total Coverage**: All core user flows validated

## Troubleshooting

### Issue: Cypress can't connect to `http://localhost:5173`
**Solution**: Ensure frontend is running with `npm run dev`

### Issue: E2E tests fail with API errors
**Solution**: Ensure backend is running with `go run main.go` and `.env` file is properly configured

### Issue: Tests fail with "User not found" errors
**Solution**: Clear localStorage in Cypress tests by restarting test run

### Issue: Form validation tests are failing
**Solution**: Verify that the input validation logic matches the test expectations

## Adding New Tests

### New Unit Test Example:

```typescript
it("should validate email format", () => {
  const emails = [
    { email: "test@example.com", valid: true },
    { email: "invalid-email", valid: false },
  ];

  emails.forEach(({ email, valid }) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValid).toBe(valid);
  });
});
```

### New E2E Test Example:

```typescript
it("should complete full shopping workflow", () => {
  cy.visit(`${baseUrl}/shopping-list`);
  cy.contains("Add Item").click();
  // ... test steps ...
});
```

## CI/CD Integration

To integrate tests into CI/CD pipeline:

```bash
# In your GitHub Actions or similar:
- name: Run Unit Tests
  run: cd eatwise-app/apps/web && npm test

- name: Run E2E Tests
  run: cd eatwise-app/apps/web && npm run cypress:run
```

## Performance Metrics

- Unit tests: ~500ms to 1s
- E2E tests: ~2-5 minutes (depending on system)
- Total test suite: ~5-10 minutes

## Test Maintenance

- Update tests whenever component logic changes
- Keep E2E tests updated with new user workflows
- Review unit tests quarterly for coverage gaps
- Update test data if database schema changes
