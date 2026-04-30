# EatWise Frontend

The EatWise frontend is a React + TypeScript + Vite web application for managing household pantry inventory and shopping lists.

## Prerequisites

- **Node.js** ≥ 18.x (LTS recommended)
- **npm** ≥ 9.x
- **Backend API** running on `http://localhost:8080`
- **Supabase account** (for authentication)

## Quick Start

### 1. Install Dependencies

```bash
cd eatwise-app/apps/web
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the web directory:

```
VITE_API_BASE_URL=http://localhost:8080
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

Get your Supabase credentials from [supabase.com](https://supabase.com).

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Key Features

- **Pantry Management**: Track items with categories, quantities, and expiration dates
- **Shopping Lists**: Create and manage shopping lists with purchase tracking
- **Household Sharing**: Add household members and share inventory
- **Real-time Alerts**: Get notified of expiring items
- **Responsive Design**: Works on desktop, tablet, and mobile

## User Workflows

### Signup & Authentication

1. Navigate to `/signup` and create a new account
2. Enter email, password, and full name
3. You'll be redirected to create or join a household

### Create a Household

1. From the household gate, click "Create New Household"
2. Enter household name and confirm
3. You're now the household owner

### Manage Pantry

1. Go to **Pantry List** from the sidebar
2. Click **+ Add Item** to add a new pantry item
3. Fill in name, quantity, unit, category, and optional expiration date
4. Items appear in the grid with expiry alerts for soon-to-expire items

### Shopping List

1. Navigate to **Shopping List** from the sidebar
2. Click **+ Add Item** to add items to buy
3. Mark items as purchased when you buy them
4. Clear purchased items in bulk

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Test files are in `src/__tests__/` and follow the `*.test.ts(x)` naming convention.

### E2E Tests (Cypress)

```bash
# Run Cypress in interactive mode
npm run cypress:open

# Run all Cypress tests headlessly
npm run cypress:run
```

Cypress tests are in `cypress/e2e/` and test key user flows.

## Development Commands

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start dev server on port 5173    |
| `npm run build`        | Build for production             |
| `npm run preview`      | Preview production build locally |
| `npm run lint`         | Run ESLint                       |
| `npm run test`         | Run Vitest unit tests            |
| `npm run test:watch`   | Run tests in watch mode          |
| `npm run cypress:open` | Open Cypress test runner         |
| `npm run cypress:run`  | Run Cypress tests headlessly     |

## Project Structure

```
eatwise-app/apps/web/
├── src/
│   ├── pages/              # Page components
│   ├── components/         # Reusable components
│   ├── lib/                # API clients & utilities
│   ├── types/              # TypeScript type definitions
│   ├── __tests__/          # Unit tests
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── cypress/                # E2E tests
├── public/                 # Static assets
├── vite.config.ts          # Vite configuration
├── vitest.config.ts        # Vitest configuration
├── tailwind.config.js      # Tailwind CSS config
└── package.json            # Dependencies & scripts
```

## API Endpoints

The frontend communicates with the Go backend at `http://localhost:8080`. Key endpoints:

- `POST /api/auth/signup` – Register new user
- `POST /api/auth/login` – User login
- `GET /api/pantry/items` – Fetch pantry items
- `POST /api/pantry/items` – Add pantry item
- `PUT /api/pantry/items/:id` – Update pantry item
- `DELETE /api/pantry/items/:id` – Delete pantry item
- `GET /api/shopping-list/items` – Fetch shopping list
- `POST /api/shopping-list/items` – Add shopping item

See the backend README for full API documentation.

## Styling

EatWise uses **Tailwind CSS** for styling with custom animations in `src/App.css`. Color scheme:

- **Primary**: Amber (`amber-600`)
- **Success**: Green (`green-600`)
- **Error**: Red (`red-600`)
- **Neutral**: Gray shades

## Troubleshooting

### "Failed to fetch" or CORS errors

- Ensure the backend API is running on `http://localhost:8080`
- Check that `VITE_API_BASE_URL` is set correctly in `.env.local`

### "User not found" or auth issues

- Clear browser cookies/local storage: `localStorage.clear()`
- Verify Supabase credentials in `.env.local`
- Check that you've created a household after signup

### Tests failing

- Run `npm install` to ensure all dependencies are installed
- Clear `.turbo` and `node_modules` if persisting issues: `rm -rf node_modules .turbo && npm install`

## Contributing

- Follow the existing component structure and naming conventions
- Write unit tests for new features in `src/__tests__/`
- Use semantic commit messages (feat:, fix:, test:, style:, docs:, etc.)
- Test locally before pushing: `npm run test && npm run build`
