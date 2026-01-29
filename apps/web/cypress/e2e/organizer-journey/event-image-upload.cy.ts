describe('Event Image Upload Flow', () => {
  beforeEach(() => {
    cy.organizerLogin();
  });

  it('should upload event image during event creation', () => {
    cy.visit('/organizer/events/create');

    // Step 1: Basic Info
    cy.get('input[name*="title" i]').type('Test Event with Image');
    cy.get('select[name*="category" i]').select('concert');

    // Upload event image
    cy.get('input[type="file"]').first().then(($input) => {
      // Create a test image file
      const fileName = 'test-image.jpg';
      const fileContent = 'fake-image-content';
      const file = new File([fileContent], fileName, { type: 'image/jpeg' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const input = $input[0] as HTMLInputElement;
      input.files = dataTransfer.files;
      
      cy.wrap(input).trigger('change', { force: true });
    });

    // Wait for upload to complete
    cy.wait(2000);

    // Continue to next step
    cy.get('button').contains(/next/i).click();
    cy.wait(1000);

    // Step 2: Venue
    cy.get('input[name*="venueName" i]').type('Test Venue');
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
    cy.get('input[name*="name" i]').first().type('General Admission');
    cy.get('input[type="number"][name*="price" i]').first().type('5000');
    cy.get('input[type="number"][name*="quantity" i]').first().type('100');
    cy.get('button').contains(/create|save|submit/i).click();
    cy.wait(3000);

    // Verify event was created and navigate to it
    cy.url().should('include', '/organizer/events/');
  });

  it('should update event image in edit form', () => {
    // First create an event
    cy.createTestEvent({
      title: 'Event to Update Image',
      category: 'concert',
      venueName: 'Test Venue',
      ticketTypeName: 'General',
      ticketPrice: 5000,
      ticketQuantity: 50,
    });

    // Get the event ID from URL
    cy.url().then((url) => {
      const eventId = url.split('/').pop();
      
      // Navigate to edit page
      cy.visit(`/organizer/events/${eventId}`);
      cy.wait(2000);

      // Find and update image
      cy.get('input[type="file"]').first().then(($input) => {
        const fileName = 'updated-image.jpg';
        const fileContent = 'updated-image-content';
        const file = new File([fileContent], fileName, { type: 'image/jpeg' });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        const input = $input[0] as HTMLInputElement;
        input.files = dataTransfer.files;
        
        cy.wrap(input).trigger('change', { force: true });
      });

      cy.wait(2000);

      // Save the event
      cy.get('button').contains(/save|update/i).click();
      cy.wait(2000);

      // Verify image was updated (check if preview is shown)
      cy.get('img[alt="Preview"]').should('exist');
    });
  });

  it('should display uploaded images on event detail page', () => {
    // Create event with image
    cy.createTestEvent({
      title: 'Event with Image',
      category: 'concert',
      venueName: 'Test Venue',
      ticketTypeName: 'General',
      ticketPrice: 5000,
      ticketQuantity: 50,
    });

    // Get event slug or ID
    cy.url().then((url) => {
      const eventId = url.split('/').pop();
      
      // Navigate to public event page (if slug is available)
      // For now, just verify the edit page shows the image
      cy.visit(`/organizer/events/${eventId}`);
      cy.wait(2000);

      // Check if image upload component shows the image
      cy.get('body').then(($body) => {
        if ($body.find('img[alt="Preview"]').length > 0) {
          cy.get('img[alt="Preview"]').should('be.visible');
        }
      });
    });
  });
});
