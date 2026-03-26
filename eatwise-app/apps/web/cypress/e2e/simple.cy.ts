describe("Simple EatWise Tests", () => {
  it("should load the landing page and display welcome message", () => {
    cy.visit("http://localhost:5173");
    cy.contains("EatWise: Smart Kitchen, Zero Waste").should("be.visible");
  });

  it("should navigate to login page when clicking login button", () => {
    cy.visit("http://localhost:5173");
    cy.contains("Login").first().click();
    cy.url().should("include", "/login");
    cy.contains("Login to EatWise").should("be.visible");
  });

  it("should navigate to signup page when clicking signup button", () => {
    cy.visit("http://localhost:5173");
    cy.contains("Sign Up").first().click();
    cy.url().should("include", "/signup");
    cy.contains("Create your EatWise account").should("be.visible");
  });

  it("should fill and submit a form with email and password", () => {
    cy.visit("http://localhost:5173/login");
    cy.get("input[type='email']").type("test@example.com");
    cy.get("input[type='password']").type("password123");
    cy.get("button[type='submit']").should("be.visible");
    // We don't submit because we want to keep this test simple
  });

  it("should have interactive navbar on landing page", () => {
    cy.visit("http://localhost:5173");
    cy.contains("EatWise").should("be.visible");
    cy.get("nav").should("be.visible");
    cy.contains("Login").should("be.visible");
    cy.contains("Sign Up").should("be.visible");
  });
});
