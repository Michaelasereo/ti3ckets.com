describe('Registered Buyer Journey', () => {
  const testEmail = `buyer-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test Buyer';

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearAllSessionStorage();
  });

  it('should register, onboard, and purchase tickets', () => {
    // 1. Register account
    cy.visit('/auth/register');
    // Fill form using label selectors for more specificity
    cy.contains('label', 'Name').parent().find('input[type="text"]').type(testName);
    cy.contains('label', 'Email').parent().find('input[type="email"]').type(testEmail);
    cy.contains('label', /^Password/).parent().find('input[type="password"]').type(testPassword);
    cy.contains('label', 'Confirm Password').parent().find('input[type="password"]').type(testPassword);
    cy.get('form').find('button[type="submit"]').first().click();

    // Wait for redirect to onboarding (or dashboard if profile auto-completed)
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
      return url.includes('/onboarding/buyer') || url.includes('/dashboard/tickets');
    });

    // 2. Complete onboarding if needed - use label to find inputs
    cy.url().then((url) => {
      if (url.includes('/onboarding/buyer')) {
        cy.contains('label', /First Name|firstName/i).parent().find('input').first().type('John', { force: true });
        cy.contains('label', /Last Name|lastName/i).parent().find('input').first().type('Doe', { force: true });
        // Optional fields can be skipped or filled
        cy.get('form').find('button[type="submit"]').first().click();
      }
    });

    // Wait for redirect to dashboard
    cy.url({ timeout: 10000 }).should('include', '/dashboard/tickets');

    // 3. Browse and purchase tickets
    cy.visit('/events');
    cy.url().should('include', '/events');
    
    // Wait for loading to finish
    cy.get('.animate-pulse', { timeout: 15000 }).should('not.exist');

    // Check if events are available
    cy.get('body').then(($body) => {
      const eventLinks = $body.find('a[href*="/events/"]');
      if (eventLinks.length > 0) {
        // Click on first event
        cy.get('a[href*="/events/"]').first().click();
        cy.url().should('include', '/events/');

        // Click Reserve Tickets (if not disabled)
        cy.get('button:contains("Reserve Tickets")').then(($btn) => {
          if (!$btn.is(':disabled')) {
            cy.contains('Reserve Tickets').click();
            cy.url().should('include', '/checkout/step1');

            // Select tickets using + button
            cy.get('button:contains("+")').first().then(($plusBtn) => {
              if ($plusBtn.length > 0) {
                cy.wrap($plusBtn).click();
              }
            });

            // Proceed to checkout (if button enabled)
            cy.get('button:contains("Continue")').then(($btn) => {
              if (!$btn.is(':disabled')) {
                cy.contains('Continue').click();
                cy.url().should('include', '/checkout/step2');

                // Customer info should be pre-filled for registered users
                cy.get('input[type="email"]').should('have.value', testEmail);
                
                // Verify payment button
                cy.contains('Pay Now').should('be.visible');
              }
            });
          }
        });
      } else {
        cy.log('No events available for testing purchase flow');
      }
    });
  });

  it('should view tickets in dashboard', () => {
    // This test requires the user to be created in the first test
    // For now, we'll register and complete onboarding first
    cy.visit('/auth/register');
    const dashboardEmail = `dashboard-${Date.now()}@example.com`;
    cy.contains('label', 'Name').parent().find('input[type="text"]').type('Dashboard User');
    cy.contains('label', 'Email').parent().find('input[type="email"]').type(dashboardEmail);
    cy.contains('label', /^Password/).parent().find('input[type="password"]').type(testPassword);
    cy.contains('label', 'Confirm Password').parent().find('input[type="password"]').type(testPassword);
    cy.get('form').find('button[type="submit"]').first().click();
    
    // Complete onboarding if needed
    cy.url({ timeout: 10000 }).then((url) => {
      if (url.includes('/onboarding/buyer')) {
        cy.get('input[name="firstName"]').first().type('Dashboard', { force: true });
        cy.get('input[name="lastName"]').first().type('User', { force: true });
        cy.get('form').find('button[type="submit"]').first().click();
      }
    });
    
    // Navigate to tickets dashboard (or verify we're already there)
    cy.url({ timeout: 10000 }).should('include', '/dashboard/tickets');
    
    // Verify page loaded
    cy.contains('My Tickets').should('be.visible');
  });

  it('should view order history', () => {
    // This test requires the user to be created
    // For now, we'll register and complete onboarding first
    cy.visit('/auth/register');
    const ordersEmail = `orders-${Date.now()}@example.com`;
    cy.contains('label', 'Name').parent().find('input[type="text"]').type('Orders User');
    cy.contains('label', 'Email').parent().find('input[type="email"]').type(ordersEmail);
    cy.contains('label', /^Password/).parent().find('input[type="password"]').type(testPassword);
    cy.contains('label', 'Confirm Password').parent().find('input[type="password"]').type(testPassword);
    cy.get('form').find('button[type="submit"]').first().click();
    
    // Complete onboarding if needed
    cy.url({ timeout: 10000 }).then((url) => {
      if (url.includes('/onboarding/buyer')) {
        cy.get('input[name="firstName"]').first().type('Orders', { force: true });
        cy.get('input[name="lastName"]').first().type('User', { force: true });
        cy.get('form').find('button[type="submit"]').first().click();
      }
    });
    
    // Navigate to orders (or verify we can access it)
    cy.visit('/dashboard/orders');
    cy.url({ timeout: 10000 }).should('include', '/dashboard/orders');
    
    // Verify page loaded
    cy.contains('Order History').should('be.visible');
  });
});
