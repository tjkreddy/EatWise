# User Stories – Sprint 1

**User Story 1: Create Item**  
As a user, I want to add food items with names and quantities so I can track my stock.

**User Story 2: Delete Item**  
As a user, I want to remove items I no longer have so my list stays accurate.

**User Story 3: Edit Item**  
As a user, I want to update the quantity of an item so I don't have to delete and re-add it.

**User Story 4: Expiration Dates**  
As a user, I want to add an expiration date to items to help prevent food waste.

**User Story 5: Categorization**  
As a user, I want to tag items (e.g., "Dairy", "Grains") to keep my pantry organized.

**User Story 6: Low Stock Alerts**  
As a user, I want to see a warning when an item's quantity is low so I know when to restock.

**User Story 7: Basic Shopping List**  
As a user, I want items with zero quantity to move automatically to a shopping list.

**User Story 8: Manual Shopping Add**  
As a user, I want to manually add “to-buy” items to a shopping list.

**User Story 9: Create Household**  
As a user, I want to create a Household group so I can share my pantry with others.

**User Story 10: Join Household**  
As a roommate, I want to join an existing household using a code so we can manage a shared pantry.


**ISSUES**
**Backend (Go & Supabase)**
[Issue #1] Go Project Initialization: Initialize the Go module (go mod init) and set up the project structure for the backend API.

[Issue #2] Supabase Setup & Schema: Create the Supabase project and define the SQL schema for the pantry_items table (Columns: id, name, quantity, expiration_date).

[Issue #3] Go Database Connection: Configure the Go backend to connect to the Supabase PostgreSQL instance using the database driver.

[Issue #4] API - Get Inventory: Implement the GET /api/pantry endpoint in Go to query Supabase and return a list of items.

[Issue #5] API - Add Item: Implement the POST /api/pantry endpoint to parse JSON input and insert a new row into the Supabase table.

[Issue #6] API - Delete Item: Implement the DELETE /api/pantry/:id endpoint to remove a record from Supabase by ID.

**Frontend (React + TypeScript)**
[Issue #7] Frontend Setup: Initialize the React project with TypeScript (create-react-app or Vite template) and install dependencies (e.g., Axios).

[Issue #8] TypeScript Interfaces: Define shared TypeScript interfaces (e.g., interface PantryItem) to ensure type safety between the API response and UI components.

[Issue #9] Dashboard Component: Build the main Dashboard UI to fetch data from the Go backend and display the pantry list.

[Issue #10] Add Item Form: Develop a typed React form component to capture user input and send a POST request to the Go API.

[Issue #11] Delete Integration: specific Add a delete button to the item list and integrate it with the Go backend's DELETE endpoint.

**Documentation & Testing**
[Issue #12] API Verification: Verify all Go API endpoints using Postman or curl to ensure correct JSON handling.
