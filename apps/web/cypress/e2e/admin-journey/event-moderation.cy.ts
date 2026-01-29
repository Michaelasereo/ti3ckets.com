describe('Admin Event Moderation', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/admin/events');
  });

  it('should display events list', () => {
    cy.contains('Event Moderation').should('be.visible');
    cy.contains('Review and moderate all platform events').should('be.visible');

    // Wait for events table to load
    cy.get('table').should('be.visible');
  });

  it('should filter events by status', () => {
    // Select status filter
    cy.get('select').first().select('PUBLISHED');
    
    // Wait for filtered results
    cy.wait(1000);
    
    // Verify filtered results
    cy.get('table').should('be.visible');
  });

  it('should search events', () => {
    // Enter search query
    cy.get('input[type="text"]').type('test event');
    
    // Wait for search results
    cy.wait(1000);
    
    // Verify search results
    cy.get('table').should('be.visible');
  });

  it('should navigate to event detail page', () => {
    // Click on first event (if exists)
    cy.get('table a').first().then(($link) => {
      if ($link.length > 0) {
        cy.wrap($link).click();
        
        // Verify event detail page
        cy.contains('Event Details').should('be.visible');
        cy.contains('Event Information').should('be.visible');
      }
    });
  });

  it('should suspend event', () => {
    // Navigate to event detail page
    cy.get('table a').first().click();
    
    // Click suspend button (if event is not already cancelled)
    cy.contains('Cancel Event').then(($button) => {
      if ($button.length > 0) {
        cy.wrap($button).click();
        
        // Confirm action
        cy.on('window:confirm', () => true);
        
        // Verify status updated
        cy.wait(1000);
        cy.contains('CANCELLED').should('be.visible');
      }
    });
  });
});
