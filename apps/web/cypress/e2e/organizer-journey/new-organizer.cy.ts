describe('New Organizer Journey', () => {
  beforeEach(() => {
    // Clear any existing sessions
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should complete full organizer registration flow', () => {
    // Step 1: Register as buyer first
    cy.visit('/auth/register');
    
    const timestamp = Date.now();
    const email = `organizer${timestamp}@test.com`;
    const password = 'Test1234!';

    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').first().type(password);
    cy.get('input[name*="name" i], input[placeholder*="name" i]').first().type('Test Organizer');
    cy.get('input[type="tel"], input[placeholder*="phone" i]').type('08012345678');

    cy.get('form').within(() => {
      cy.get('button[type="submit"]').click();
    });

    // Wait for redirect to onboarding
    cy.url().should('include', '/onboarding/buyer');
    cy.wait(2000);

    // Complete buyer onboarding (skip or fill minimal)
    cy.get('body').then(($body) => {
      if ($body.find('input[name="firstName"]').length > 0) {
        cy.get('input[name="firstName"]').type('Test');
        cy.get('input[name="lastName"]').type('Organizer');
        cy.get('button').contains(/complete|next|skip/i).first().click();
      }
    });

    // Step 2: Request organizer access
    cy.visit('/organizer/signup');
    cy.wait(2000);

    cy.get('button').contains(/request.*organizer|become.*organizer/i).click();
    cy.wait(3000);

    // Should redirect to organizer onboarding
    cy.url().should('include', '/onboarding/organizer');

    // Step 3: Complete organizer onboarding
    cy.get('input[name*="businessName" i], input[placeholder*="business" i]').first().type('Test Event Company');
    cy.get('input[name*="businessType" i], select[name*="businessType" i]').first().type('Entertainment');
    
    cy.get('button').contains(/complete|next|submit/i).first().click();
    cy.wait(3000);

    // Should redirect to organizer dashboard
    cy.url().should('include', '/organizer/dashboard');

    // Step 4: Create first event
    cy.get('a[href*="create"], button').contains(/create.*event/i).first().click();
    cy.url().should('include', '/organizer/events/create');

    // Fill event form
    cy.get('input[name*="title" i], input[placeholder*="title" i]').first().type('Test Event');
    cy.get('textarea[name*="description" i]').type('This is a test event');
    cy.get('select[name*="category" i]').select('concert');

    // Navigate through steps
    cy.get('button').contains(/next/i).click();
    cy.wait(1000);

    // Venue step
    cy.get('input[name*="venueName" i]').type('Test Venue');
    cy.get('input[name*="venueAddress" i]').type('123 Test Street');
    cy.get('button').contains(/next/i).click();
    cy.wait(1000);

    // Date step - set future dates
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().slice(0, 16);

    cy.get('input[type="datetime-local"]').first().type(dateStr);
    cy.get('input[type="datetime-local"]').eq(1).type(dateStr);
    cy.get('button').contains(/next/i).click();
    cy.wait(1000);

    // Ticket types step
    cy.get('input[name*="name" i]').first().type('General Admission');
    cy.get('input[type="number"][name*="price" i]').first().type('5000');
    cy.get('input[type="number"][name*="quantity" i]').first().type('100');

    cy.get('button').contains(/save|create|submit/i).click();
    cy.wait(3000);

    // Should redirect to event management page
    cy.url().should('include', '/organizer/events/');
  });
});
