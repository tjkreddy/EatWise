# EatWise Testing Suite Documentation

## Overview
This document describes the comprehensive testing suite created for the EatWise frontend application. The suite includes both unit tests using Vitest and end-to-end tests using Cypress.

## Test Files Created

### 1. Cypress E2E Tests

#### `cypress/e2e/simple.cy.ts` - Simple End-to-End Tests
**Purpose**: Basic UI interaction tests for navigation and form filling
**Test Count**: 5 tests

Tests:
- ✅ Landing page loads and displays welcome message
- ✅ Navigation to login page via button click
- ✅ Navigation to signup page via button click
- ✅ Form filling with email and password inputs
- ✅ Interactive navbar visibility

**How to Run**:
```bash
npm run cypress:open              # Interactive mode
npm run cypress:run -- --spec cypress/e2e/simple.cy.ts  # Headless
```

---

### 2. Unit Tests

#### `src/__tests__/authAPI.test.ts` - Authentication API Tests
**Purpose**: Test all authentication-related functions
**Test Count**: 12 tests
**Framework**: Vitest

Tests covered:
- Token storage and retrieval
- User data management
- Authentication status checks
- Login/signup API calls
- Logout functionality
- localStorage management

**Key Functions Tested**:
- `authAPI.getToken()`
- `authAPI.getUser()`
- `authAPI.isAuthenticated()`
- `authAPI.login()`
- `authAPI.signup()`
- `authAPI.logout()`

---

#### `src/__tests__/shoppingListAPI.test.ts` - Shopping List API Tests
**Purpose**: Test shopping list CRUD operations
**Test Count**: 9 tests

Tests covered:
- Fetching shopping list items
- Adding new items
- Updating items
- Deleting items
- Marking items as purchased/unpurchased
- Error handling for API failures

**Key Functions Tested**:
- `shoppingListAPI.getItems()`
- `shoppingListAPI.addItem()`
- `shoppingListAPI.updateItem()`
- `shoppingListAPI.deleteItem()`
- `shoppingListAPI.markPurchased()`
- `shoppingListAPI.markUnpurchased()`

---

#### `src/__tests__/householdAPI.test.ts` - Household API Tests
**Purpose**: Test household management operations
**Test Count**: 10 tests

Tests covered:
- Creating new households
- Joining households with invite codes
- Fetching user's household
- Leaving households
- Deleting households
- Error handling for household operations

**Key Functions Tested**:
- `householdAPI.createHousehold()`
- `householdAPI.joinHousehold()`
- `householdAPI.getMyHousehold()`
- `householdAPI.leaveHousehold()`
- `householdAPI.deleteHousehold()`

---

#### `src/__tests__/LoginPage.test.tsx` - LoginPage Component Tests
**Purpose**: Test login form component functionality
**Test Count**: 8 tests
**Framework**: Vitest + React Testing Library

Tests covered:
- Form rendering (email and password fields)
- Button visibility
- Navigation links
- Input value changes
- Form submission and API calls
- Error message display
- Loading states
- Back navigation link

**Component Functions Tested**:
- Form rendering
- handleLogin event handler
- State management (email, password, error, loading)
- Navigation on success/failure

---

#### `src/__tests__/LandingPage.test.tsx` - LandingPage Component Tests
**Purpose**: Test landing page UI and navigation
**Test Count**: 11 tests

Tests covered:
- Main heading and tagline rendering
- Navigation buttons
- FAQ section rendering
- Responsive layout classes
- Brand/logo display
- Get started button
- All navigation links

**Component Functions Tested**:
- expandedFaq state management
- FAQ rendering
- Responsive layout with Tailwind classes

---

#### `src/__tests__/ShoppingList.test.tsx` - ShoppingList Component Tests
**Purpose**: Test shopping list page functionality
**Test Count**: 11 tests

Tests covered:
- User authentication check
- Shopping list items fetching
- Loading and error states
- Add item functionality
- Display of shopping items
- Logout functionality
- Navigation on unauthorized access

**Component Functions Tested**:
- handleAddItem form submission
- handleMarkPurchased item marking
- handleDeleteItem deletion
- Item list rendering
- State management

---

#### `src/__tests__/Dashboard.test.tsx` - Dashboard Component Tests
**Purpose**: Test dashboard functionality and household display
**Test Count**: 12 tests

Tests covered:
- Authentication checks and redirects
- Household data fetching
- Display of household name
- Display of household members and details
- User greeting with full name
- Logout functionality
- Error handling
- Navigation links

**Component Functions Tested**:
- Household data fetching
- Member list rendering
- User information display
- Logout action

---

## Test Coverage Summary

| Category | API Methods | Components | Total Functions |
|----------|-------------|-----------|-----------------|
| Authentication | 6 | 1 | 7 |
| Shopping List | 6 | 1 | 7 |
| Household Management | 5 | 1 | 6 |
| Landing/Navigation | 0 | 1 | 5 |
| **Total** | **17** | **4** | **25** |

---

## Running the Tests

### Run All Unit Tests
```bash
npm test                    # Watch mode
npm test -- --run          # Run once and exit
npm test:cov               # With coverage report
npm test:ui                # With UI dashboard
```

### Run Specific Test File
```bash
npm test -- authAPI.test.ts
npm test -- LoginPage.test.tsx
```

### Run E2E Tests
```bash
npm run cypress:open                    # Interactive mode
npm run cypress:run                     # All E2E tests
npm run cypress:run -- --spec "cypress/e2e/simple.cy.ts"  # Specific test
```

---

## Test Environment Setup

### Dependencies Installed
- `vitest` - Unit testing framework
- `@testing-library/react` - React component testing utilities
- `@testing-library/dom` - DOM testing utilities
- `happy-dom` - Lightweight DOM implementation for testing
- `@vitest/ui` - Vitest UI dashboard

### Configuration Files
- `vitest.config.ts` - Vitest configuration with happy-dom environment
- `cypress.config.ts` - Cypress configuration with 10s timeout

---

## Test Patterns Used

### Mocking Pattern
All tests use `vi.mock()` for:
- API calls (fetch)
- Router navigation (useNavigate)
- External services (authAPI, householdAPI, shoppingListAPI)

### Setup Pattern
Each test file includes:
- `beforeEach()` to clear mocks and localStorage
- Mock data fixtures
- Consistent test structure

### Assertion Pattern
Tests verify:
- Component renders correctly
- User interactions trigger correct handlers
- API calls are made with correct parameters
- States update properly
- Navigation occurs on success/failure
- Error messages display appropriately

---

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```bash
# For CI/CD - Run once and exit
npm test -- --run           # Unit tests
npm run cypress:run         # E2E tests
npm run lint                # ESLint
```

---

## Notes

- Tests use mocked API calls to avoid making real HTTP requests
- Component tests use `react-router-dom` BrowserRouter for routing
- localStorage is cleared between tests to ensure test isolation
- Cypress tests interact with the actual running application (requires dev server)
- Unit tests don't require running backend/frontend servers

---

## Future Enhancements

1. Add integration tests for complex user flows
2. Add visual regression testing
3. Add performance testing
4. Increase component test coverage to 100%
5. Add accessibility (a11y) tests using jest-axe
6. Add Visual testing with Percy or similar tools
