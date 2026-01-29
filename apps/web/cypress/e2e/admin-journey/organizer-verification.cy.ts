describe('Admin Organizer Verification', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/admin/organizers');
  });

  it('should display organizers list', () => {
    cy.contains('Organizer Verification').should('be.visible');
    cy.contains('Review and verify organizer accounts').should('be.visible');

    // Wait for organizers table to load
    cy.get('table').should('be.visible');
  });

  it('should filter organizers by verification status', () => {
    // Select status filter
    cy.get('select').select('PENDING');
    
    // Wait for filtered results
    cy.wait(1000);
    
    // Verify filtered results
    cy.get('table').should('be.visible');
  });

  it('should navigate to organizer detail page', () => {
    // Click on first organizer (if exists)
    cy.get('table a').first().then(($link) => {
      if ($link.length > 0) {
        cy.wrap($link).click();
        
        // Verify organizer detail page
        cy.contains('Organizer Details').should('be.visible');
        cy.contains('Organizer Information').should('be.visible');
      }
    });
  });

  it('should verify organizer', () => {
    // Navigate to organizer detail page
    cy.get('table a').first().click();
    
    // Click verify button (if status is PENDING)
    cy.contains('Verify').then(($button) => {
      if ($button.length > 0) {
        cy.wrap($button).click();
        
        // Confirm action
        cy.on('window:confirm', () => true);
        
        // Verify status updated
        cy.wait(1000);
        cy.contains('VERIFIED').should('be.visible');
      }
    });
  });

  it('should reject organizer', () => {
    // Navigate to organizer detail page
    cy.get('table a').first().click();
    
    // Click reject button (if status is PENDING)
    cy.contains('Reject').then(($button) => {
      if ($button.length > 0) {
        cy.wrap($button).click();
        
        // Confirm action
        cy.on('window:confirm', () => true);
        
        // Verify status updated
        cy.wait(1000);
        cy.contains('REJECTED').should('be.visible');
      }
    });
  });
});
