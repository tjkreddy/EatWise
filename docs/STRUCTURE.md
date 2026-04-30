# EatWise App

A full-stack monorepo for the EatWise application.

## Project Structure

```
eatwise-app/
├── apps/
│   ├── web/          # React TypeScript frontend (Vite)
│   └── api/          # Go backend
├── packages/
│   └── shared/       # Shared types and utilities
└── package.json      # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- Go (v1.21+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Install root dev dependencies
npm install concurrently --save-dev
```

### Development

```bash
# Run frontend only
npm run dev:web

# Run backend only (requires Go installed)
npm run dev:api

# Run both frontend and backend
npm run dev
```

### Frontend (apps/web)

- Built with React + TypeScript + Vite
- Runs on http://localhost:5173

### Backend (apps/api)

- Built with Go
- Runs on http://localhost:8080

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Axios
- **Backend:** Go
- **Database:** Supabase (to be configured)
