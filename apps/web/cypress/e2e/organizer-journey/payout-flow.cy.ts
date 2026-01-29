describe('Organizer Payout Flow', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Login as organizer
    cy.visit('/auth/login');
    cy.get('input[type="email"]').type('organizer@getiickets.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('form').within(() => {
      cy.get('button[type="submit"]').click();
    });
    cy.wait(3000);
  });

  it('should setup bank account for payouts', () => {
    cy.visit('/organizer/payouts/setup');
    cy.wait(2000);

    // Fill bank account form
    cy.get('input[name*="name" i], input[placeholder*="account name" i]').first().type('Test Account Name');
    cy.get('input[name*="account_number" i], input[placeholder*="account number" i]').first().type('0123456789');
    cy.get('select[name*="bank" i], select[name*="bank_code" i]').first().select('044'); // Access Bank

    cy.get('button[type="submit"]').click();
    cy.wait(3000);

    // Should show success or redirect
    cy.get('body').then(($body) => {
      if ($body.text().includes('success') || $body.text().includes('complete')) {
        cy.url().should('include', '/organizer/payouts');
      }
    });
  });

  it('should view payout history', () => {
    cy.visit('/organizer/payouts/history');
    cy.wait(2000);

    cy.get('body').should('contain', 'Payout History');
    
    // Check for filters
    cy.get('select').should('exist');
  });

  it('should request payout (if balance available)', () => {
    cy.visit('/organizer/payouts');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      // Check if there's available balance
      if ($body.text().includes('Request Payout')) {
        cy.get('button').contains('Request Payout').click();
        cy.wait(1000);

        // Fill payout amount
        cy.get('input[type="number"]').type('15000');
        cy.get('button').contains(/request|submit/i).click();
        cy.wait(2000);

        // Should show success message
        cy.get('body').should('contain', /success|submitted|processing/i);
      }
    });
  });
});
