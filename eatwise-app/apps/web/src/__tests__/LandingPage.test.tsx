import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import LandingPage from "../pages/LandingPage";

// Mock useNavigate since we'll be using it
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the main heading", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(
      screen.getByText("EatWise: Smart Kitchen, Zero Waste")
    ).toBeInTheDocument();
  });

  it("should render the tagline", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(
      screen.getByText(
        /Effortless pantry management, expiration tracking, and meal planning/i
      )
    ).toBeInTheDocument();
  });

  it("should have navigation with login and signup buttons", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const loginLinks = screen.getAllByRole("link", { name: /login/i });
    const signupLinks = screen.getAllByRole("link", { name: /sign up/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    expect(signupLinks.length).toBeGreaterThan(0);
  });

  it("should render EatWise logo/branding", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText("EatWise")).toBeInTheDocument();
  });

  it("should have get started button", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("link", { name: /get started now/i })).toBeInTheDocument();
  });

  it("should render FAQ section", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/how do i get started/i)).toBeInTheDocument();
    expect(screen.getByText(/is eatwise really free/i)).toBeInTheDocument();
  });

  it("should render feature description headings", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    // Check for feature headings (they should be present based on the component)
    const headings = screen.getAllByRole("heading");
    expect(headings.length).toBeGreaterThan(0);
  });

  it("should render all navigation links properly", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const loginLinks = screen.getAllByRole("link", { name: /login/i });
    const signupLinks = screen.getAllByRole("link", { name: /sign up/i });

    // Navigation should have login links
    expect(loginLinks.length).toBeGreaterThanOrEqual(2); // At least in nav and hero section
    expect(signupLinks.length).toBeGreaterThanOrEqual(2); // At least in nav and hero section
  });

  it("should have responsive layout classes", () => {
    const { container } = render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const responsiveElements = container.querySelectorAll("[class*='md:']");
    expect(responsiveElements.length).toBeGreaterThan(0);
  });

  it("should render all FAQ items", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/how do i get started with eatwise/i)).toBeInTheDocument();
    expect(
      screen.getByText(/can i share my pantry with family members/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how does eatwise help reduce food waste/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/can i access eatwise on my phone/i)
    ).toBeInTheDocument();
  });

  it("should have styled container with correct classes", () => {
    const { container } = render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const minHeightElements = container.querySelectorAll("[class*='min-h-screen']");
    expect(minHeightElements.length).toBeGreaterThan(0);
  });
});
