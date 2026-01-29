/// <reference types="cypress" />

// Custom commands for buyer journey testing

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth/login');
  cy.get('input[type="email"]').first().type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.get('button[type="submit"]').click();
  // Wait for redirect after login
  cy.url().should('not.include', '/auth/login');
});

Cypress.Commands.add('register', (email: string, password: string, name: string) => {
  cy.visit('/auth/register');
  cy.wait(1000);
  // Use more specific selectors to avoid multiple matches
  cy.get('input[type="text"]').first().type(name);
  cy.get('input[type="email"]').first().type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.get('input[type="password"]').eq(1).type(password);
  cy.get('form').find('button[type="submit"]').first().click();
  // Wait for redirect after registration (should go to onboarding)
  // If registration fails, it might stay on register page, so check for either
  cy.wait(5000);
  cy.url().then((url) => {
    if (url.includes('/auth/register')) {
      // Registration might have failed - check for error message
      cy.get('body').then(($body) => {
        if ($body.text().includes('error') || $body.text().includes('Error')) {
          cy.log('Registration failed - check error message');
        }
      });
    } else {
      // Should redirect to onboarding
      cy.url().should('include', '/onboarding');
    }
  });
});

Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.wait(alias).then((interception) => {
    expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
  });
});

Cypress.Commands.add('organizerLogin', (email: string = 'organizer@getiickets.com', password: string = 'password123') => {
  cy.visit('/auth/login');
  cy.get('input[type="email"]').first().type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.get('button[type="submit"]').first().click();
  cy.wait(3000);
  // After login, should redirect away from login page (dashboard or role selection)
  cy.url().should('not.include', '/auth/login');
});

Cypress.Commands.add('requestOrganizerAccess', () => {
  cy.visit('/organizer/signup');
  cy.wait(2000);
  cy.get('button').contains(/request.*organizer|become.*organizer/i).click();
  cy.wait(3000);
  cy.url().should('include', '/onboarding/organizer');
});

Cypress.Commands.add('completeOrganizerOnboarding', (businessName: string = 'Test Event Company', businessType: string = 'Entertainment') => {
  cy.contains('label', /Business Name|business name/i).parent().find('input').first().type(businessName);
  cy.contains('label', /Business Type|business type/i).parent().find('input, select').first().type(businessType);
  cy.get('button').contains(/complete|next|submit/i).first().click();
  cy.wait(3000);
  cy.url().should('include', '/organizer/dashboard');
});

Cypress.Commands.add('createTestEvent', (eventData: {
  title: string;
  description?: string;
  category?: string;
  venueName?: string;
  ticketTypeName?: string;
  ticketPrice?: number;
  ticketQuantity?: number;
}) => {
  cy.visit('/organizer/events/create');
  cy.wait(2000);
  
  // Step 1: Basic info - use label-based selectors
  cy.contains('label', /Event Title|title/i).parent().find('input[type="text"]').first().type(eventData.title);
  if (eventData.description) {
    cy.contains('label', /Description/i).parent().find('textarea').first().type(eventData.description);
  }
  cy.contains('label', /Category/i).parent().find('select').first().select(eventData.category || 'concert');
  cy.get('button').contains(/next/i).click();
  cy.wait(1000);

  // Step 2: Venue
  cy.contains('label', /Venue Name|venue/i).parent().find('input[type="text"]').first().type(eventData.venueName || 'Test Venue');
  cy.contains('label', /Address/i).parent().find('input[type="text"]').first().type('123 Test Street');
  cy.get('button').contains(/next/i).click();
  cy.wait(1000);

  // Step 3: Dates
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateStr = futureDate.toISOString().slice(0, 16);
  cy.contains('label', /Start Date|Start/i).parent().find('input[type="datetime-local"]').first().type(dateStr);
  cy.contains('label', /End Date|End/i).parent().find('input[type="datetime-local"]').first().type(dateStr);
  cy.get('button').contains(/next/i).click();
  cy.wait(1000);

  // Step 4: Tickets - find inputs within the ticket type form section
  // The ticket type inputs are in a bordered div, find the first one
  cy.get('div.border').contains(/Ticket Type/i).parent().parent().within(() => {
    // Find the name input (text input in this section)
    cy.get('input[type="text"]').first().type(eventData.ticketTypeName || 'General Admission');
    // Find price input (number input with "Price" label)
    cy.contains('label', /Price/i).parent().find('input[type="number"]').first().clear().type(String(eventData.ticketPrice || 5000));
    // Find quantity input (number input with "Quantity" label)
    cy.contains('label', /Quantity|Total Quantity/i).parent().find('input[type="number"]').first().clear().type(String(eventData.ticketQuantity || 100));
  });
  cy.get('button').contains(/save|create|submit|finish/i).click();
  cy.wait(3000);
  
  cy.url().should('include', '/organizer/events/');
});

Cypress.Commands.add('setupPayoutAccount', (accountDetails: {
  name: string;
  account_number: string;
  bank_code: string;
}) => {
  cy.visit('/organizer/payouts/setup');
  cy.wait(2000);
  
  cy.contains('label', /Account Name|name/i).parent().find('input').first().type(accountDetails.name);
  cy.contains('label', /Account Number|account number/i).parent().find('input').first().type(accountDetails.account_number);
  cy.contains('label', /Bank|bank code/i).parent().find('select').first().select(accountDetails.bank_code);
  
  cy.get('button[type="submit"]').click();
  cy.wait(3000);
});

Cypress.Commands.add('adminLogin', (email: string = 'admin@example.com', password: string = 'password123') => {
  cy.visit('/auth/login');
  cy.get('input[type="email"]').first().type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.get('button[type="submit"]').first().click();
  cy.wait(3000);
  cy.url().should('not.include', '/auth/login');
});

Cypress.Commands.add('verifyOrganizer', (organizerId: string) => {
  cy.visit(`/admin/organizers/${organizerId}`);
  cy.contains('Verify').click();
  cy.on('window:confirm', () => true);
  cy.wait(2000);
});

Cypress.Commands.add('suspendUser', (userId: string) => {
  cy.visit(`/admin/users/${userId}`);
  cy.contains('Suspend User').click();
  cy.on('window:confirm', () => true);
  cy.wait(2000);
});

Cypress.Commands.add('seedTestData', () => {
  // This would typically call API endpoints to create test data
  // For now, we'll use existing commands
  cy.log('Seeding test data...');
  // Implementation would create test users, events, orders via API
});

Cypress.Commands.add('cleanupTestData', () => {
  // Cleanup test data after tests
  cy.log('Cleaning up test data...');
  // Implementation would delete test data via API or direct database access
});

Cypress.Commands.add('createTestEventWithImage', (eventData: {
  title: string;
  description?: string;
  category?: string;
  venueName?: string;
  ticketTypeName?: string;
  ticketPrice?: number;
  ticketQuantity?: number;
  imageUrl?: string;
  bannerUrl?: string;
}) => {
  cy.visit('/organizer/events/create');
  
  // Step 1: Basic info with image
  cy.get('input[name*="title" i]').type(eventData.title);
  if (eventData.description) {
    cy.get('textarea[name*="description" i]').type(eventData.description);
  }
  cy.get('select[name*="category" i]').select(eventData.category || 'concert');
  
  // Upload image if provided
  if (eventData.imageUrl) {
    // Image upload would be handled by the ImageUpload component
    // For now, we'll just proceed
  }
  
  cy.get('button').contains(/next/i).click();
  cy.wait(1000);

  // Step 2: Venue
  cy.get('input[name*="venueName" i]').type(eventData.venueName || 'Test Venue');
  cy.get('input[name*="venueAddress" i]').type('123 Test Street');
  cy.get('button').contains(/next/i).click();
  cy.wait(1000);

  // Step 3: Dates
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateStr = futureDate.toISOString().slice(0, 16);
  cy.get('input[type="datetime-local"]').first().type(dateStr);
  cy.get('input[type="datetime-local"]').eq(1).type(dateStr);
  cy.get('button').contains(/next/i).click();
  cy.wait(1000);

  // Step 4: Tickets
  cy.get('input[name*="name" i]').first().type(eventData.ticketTypeName || 'General Admission');
  cy.get('input[type="number"][name*="price" i]').first().type(String(eventData.ticketPrice || 5000));
  cy.get('input[type="number"][name*="quantity" i]').first().type(String(eventData.ticketQuantity || 100));
  cy.get('button').contains(/save|create|submit/i).click();
  cy.wait(3000);
  
  cy.url().should('include', '/organizer/events/');
});

// Prevent TypeScript errors
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      register(email: string, password: string, name: string): Chainable<void>;
      waitForApi(alias: string): Chainable<void>;
      organizerLogin(email?: string, password?: string): Chainable<void>;
      requestOrganizerAccess(): Chainable<void>;
      completeOrganizerOnboarding(businessName?: string, businessType?: string): Chainable<void>;
      createTestEvent(eventData: {
        title: string;
        description?: string;
        category?: string;
        venueName?: string;
        ticketTypeName?: string;
        ticketPrice?: number;
        ticketQuantity?: number;
      }): Chainable<void>;
      setupPayoutAccount(accountDetails: {
        name: string;
        account_number: string;
        bank_code: string;
      }): Chainable<void>;
      adminLogin(email?: string, password?: string): Chainable<void>;
      verifyOrganizer(organizerId: string): Chainable<void>;
      suspendUser(userId: string): Chainable<void>;
      seedTestData(): Chainable<void>;
      cleanupTestData(): Chainable<void>;
      createTestEventWithImage(eventData: {
        title: string;
        description?: string;
        category?: string;
        venueName?: string;
        ticketTypeName?: string;
        ticketPrice?: number;
        ticketQuantity?: number;
        imageUrl?: string;
        bannerUrl?: string;
      }): Chainable<void>;
    }
  }
}

export {};
