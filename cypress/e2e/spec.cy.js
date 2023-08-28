
describe('Login Form Tests', () => {

  beforeEach(() => {
    // Assuming your app is served at localhost:3000, adjust if different
    cy.visit('http://localhost:3000');
    cy.wait(500);  // Waits for 500ms
  });

  it('should toggle between Sign Up and Sign In', () => {
    // Check initial state (assuming Sign Up is the default state)
    cy.get('[data-test-id="signup-form"]').should('be.visible');


    // Click the toggle button
    cy.get('[data-test-id="toggle-button"]').click();

    // Now Sign In form should be visible
    cy.get('[data-test-id="signin-form"]').should('be.visible');
    
  });

  it('should allow user to enter details in Sign Up form', () => {
    // Assuming you're on the Sign Up form
    cy.get('[data-test-id="signup-email"]').type('testuser@example.com');
    cy.get('[data-test-id="signup-password"]').type('testpassword123');

    // Here you can further test the submission by clicking the sign-up button
    cy.get('[data-test-id="signup-button"]').click();
    // And then assert whatever behavior you expect upon signup
    cy.url().should('eq', 'http://localhost:3000/');
  });

  it('should allow user to enter details in Sign In form', () => {
    // Switch to Sign In form
    cy.get('[data-test-id="toggle-button"]').click();

    // Type into the Sign In form fields
    cy.get('[data-test-id="signin-email"]').type('testuser@example.com');
    cy.get('[data-test-id="signin-password"]').type('testpassword123');

    // Here you can further test the submission by clicking the sign-in button
    cy.get('[data-test-id="signin-button"]').click();
    // And then assert whatever behavior you expect upon signin
    cy.url().should('eq', 'http://localhost:3000/');

  });

  it('should login the user successfully and set authentication cookie', () => {
    // Switch to Sign In form
    cy.get('[data-test-id="toggle-button"]').click();

    // Type credentials and login
    cy.get('[data-test-id="signin-email"]').type('testuser@example.com');
    cy.get('[data-test-id="signin-password"]').type('testpassword123');
    cy.get('[data-test-id="signin-button"]').click();

    // Optional: Assertions to check for successful login, e.g.,
    cy.url().should('eq', 'http://localhost:3000/dashboard');

  });

});