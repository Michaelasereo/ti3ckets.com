describe('Existing Organizer Journey', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should login and manage events', () => {
    // Login as organizer (assuming test organizer exists)
    cy.visit('/auth/login');
    
    // Use test credentials - adjust based on your test data
    cy.get('input[type="email"]').type('organizer@getiickets.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('form').within(() => {
      cy.get('button[type="submit"]').click();
    });

    cy.wait(3000);
    
    // Should redirect to organizer dashboard
    cy.url().should('include', '/organizer/dashboard');

    // View events list
    cy.get('body').should('contain', 'Organizer Dashboard');
    
    // Click on an event to manage (if events exist)
    cy.get('body').then(($body) => {
      if ($body.find('a[href*="/organizer/events/"]').length > 0) {
        cy.get('a[href*="/organizer/events/"]').first().click();
        cy.wait(2000);

        // Should be on event management page
        cy.url().should('include', '/organizer/events/');

        // Check for status controls
        cy.get('body').should('contain', 'Event Status');

        // View analytics
        cy.get('a[href*="analytics"]').click();
        cy.wait(2000);
        cy.url().should('include', 'analytics');
        cy.get('body').should('contain', 'Analytics');

        // View orders
        cy.get('a[href*="orders"]').click();
        cy.wait(2000);
        cy.url().should('include', 'orders');
        cy.get('body').should('contain', 'Orders');
      }
    });
  });

  it('should access payout dashboard', () => {
    cy.visit('/auth/login');
    cy.get('input[type="email"]').type('organizer@getiickets.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('form').within(() => {
      cy.get('button[type="submit"]').click();
    });

    cy.wait(3000);
    cy.url().should('include', '/organizer/dashboard');

    // Navigate to payouts
    cy.visit('/organizer/payouts');
    cy.wait(2000);

    cy.get('body').should('contain', 'Payouts');
    cy.get('body').should('contain', 'Available Balance');
  });
});
