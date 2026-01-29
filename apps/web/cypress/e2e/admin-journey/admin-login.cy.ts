describe('Admin Login and Dashboard Access', () => {
  beforeEach(() => {
    // Note: Admin user must be created manually or via seed script
    // This test assumes an admin user exists with email 'admin@example.com'
    cy.visit('/auth/login');
  });

  it('should login as admin and access dashboard', () => {
    // Login as admin (assuming admin credentials exist)
    cy.get('input[type="email"]').type('admin@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Wait for redirect
    cy.url().should('include', '/dashboard');

    // Navigate to admin dashboard
    cy.visit('/admin/dashboard');

    // Verify admin dashboard loads
    cy.contains('Admin Dashboard').should('be.visible');
    cy.contains('Platform overview').should('be.visible');

    // Verify stats cards are displayed
    cy.contains('Total Revenue').should('be.visible');
    cy.contains('Total Users').should('be.visible');
    cy.contains('Total Events').should('be.visible');
    cy.contains('Total Orders').should('be.visible');
  });

  it('should show quick action links', () => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/admin/dashboard');

    // Verify quick action links exist
    cy.contains('Manage Users').should('be.visible');
    cy.contains('Verify Organizers').should('be.visible');
    cy.contains('Moderate Events').should('be.visible');
    cy.contains('View Orders').should('be.visible');
    cy.contains('Platform Analytics').should('be.visible');
    cy.contains('System Settings').should('be.visible');
  });

  it('should redirect non-admin users', () => {
    // Login as regular user
    cy.login('buyer@example.com', 'password123');
    
    // Try to access admin dashboard
    cy.visit('/admin/dashboard', { failOnStatusCode: false });

    // Should be redirected or see error
    cy.url().should('not.include', '/admin/dashboard');
  });
});
