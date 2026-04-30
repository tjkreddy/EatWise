describe("Signup → Create/Join Household → Add Pantry Item E2E Flow", () => {
  const baseUrl = "http://localhost:5173";
  const testEmail = `hasini-${Date.now()}@test.com`;
  const testPassword = "TestPassword123!";
  const testFullName = "Hasini Test";

  it("should complete full signup, household, and pantry flow", () => {
    // Step 1: Sign up
    cy.visit(`${baseUrl}/signup`);
    cy.get("input[name='email']").type(testEmail);
    cy.get("input[name='password']").type(testPassword);
    cy.get("input[name='fullName']").type(testFullName);
    cy.get("button[type='submit']").click();

    // Should redirect to household gate or create page
    cy.url().should("match", /\/(household-gate|household\/create)/);

    // Step 2: Create household
    cy.contains(/create|new/i).click({ force: true });
    cy.url().should("include", "/household/create");

    cy.get("input[name='name']").type("Test Household");
    cy.get("button[type='submit']").click();

    // Should show household or redirect to dashboard
    cy.url().should("match", /\/(dashboard|household)/);

    // Step 3: Add pantry item from dashboard/pantry list
    cy.contains("Pantry").click({ force: true });
    cy.url().should("include", "/pantry");

    cy.contains(/add.*item|add pantry/i).click();

    cy.get("input[name='name']").type("Milk");
    cy.get("input[name='quantity']").type("2");
    cy.get("select[name='unit']").select("liters");
    cy.get("select[name='category']").select("Dairy");

    cy.contains("Save|Add|Submit", { matchCase: false }).click();

    // Item should appear in pantry list
    cy.contains("Milk").should("be.visible");
    cy.contains("2 liters").should("be.visible");
  });
});
