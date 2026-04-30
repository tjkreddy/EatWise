# EatWise

EatWise is a smart kitchen management application designed to reduce food waste and simplify meal planning. It helps users track pantry inventory, monitor expiration dates, and manage household supplies in a shared environment.

---

##  Team Members
- **Jugal Kishore Reddy Thangella** – Backend Developer
- **Sadhvini Boyanapally** – Frontend Developer
- **Hasini Jevaji** – Frontend Developer
- **Krishna Chaitanya Padigela** – Backend Developer

---

##  Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Go (Golang), PostgreSQL
- **Authentication:** Supabase Auth
- **Infrastructure:** Supabase (Database & Storage)

---

##  Prerequisites
Before running the application, ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **Go** (v1.21 or higher)
- **Git**

---

##  Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/PantryPal.git
cd PantryPal
```

### 2. Install Dependencies
Install dependencies for both the monorepo root and the frontend application:
```bash
# In the root directory
npm install

# In the frontend directory
cd eatwise-app/apps/web
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in `eatwise-app/apps/web`:
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

### 4. Running the Application
You can run the full stack concurrently from the root directory:
```bash
# In the root directory (using concurrently)
npm run dev
```

Alternatively, run them separately:
- **Frontend:** `cd eatwise-app/apps/web && npm run dev` (Starts on `http://localhost:5173`)
- **Backend:** `cd eatwise-app/apps/api && go run main.go` (Starts on `http://localhost:8080`)

---

##  Testing & Quality
### Frontend (React)
```bash
cd eatwise-app/apps/web
npm run test           # Run unit tests (Vitest)
npm run cypress:run    # Run E2E tests (Cypress)
npm run lint           # Run linter
```

### Backend (Go)
```bash
cd eatwise-app/apps/api
go test ./...          # Run all backend tests
```

---

##  Project Structure
```
PantryPal/
├── docs/             # Project documentation (Sprints, API, Web)
├── eatwise-app/      # Main application source
│   ├── apps/
│   │   ├── api/      # Go Backend API
│   │   └── web/      # React Frontend
│   └── packages/     # Shared internal packages
└── README.md         # This file
```

For detailed guides, please refer to the [docs/](./docs) directory.
