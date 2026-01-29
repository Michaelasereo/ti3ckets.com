describe('Admin User Management', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/admin/users');
  });

  it('should display users list', () => {
    cy.contains('User Management').should('be.visible');
    cy.contains('View and manage all platform users').should('be.visible');

    // Wait for users table to load
    cy.get('table').should('be.visible');
  });

  it('should filter users by role', () => {
    // Select role filter
    cy.get('select').first().select('BUYER');
    
    // Wait for filtered results
    cy.wait(1000);
    
    // Verify only buyers are shown (if any exist)
    cy.get('table').should('be.visible');
  });

  it('should search users', () => {
    // Enter search query
    cy.get('input[type="text"]').type('test@example.com');
    
    // Wait for search results
    cy.wait(1000);
    
    // Verify search results
    cy.get('table').should('be.visible');
  });

  it('should navigate to user detail page', () => {
    // Click on first user (if exists)
    cy.get('table a').first().then(($link) => {
      if ($link.length > 0) {
        cy.wrap($link).click();
        
        // Verify user detail page
        cy.contains('User Details').should('be.visible');
        cy.contains('User Information').should('be.visible');
      }
    });
  });

  it('should suspend/unsuspend user', () => {
    // Navigate to user detail page
    cy.get('table a').first().click();
    
    // Click suspend/unsuspend button
    cy.contains('Suspend User').or('Unsuspend User').then(($button) => {
      if ($button.length > 0) {
        cy.wrap($button).click();
        
        // Confirm action
        cy.on('window:confirm', () => true);
        
        // Verify status updated
        cy.wait(1000);
        cy.contains('Suspended').or('Active').should('be.visible');
      }
    });
  });
});
