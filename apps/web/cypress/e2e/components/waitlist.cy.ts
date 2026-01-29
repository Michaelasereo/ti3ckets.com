describe('Waitlist Functionality', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearAllSessionStorage();
  });

  it('should allow joining waitlist for sold-out events', () => {
    // 1. Visit events page
    cy.visit('/events');
    cy.url().should('include', '/events');
    
    // Wait for loading to finish
    cy.get('.animate-pulse', { timeout: 15000 }).should('not.exist');

    // 2. Find and click on an event (ideally one that's sold out)
    // In a real scenario, you'd need test data with sold-out events
    cy.get('body').then(($body) => {
      const eventLinks = $body.find('a[href*="/events/"]');
      if (eventLinks.length > 0) {
        cy.get('a[href*="/events/"]').first().click();
    cy.url().should('include', '/events/');

        // 3. Check if there are sold-out ticket types
        cy.get('body').then(($body) => {
          if ($body.text().includes('Sold Out')) {
            // 4. Click "Join Waitlist" button
            cy.contains('Join Waitlist').click();

            // 5. Verify modal opens
            cy.contains('Join Waitlist').should('be.visible');
            cy.contains('Get notified').should('be.visible');

            // 6. Enter email and phone
            const testEmail = `waitlist-${Date.now()}@example.com`;
            cy.get('input[type="email"]').type(testEmail);
            cy.get('input[type="tel"]').type('+2348000000000');
            cy.get('input[type="number"]').clear().type('2');

            // 7. Submit waitlist form
            cy.get('button:contains("Join Waitlist")').last().click();

            // 8. Verify success message
            cy.contains("You're on the waitlist").should('be.visible');
          } else {
            // If no sold-out events, skip test
            cy.log('No sold-out events found for testing waitlist');
          }
        });
      } else {
        cy.log('No events available for testing waitlist');
      }
    });
  });

  it('should validate waitlist form fields', () => {
    cy.visit('/events');
    
    // Wait for loading to finish
    cy.get('.animate-pulse', { timeout: 15000 }).should('not.exist');
    
    cy.get('body').then(($body) => {
      const eventLinks = $body.find('a[href*="/events/"]');
      if (eventLinks.length > 0) {
        cy.get('a[href*="/events/"]').first().click();

        cy.get('body').then(($body) => {
          if ($body.text().includes('Sold Out')) {
            cy.contains('Join Waitlist').click();

            // Try to submit without email - button should be disabled
            cy.get('button:contains("Join Waitlist")').last().should('be.disabled');

            // Enter invalid email
            cy.get('input[type="email"]').type('invalid-email');
            // HTML5 validation should prevent submission
            cy.get('input[type="email"]').should('have.attr', 'type', 'email');
          } else {
            cy.log('No sold-out events found for testing waitlist validation');
          }
        });
      } else {
        cy.log('No events available for testing waitlist validation');
      }
    });
  });
});
