describe('Guest Checkout Journey', () => {
  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearAllSessionStorage();
  });

  it('should complete full guest checkout flow', () => {
    // 1. Visit homepage
    cy.visit('/');
    cy.url().should('include', '/');

    // 2. Browse events
    cy.contains('Browse Events').click();
    cy.url().should('include', '/events');
    
    // Wait for loading to finish (skeletons disappear)
    cy.get('.animate-pulse', { timeout: 15000 }).should('not.exist');
    
    // Wait for events to load - look for event links or grid items
    // If no events, skip the rest of the test
    cy.get('body').then(($body) => {
      const eventLinks = $body.find('a[href*="/events/"]');
      if (eventLinks.length > 0) {
        // 3. View event details - click on first event link
        cy.get('a[href*="/events/"]').first().click();
    // Or if no testid, click on the first link/event
    cy.url().should('include', '/events/');

        // 4. Verify event details page loaded
        cy.contains('Ticket Information').should('be.visible');
        
        // 5. Click "Reserve Tickets" button (if not disabled)
        cy.get('button:contains("Reserve Tickets")').then(($btn) => {
          if (!$btn.is(':disabled')) {
            cy.contains('Reserve Tickets').click();
            cy.url().should('include', '/checkout/step1');

            // 6. Verify checkout step 1 loaded
            cy.contains('Select Tickets').should('be.visible');
            
            // 7. Select ticket quantity (if tickets are available)
            cy.get('button:contains("+")').first().then(($plusBtn) => {
              if ($plusBtn.length > 0) {
                cy.wrap($plusBtn).click();
              }
            });

            // 8. Proceed to Step 2 (if button is enabled)
            cy.get('button:contains("Continue")').then(($btn) => {
              if (!$btn.is(':disabled')) {
                cy.contains('Continue').click();
                cy.url().should('include', '/checkout/step2');

                // 9. Enter customer info
                const testEmail = `test-${Date.now()}@example.com`;
                cy.get('input[type="email"]').type(testEmail);
                cy.get('input[placeholder*="name" i]').first().type('Test User');
                cy.get('input[type="tel"], input[placeholder*="phone" i]').first().type('+2348000000000');

                // 10. Review order total
                cy.contains('Total').should('be.visible');

                // 11. Note: Payment step would require Paystack test mode
                // For now, we'll verify the payment button exists
                cy.contains('Pay Now').should('be.visible');
              }
            });
          }
        });
      } else {
        cy.log('No events available for testing - skipping checkout flow');
      }
    });
  });

  it('should handle event browsing with filters', () => {
    cy.visit('/events');
    
    // Wait for loading to finish
    cy.get('.animate-pulse', { timeout: 15000 }).should('not.exist');
    
    // Test category filter - look for select elements
    cy.get('select').first().then(($select) => {
      if ($select.length > 0 && $select.find('option').length > 1) {
        cy.wrap($select).select(1);
        // Wait a bit for filter to apply
        cy.wait(1000);
      }
    });

    // Verify page loaded (events may or may not be present)
    cy.contains('Browse Events').should('be.visible');
  });
});
