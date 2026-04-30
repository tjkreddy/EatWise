# Development Commands

This document describes all available npm scripts for the EatWise frontend application.

## Core Development Commands

### `npm run dev`

Start the development server with hot module reloading (HMR).

- **Port**: http://localhost:5173
- **Use case**: Active development with live reload
- **Watch mode**: Yes (auto-refresh on file changes)

### `npm run build`

Compile TypeScript and build the production bundle.

- **Output directory**: `dist/`
- **Optimization**: Full minification and tree-shaking
- **Use case**: Production deployment preparation

### `npm run preview`

Preview the production build locally before deployment.

- **Port**: http://localhost:4173 (default)
- **Use case**: Verify production build works correctly
- **Note**: Run `npm run build` first

## Testing Commands

### `npm run test`

Run all Vitest unit tests in watch mode.

- **Framework**: Vitest + React Testing Library
- **Test files**: `src/__tests__/*.test.ts(x)`
- **Watch mode**: Yes (re-runs on file changes)
- **Use case**: Development testing

### `npm run test:ui`

Run tests with visual UI interface.

- **Browser interface**: Yes
- **Coverage visualization**: Yes
- **Use case**: Debugging tests visually
- **Port**: http://localhost:51204 (default)

### `npm run test:cov`

Run tests and generate coverage report.

- **Coverage metrics**: Line, branch, function, statement
- **Report format**: HTML (viewable in browser)
- **Output directory**: `coverage/`
- **Use case**: Assess test coverage quality

### `npm run cypress:open`

Open Cypress Test Runner in interactive mode.

- **Browser interface**: Yes
- **Test type**: E2E (End-to-End)
- **Test files**: `cypress/e2e/*.cy.ts`
- **Use case**: Writing and debugging E2E tests
- **Note**: Requires backend running on http://localhost:8080

### `npm run cypress:run`

Run all Cypress tests headlessly.

- **Output**: Console + video recordings
- **Browsers**: Chrome by default
- **Use case**: CI/CD pipeline integration
- **Note**: Requires backend running on http://localhost:8080

## Code Quality Commands

### `npm run lint`

Run ESLint to check code style and potential errors.

- **Config**: `eslint.config.js`
- **Plugins**: React, TypeScript, React Hooks
- **Fix mode**: Add `--fix` flag to auto-fix issues
- **Use case**: Enforce code standards

### `npm run lint --fix`

Auto-fix ESLint violations where possible.

- **Use case**: Quick formatting before commits
- **Note**: Some issues still require manual fixes

## Common Workflows

### Local Development Setup

```bash
npm install                    # Install dependencies
npm run dev                    # Start dev server
# In another terminal:
npm run test:watch           # Run tests in watch mode
```

### Before Committing

```bash
npm run lint --fix           # Fix formatting
npm run test                 # Run all tests
npm run build                # Verify build succeeds
```

### Debugging a Specific Test

```bash
npm run test -- --reporter=verbose  # Verbose output
npm run test:ui                     # Visual debugging
```

### Running E2E Tests Locally

```bash
# In one terminal:
cd eatwise-app/apps/api && go run main.go
cd eatwise-app/apps/web && npm run dev

# In another terminal:
cd eatwise-app/apps/web
npm run cypress:open        # Interactive mode
# Or:
npm run cypress:run         # Headless mode
```

## Environment Variables

Create `.env.local` in the web directory:

```
VITE_API_BASE_URL=http://localhost:8080
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

## Scripts Summary Table

| Command                | Purpose              | Watch Mode | Port  |
| ---------------------- | -------------------- | ---------- | ----- |
| `npm run dev`          | Start dev server     | ✓          | 5173  |
| `npm run build`        | Build for production | ✗          | -     |
| `npm run preview`      | Preview prod build   | ✗          | 4173  |
| `npm run test`         | Run unit tests       | ✓          | -     |
| `npm run test:ui`      | Test UI dashboard    | ✓          | 51204 |
| `npm run test:cov`     | Generate coverage    | ✗          | -     |
| `npm run lint`         | Check code style     | ✗          | -     |
| `npm run cypress:open` | E2E test runner      | ✓          | -     |
| `npm run cypress:run`  | Run E2E headless     | ✗          | -     |

## Troubleshooting

### Tests failing with "Cannot find module"

```bash
rm -rf node_modules .turbo && npm install
```

### Dev server not starting

- Ensure port 5173 is available
- Check that Node.js version ≥ 18.x
- Verify `.env.local` exists and is correct

### Cypress tests failing

- Ensure backend API is running on `http://localhost:8080`
- Clear browser cache: `npx cypress cache clear`
- Run in headless mode for more detailed errors: `npm run cypress:run`

### Build failing

```bash
npm run lint --fix           # Fix code issues
npm run test                 # Ensure tests pass
npm run build                # Try building again
```
