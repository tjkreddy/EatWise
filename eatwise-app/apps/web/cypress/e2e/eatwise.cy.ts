describe("EatWise E2E Tests", () => {
  const baseUrl = "http://localhost:5173";
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123";

  beforeEach(() => {
    // Clear localStorage before each test
    cy.window().then((win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
    });
  });

  describe("Authentication Flow", () => {
    it("should sign up a new user", () => {
      cy.visit(`${baseUrl}/signup`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("input[name='fullName']").type("Test User");
      cy.get("button[type='submit']").click();

      // Should redirect to household gate or dashboard
      cy.url().should(
        "match",
        /\/(household-gate|dashboard|household\/create)/
      );
    });

    it("should login with valid credentials", () => {
      // Assuming the user was already created in previous test
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("button[type='submit']").click();

      // Should redirect to household gate or dashboard
      cy.url().should(
        "match",
        /\/(household-gate|dashboard|household\/create)/
      );
      cy.contains("Welcome").should("be.visible");
    });

    it("should not allow login with incorrect password", () => {
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type("WrongPassword");
      cy.get("button[type='submit']").click();

      // Should show error message
      cy.contains(/invalid|error|failed/i).should("be.visible");
    });
  });

  describe("Household Management", () => {
    before(() => {
      // Sign up before household tests
      cy.visit(`${baseUrl}/signup`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("input[name='fullName']").type("Test User");
      cy.get("button[type='submit']").click();
    });

    it("should create a new household", () => {
      cy.url().should("match", /\/(household-gate|household\/create)/);

      // If on household gate, click create
      cy.get("button").contains(/create|new/i).click({ force: true });

      cy.url().should("include", "/household/create");
      cy.get("input[name='name']").type("Test Household");
      cy.get("button[type='submit']").click();

      // Should show invite code or redirect to dashboard
      cy.contains(/invite|code|dashboard/i).should("be.visible");
    });

    it("should display invite code for household", () => {
      cy.contains(/invite.*code|copy.*code/i).should("be.visible");
      cy.get("button").contains(/copy|share/i).should("exist");
    });

    it("should allow owner to transfer ownership and update post-transfer state", () => {
      let transferCompleted = false;

      cy.intercept("GET", "**/api/households/me", (req) => {
        if (!transferCompleted) {
          req.reply({
            statusCode: 200,
            body: {
              household: {
                id: "house-1",
                name: "Test Household",
                invite_code: "ABC123",
              },
              members: [
                {
                  user_id: "owner-1",
                  email: testEmail,
                  role: "owner",
                  full_name: "Test User",
                },
                {
                  user_id: "member-1",
                  email: "member@example.com",
                  role: "member",
                  full_name: "Member One",
                },
              ],
            },
          });
        } else {
          req.reply({
            statusCode: 200,
            body: {
              household: {
                id: "house-1",
                name: "Test Household",
                invite_code: "ABC123",
              },
              members: [
                {
                  user_id: "owner-1",
                  email: testEmail,
                  role: "member",
                  full_name: "Test User",
                },
                {
                  user_id: "member-1",
                  email: "member@example.com",
                  role: "owner",
                  full_name: "Member One",
                },
              ],
            },
          });
        }
      }).as("getHouseholdState");

      cy.intercept("POST", "**/api/households/*/transfer-ownership", (req) => {
        transferCompleted = true;
        req.reply({
          statusCode: 200,
          body: { message: "Ownership transferred successfully" },
        });
      }).as("transferOwnership");

      cy.visit(`${baseUrl}/household/manage`);
      cy.wait("@getHouseholdState");

      cy.contains("Transfer Ownership").should("be.visible").click();
      cy.get("select#newOwner").select("member-1");
      cy.contains("Confirm Transfer").click();
      cy.wait("@transferOwnership");
      cy.wait("@getHouseholdState");

      cy.contains("Transfer Ownership").should("not.exist");
      cy.contains("Leave Household").should("be.visible");
    });
  });

  describe("Shopping List Flow", () => {
    before(() => {
      // Login and navigate to dashboard
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("button[type='submit']").click();
      cy.url().should("include", "/dashboard");
    });

    it("should navigate to shopping list", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.contains("Shopping List").click();
      cy.url().should("include", "/shopping-list");
      cy.contains(/shopping.*list|to buy/i).should("be.visible");
    });

    it("should add item to shopping list", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      // Click add item button
      cy.contains("Add Item").click();

      // Fill form
      cy.get("input[name='name']").type("Milk");
      cy.get("input[name='quantity']").type("1");
      cy.get("select[name='unit']").select("liters");
      cy.get("select[name='category']").select("Dairy");

      // Submit
      cy.get("button").contains("Add Item").click();

      // Should see item in list
      cy.contains("Milk").should("be.visible");
      cy.contains("1 liters").should("be.visible");
    });

    it("should add multiple items to shopping list", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      const items = [
        { name: "Bread", quantity: "1", unit: "pieces", category: "Bakery" },
        { name: "Butter", quantity: "1", unit: "grams", category: "Dairy" },
        { name: "Eggs", quantity: "6", unit: "pieces", category: "Dairy" },
      ];

      items.forEach((item) => {
        cy.contains("Add Item").click();
        cy.get("input[name='name']").type(item.name);
        cy.get("input[name='quantity']").type(item.quantity);
        cy.get("select[name='unit']").select(item.unit);
        cy.get("select[name='category']").select(item.category);
        cy.get("button").contains("Add Item").click();
        cy.contains(item.name).should("be.visible");
      });
    });

    it("should mark item as purchased", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      // Add item
      cy.contains("Add Item").click();
      cy.get("input[name='name']").type("Tomatoes");
      cy.get("input[name='quantity']").type("5");
      cy.get("button").contains("Add Item").click();

      // Mark as purchased using checkbox
      cy.get("input[type='checkbox']").first().check();

      // Should move to completed section
      cy.contains(/already.*bought|purchased/i).should("be.visible");
    });

    it("should delete item from shopping list", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      // Add item
      cy.contains("Add Item").click();
      cy.get("input[name='name']").type("Apples");
      cy.get("input[name='quantity']").type("2");
      cy.get("button").contains("Add Item").click();

      cy.contains("Apples").should("be.visible");

      // Delete item
      cy.get("button").contains("✕").first().click();
      cy.on("window:confirm", () => true);

      // Should be removed
      cy.contains("Apples").should("not.exist");
    });

    it("should validate form fields", () => {
      cy.visit(`${baseUrl}/shopping-list`);
      cy.contains("Add Item").click();

      // Try to submit without name
      cy.get("input[name='quantity']").type("1");
      cy.get("button").contains("Add Item").click();

      // Should show validation error
      cy.contains(/item.*name|required/i).should("be.visible");
    });

    it("should reject zero or negative quantity", () => {
      cy.visit(`${baseUrl}/shopping-list`);
      cy.contains("Add Item").click();

      cy.get("input[name='name']").type("Test Item");
      cy.get("input[name='quantity']").type("-5");

      // The input should have min="1" attribute
      cy.get("input[name='quantity']").should("have.attr", "min", "1");
    });

    it("should show empty state when no items", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      // Initially should show "No items to buy" or similar
      cy.contains(/no items|empty/i).should("be.visible");
    });
  });

  describe("Pantry List Flow", () => {
    before(() => {
      // Login and navigate to dashboard
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("button[type='submit']").click();
      cy.url().should("include", "/dashboard");
    });

    it("should navigate to pantry list from dashboard", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.contains("Pantry List").click();
      cy.url().should("include", "/pantry-list");
      cy.contains("Pantry List").should("be.visible");
    });

    it("should add item to pantry", () => {
      cy.visit(`${baseUrl}/pantry-list`);

      // Click add item button
      cy.contains("+ Add Item").click();

      // Fill form
      cy.get("input[name='name']").type("Bananas");
      cy.get("input[name='quantity']").type("6");
      cy.get("select[name='unit']").select("pieces");
      cy.get("select[name='category']").select("Fruits");
      cy.get("input[name='expirationDate']").type("2026-04-01");

      // Submit
      cy.get("button").contains("Save Item").click();

      // Should see item in list
      cy.contains("Bananas").should("be.visible");
      cy.contains("Quantity: 6 pieces").should("be.visible");
    });

    it("should edit pantry item", () => {
      cy.visit(`${baseUrl}/pantry-list`);

      // Click edit on the first item
      cy.get("button").contains("Edit").first().click();

      // Update quantity
      cy.get("input[name='quantity']").clear().type("8");

      // Submit
      cy.get("button").contains("Update Item").click();

      // Should see updated quantity
      cy.contains("Quantity: 8 pieces").should("be.visible");
    });

    it("should show expiration status", () => {
      cy.visit(`${baseUrl}/pantry-list`);

      // Add item with near expiration
      cy.contains("+ Add Item").click();
      cy.get("input[name='name']").type("Milk");
      cy.get("input[name='quantity']").type("1");
      cy.get("select[name='unit']").select("liters");
      cy.get("select[name='category']").select("Dairy");
      cy.get("input[name='expirationDate']").type("2026-03-30"); // Tomorrow
      cy.get("button").contains("Save Item").click();

      // Should show expiring soon indicator
      cy.contains("EXPIRING SOON").should("be.visible");
    });

    it("should delete pantry item", () => {
      cy.visit(`${baseUrl}/pantry-list`);

      // Delete first item
      cy.get("button").contains("Delete").first().click();
      cy.on("window:confirm", () => true);

      // Item should be removed
      cy.get("button").contains("Delete").should("have.length.lessThan", 1);
    });
  });

  describe("Dashboard Quick Actions", () => {
    before(() => {
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("button[type='submit']").click();
    });

    it("should display quick action buttons", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.contains("Quick Actions").should("be.visible");
      cy.contains("Pantry List").should("be.visible");
      cy.contains("Shopping List").should("be.visible");
      cy.contains("Manage Household").should("be.visible");
    });

    it("should navigate to pantry list via quick action", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.get("button").contains("Pantry List").click();
      cy.url().should("include", "/pantry-list");
    });

    it("should navigate to shopping list via quick action", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.get("button").contains("Shopping List").click();
      cy.url().should("include", "/shopping-list");
    });

    it("should navigate to household manage via quick action", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.get("button").contains("Manage Household").click();
      cy.url().should("include", "/household/manage");
    });
  });

  describe("Shopping List Enhancements", () => {
    before(() => {
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("button[type='submit']").click();
    });

    it("should show success message when adding item", () => {
      cy.visit(`${baseUrl}/shopping-list`);
      cy.contains("Add Item").click();

      cy.get("input[name='name']").type("Oranges");
      cy.get("input[name='quantity']").type("3");
      cy.get("button").contains("Add Item").click();

      cy.contains('Added "Oranges" to shopping list').should("be.visible");
    });

    it("should show success message when marking purchased", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      // Add item first
      cy.contains("Add Item").click();
      cy.get("input[name='name']").type("Apples");
      cy.get("input[name='quantity']").type("5");
      cy.get("button").contains("Add Item").click();

      // Mark as purchased
      cy.get("input[type='checkbox']").first().check();
      cy.contains('Marked "Apples" as purchased').should("be.visible");
    });

    it("should show distinct styling for completed items", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      // Add and complete an item
      cy.contains("Add Item").click();
      cy.get("input[name='name']").type("Grapes");
      cy.get("input[name='quantity']").type("1");
      cy.get("button").contains("Add Item").click();
      cy.get("input[type='checkbox']").first().check();

      // Check for green styling
      cy.contains("Already Bought").should("be.visible");
      cy.get(".border-green-200").should("exist");
    });

    it("should clear purchased items with success message", () => {
      cy.visit(`${baseUrl}/shopping-list`);

      // Ensure we have completed items
      cy.contains("Add Item").click();
      cy.get("input[name='name']").type("Bread");
      cy.get("input[name='quantity']").type("2");
      cy.get("button").contains("Add Item").click();
      cy.get("input[type='checkbox']").first().check();

      // Clear purchased
      cy.contains("Clear All").click();
      cy.contains("Cleared 1 purchased item").should("be.visible");
    });
  });

  describe("Navigation", () => {
    it("should navigate between pages", () => {
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("button[type='submit']").click();

      // From dashboard to shopping list
      cy.url().should("include", "/dashboard");
      cy.contains("Shopping List").click();
      cy.url().should("include", "/shopping-list");

      // Back to dashboard
      cy.visit(`${baseUrl}/dashboard`);
      cy.url().should("include", "/dashboard");
    });

    it("should logout and redirect to login", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.contains("Logout").click();
      cy.url().should("include", "/login");
    });
  });
});
