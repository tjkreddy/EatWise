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

  describe("Dashboard Updates", () => {
    before(() => {
      cy.visit(`${baseUrl}/login`);
      cy.get("input[name='email']").type(testEmail);
      cy.get("input[name='password']").type(testPassword);
      cy.get("button[type='submit']").click();
    });

    it("should display household name in header", () => {
      cy.visit(`${baseUrl}/dashboard`);
      // Household name should appear after household is loaded
      cy.get("nav").contains(/test.*household|household/i).should("be.visible");
    });

    it("should show household members panel", () => {
      cy.visit(`${baseUrl}/dashboard`);
      cy.contains("Household Members").should("be.visible");
    });

    it("should display member information", () => {
      cy.visit(`${baseUrl}/dashboard`);
      
      // Should show member avatars and names
      cy.get("div[style*='background']").should("exist");
    });

    it("should handle loading state for members", () => {
      cy.visit(`${baseUrl}/dashboard`);
      // Should eventually load and not stay in loading state
      cy.contains("Loading members").should("not.exist");
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
