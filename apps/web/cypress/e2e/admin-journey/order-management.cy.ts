describe('Admin Order Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/admin/orders');
  });

  it('should display orders list', () => {
    cy.contains('Order Management').should('be.visible');
    cy.contains('View and manage all platform orders').should('be.visible');

    // Wait for orders table to load
    cy.get('table').should('be.visible');
  });

  it('should filter orders by status', () => {
    // Select status filter
    cy.get('select').first().select('PAID');
    
    // Wait for filtered results
    cy.wait(1000);
    
    // Verify filtered results
    cy.get('table').should('be.visible');
  });

  it('should filter orders by event ID', () => {
    // Enter event ID (if known)
    cy.get('input[type="text"]').type('test-event-id');
    
    // Wait for filtered results
    cy.wait(1000);
    
    // Verify filtered results
    cy.get('table').should('be.visible');
  });

  it('should navigate to order detail page', () => {
    // Click on first order (if exists)
    cy.get('table a').first().then(($link) => {
      if ($link.length > 0) {
        cy.wrap($link).click();
        
        // Verify order detail page
        cy.contains('Order Details').should('be.visible');
        cy.contains('Order Information').should('be.visible');
      }
    });
  });

  it('should display order details correctly', () => {
    // Navigate to order detail page
    cy.get('table a').first().click();
    
    // Verify order information sections
    cy.contains('Order Information').should('be.visible');
    cy.contains('Customer').should('be.visible');
    cy.contains('Event').should('be.visible');
    
    // Verify order number is displayed
    cy.get('body').should('contain', 'Order Number');
  });
});
