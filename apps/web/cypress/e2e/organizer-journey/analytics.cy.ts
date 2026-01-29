describe('Organizer Analytics', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.organizerLogin();
  });

  it('should view event analytics', () => {
    cy.visit('/organizer/dashboard');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      if ($body.find('a[href*="/organizer/events/"]').length > 0) {
        cy.get('a[href*="/organizer/events/"]').first().click();
        cy.wait(2000);

        // Navigate to analytics
        cy.get('a[href*="analytics"]').click();
        cy.wait(2000);

        cy.url().should('include', 'analytics');
        
        // Check for analytics metrics
        cy.get('body').should('contain', 'Analytics');
        cy.get('body').should('contain', /revenue|tickets|orders/i);
      }
    });
  });

  it('should display revenue and ticket statistics', () => {
    cy.visit('/organizer/dashboard');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      if ($body.find('a[href*="/organizer/events/"]').length > 0) {
        cy.get('a[href*="/organizer/events/"]').first().click();
        cy.wait(2000);

        cy.get('a[href*="analytics"]').click();
        cy.wait(2000);

        // Check for key metrics
        cy.get('body').then(($body) => {
          const bodyText = $body.text();
          expect(bodyText).to.match(/revenue|tickets|orders|sold|available/i);
        });
      }
    });
  });
});
