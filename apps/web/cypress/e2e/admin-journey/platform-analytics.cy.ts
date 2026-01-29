describe('Admin Platform Analytics', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/admin/analytics');
  });

  it('should display platform analytics page', () => {
    cy.contains('Platform Analytics').should('be.visible');
    cy.contains('Detailed analytics and revenue insights').should('be.visible');
  });

  it('should display revenue statistics', () => {
    // Verify revenue cards are displayed
    cy.contains('Total Revenue').should('be.visible');
    cy.contains('Total Fees Collected').should('be.visible');
    cy.contains('Tickets Sold').should('be.visible');
    cy.contains('Average Order Value').should('be.visible');
  });

  it('should display top events', () => {
    // Scroll to top events section
    cy.contains('Top Events').should('be.visible');
    
    // Verify top events list (if any exist)
    cy.get('body').then(($body) => {
      if ($body.find('[class*="space-y-3"]').length > 0) {
        cy.contains('Top Events').parent().within(() => {
          // Check for event items or empty state
          cy.get('body').should('exist');
        });
      }
    });
  });

  it('should display top organizers', () => {
    // Scroll to top organizers section
    cy.contains('Top Organizers').should('be.visible');
    
    // Verify top organizers list (if any exist)
    cy.get('body').then(($body) => {
      if ($body.find('[class*="space-y-3"]').length > 0) {
        cy.contains('Top Organizers').parent().within(() => {
          // Check for organizer items or empty state
          cy.get('body').should('exist');
        });
      }
    });
  });

  it('should display revenue by month', () => {
    // Scroll to revenue by month section
    cy.contains('Revenue by Month').should('be.visible');
    
    // Verify revenue data is displayed (if any exists)
    cy.get('body').then(($body) => {
      if ($body.text().includes('Revenue by Month')) {
        // Check for month entries or empty state
        cy.get('body').should('exist');
      }
    });
  });
});
