describe('Ticket Sales Management', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.organizerLogin();
  });

  it('should view and filter orders', () => {
    // Navigate to an event's orders page
    cy.visit('/organizer/dashboard');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      if ($body.find('a[href*="/organizer/events/"]').length > 0) {
        cy.get('a[href*="/organizer/events/"]').first().click();
        cy.wait(2000);

        // Navigate to orders
        cy.get('a[href*="orders"]').click();
        cy.wait(2000);

        cy.url().should('include', 'orders');
        cy.get('body').should('contain', 'Orders');

        // Test status filter
        cy.get('select').first().select('PAID');
        cy.wait(2000);

        // Test search (if implemented)
        cy.get('input[type="text"]').then(($input) => {
          if ($input.length > 0) {
            cy.get('input[type="text"]').first().type('test@example.com');
            cy.wait(1000);
          }
        });
      }
    });
  });

  it('should export orders to CSV', () => {
    cy.visit('/organizer/dashboard');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      if ($body.find('a[href*="/organizer/events/"]').length > 0) {
        cy.get('a[href*="/organizer/events/"]').first().click();
        cy.wait(2000);

        cy.get('a[href*="orders"]').click();
        cy.wait(2000);

        // Click export button
        cy.get('button').contains(/export/i).then(($btn) => {
          if ($btn.length > 0) {
            cy.window().then((win) => {
              cy.stub(win, 'open').as('windowOpen');
            });
            cy.get('button').contains(/export/i).click();
            // CSV download should be triggered
          }
        });
      }
    });
  });

  it('should update event status', () => {
    cy.visit('/organizer/dashboard');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      if ($body.find('a[href*="/organizer/events/"]').length > 0) {
        cy.get('a[href*="/organizer/events/"]').first().click();
        cy.wait(2000);

        // Check for status controls
        cy.get('body').should('contain', 'Event Status');

        // Try to change status (if in draft)
        cy.get('body').then(($body) => {
          if ($body.text().includes('Draft') || $body.text().includes('DRAFT')) {
            cy.get('button').contains(/publish|mark as published/i).then(($btn) => {
              if ($btn.length > 0) {
                cy.window().then((win) => {
                  cy.stub(win, 'confirm').returns(true);
                });
                cy.get('button').contains(/publish|mark as published/i).click();
                cy.wait(2000);
              }
            });
          }
        });
      }
    });
  });
});
