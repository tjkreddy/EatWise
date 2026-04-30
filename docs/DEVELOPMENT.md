# EatWise Development Guide

This guide covers all development workflows for the EatWise monorepo (backend API + frontend web app).

## Project Structure

```
eatwise-app/
├── apps/
│   ├── api/          # Go backend API
│   └── web/          # React frontend
└── packages/
    └── shared/       # Shared utilities (if any)
```

## Monorepo Scripts

Run these from the `eatwise-app/` directory:

### `npm run dev`

Start both frontend and backend development servers concurrently.

- **Frontend**: Starts on http://localhost:5173 (Vite dev server)
- **Backend**: Starts on http://localhost:8080 (Go server)
- **Use case**: Full-stack development
- **Requirements**: Requires `concurrently` package installed

### `npm run dev:web`

Start only the frontend development server.

- **Port**: http://localhost:5173
- **Use case**: Frontend-only development
- **Alternative**: `cd apps/web && npm run dev`

### `npm run build:web`

Build the frontend for production.

- **Output**: `apps/web/dist/`
- **Use case**: Production deployment preparation

### `npm run dev:api`

Start only the backend Go server.

- **Port**: http://localhost:8080
- **Use case**: Backend-only development
- **Alternative**: `cd apps/api && go run main.go`

## Frontend Scripts (apps/web)

Full documentation available in [apps/web/SCRIPTS.md](./apps/web/SCRIPTS.md)

### Development

```bash
cd apps/web
npm run dev              # Start dev server with HMR
npm run build            # Build for production
npm run preview          # Preview production build
```

### Testing

```bash
cd apps/web
npm run test             # Run unit tests (watch mode)
npm run test:ui          # Visual test dashboard
npm run test:cov         # Generate coverage report
npm run cypress:open     # Interactive E2E testing
npm run cypress:run      # Headless E2E testing
```

### Code Quality

```bash
cd apps/web
npm run lint             # Check code style
npm run lint --fix       # Auto-fix code style issues
```

## Backend Scripts (apps/api)

### Development

```bash
cd apps/api
go run main.go          # Start development server
go run main.go          # Hot reload not available (restart after code changes)
```

### Testing

```bash
cd apps/api
go test ./...           # Run all backend tests
go test ./... -v        # Verbose test output
go test ./... -cover    # Include coverage
```

### Building

```bash
cd apps/api
go build -o eatwise-server main.go  # Build binary
```

## Common Workflows

### 1. First-Time Setup

```bash
cd eatwise-app
npm install                      # Install monorepo dependencies
cd apps/web && npm install       # Install frontend dependencies
# Backend (Go) has no dependencies in this example
```

### 2. Full-Stack Development

```bash
cd eatwise-app
npm run dev    # Starts both web and API
```

Then in another terminal, run tests:

```bash
cd eatwise-app/apps/web
npm run test   # Frontend tests
```

### 3. Frontend Development Only

```bash
cd eatwise-app/apps/web
npm run dev    # Start dev server on localhost:5173
npm run test   # Run tests in watch mode (in another terminal)
```

### 4. Backend Development Only

```bash
cd eatwise-app/apps/api
go run main.go         # Start API on localhost:8080
```

### 5. Testing Before Commit

```bash
cd eatwise-app/apps/web

# Run all checks
npm run lint --fix     # Fix code style
npm run test           # Run unit tests
npm run build          # Verify production build
# Optionally run E2E tests:
npm run cypress:run
```

### 6. Running E2E Tests

```bash
# Terminal 1: Start the full stack
cd eatwise-app
npm run dev

# Terminal 2: Run E2E tests
cd eatwise-app/apps/web
npm run cypress:open      # Interactive mode
# Or:
npm run cypress:run       # Headless mode
```

## Environment Configuration

### Frontend (.env.local)

```bash
cd eatwise-app/apps/web
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8080
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
EOF
```

### Backend (.env or environment variables)

Typically configured via Go environment or .env file in `apps/api/`:

```bash
export DATABASE_URL=your_database_url
export PORT=8080
```

## Debugging

### Frontend Debugging

```bash
# Visual debugging in browser
npm run dev
# Open browser DevTools (F12)
# VS Code Debugging:
# 1. Install "Debugger for Chrome" extension
# 2. Set breakpoints in VS Code
# 3. Run: npm run dev
# 4. In VS Code, click "Run and Debug" → "Chrome"
```

### Backend Debugging

```bash
# Using Go debugger (dlv)
cd apps/api
dlv debug main.go
```

### Test Debugging

```bash
cd apps/web

# Debug unit tests
npm run test:ui        # Visual test UI with debugging

# Debug E2E tests
npm run cypress:open   # Interactive Cypress runner
```

## Performance Tips

1. **Frontend dev server**: Use `npm run dev` for fast HMR
2. **Build optimization**: Run `npm run build` and test locally with `npm run preview`
3. **Test efficiency**: Run only affected tests during development
4. **Backend development**: Keep backend running in separate terminal, no hot-reload

## Troubleshooting

### "Port 5173 already in use"

```bash
# Find and kill the process
lsof -i :5173
kill -9 <PID>
# Or use different port:
PORT=5174 npm run dev
```

### "Cannot connect to API"

- Ensure backend is running: `npm run dev:api`
- Check API URL in `.env.local`: `VITE_API_BASE_URL=http://localhost:8080`
- Verify backend is on port 8080: Check `apps/api/main.go`

### "Module not found errors"

```bash
cd eatwise-app
rm -rf node_modules apps/web/node_modules
npm install
cd apps/web && npm install
```

### "Tests failing"

```bash
cd apps/web
npm run test -- --reporter=verbose    # More details
npm run test:ui                        # Visual debugging
```

### "Build failing"

```bash
cd apps/web
npm run lint --fix   # Fix linting errors
npm run test         # Ensure tests pass
npm run build        # Try again
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: add my feature"

# Before pushing, verify everything works:
cd eatwise-app/apps/web
npm run lint --fix
npm run test
npm run build

# Push
git push origin feature/my-feature

# Create PR
```

## CI/CD Commands

These would be run in GitHub Actions or similar CI:

```bash
# Frontend
cd eatwise-app/apps/web
npm install
npm run lint
npm run test
npm run build

# E2E Tests (if needed)
npm run cypress:run

# Backend
cd eatwise-app/apps/api
go test ./...
go build -o eatwise-server
```

## Documentation References

- **Frontend Scripts**: See [apps/web/SCRIPTS.md](./apps/web/SCRIPTS.md)
- **Frontend Setup**: See [apps/web/README-EATWISE.md](./apps/web/README-EATWISE.md)
- **Backend API**: See [apps/api/README.md](./apps/api/README.md) (if exists)
