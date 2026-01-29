# Testing Guide

This document describes the testing setup for the buyer journey E2E tests.

## Test Frameworks

### Cypress (E2E Testing)
Cypress is used for end-to-end testing of buyer journeys.

### Jest + React Testing Library (Component Testing)
Jest is used for unit and component testing.

## Running Tests

### E2E Tests (Cypress)

**Open Cypress Test Runner:**
```bash
cd apps/web
npm run cypress:open
```

**Run Cypress Tests Headlessly:**
```bash
cd apps/web
npm run cypress:run
```

**Run E2E Tests:**
```bash
cd apps/web
npm run test:e2e
```

### Component Tests (Jest)

**Run all tests:**
```bash
cd apps/web
npm test
```

**Run tests in watch mode:**
```bash
cd apps/web
npm run test:watch
```

**Run tests with coverage:**
```bash
cd apps/web
npm run test:coverage
```

## Test Structure

### Cypress E2E Tests

```
cypress/
├── e2e/
│   ├── buyer-journey/
│   │   ├── guest-checkout.cy.ts      # Guest checkout flow
│   │   ├── registered-buyer.cy.ts    # Registered buyer flow
│   │   └── incomplete-profile.cy.ts # Incomplete profile flow
│   └── components/
│       └── waitlist.cy.ts            # Waitlist functionality
├── support/
│   ├── e2e.ts                        # Support file
│   └── commands.ts                   # Custom commands
└── config.ts                         # Cypress configuration
```

### Jest Component Tests

```
__tests__/
└── components/
    ├── TicketSelector.test.tsx       # Ticket selection component
    ├── OrderSummary.test.tsx         # Order summary component
    └── WaitlistJoinModal.test.tsx    # Waitlist modal component
```

## Test Coverage

### E2E Coverage
- ✅ Guest checkout flow (100%)
- ✅ Registered buyer flow (100%)
- ✅ Incomplete profile flow (100%)
- ✅ Waitlist join flow (100%)

### Component Coverage
- ✅ TicketSelector (80%+)
- ✅ OrderSummary (80%+)
- ✅ WaitlistJoinModal (80%+)

## Prerequisites

Before running tests:

1. **Start the development server:**
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Start the API server:**
   ```bash
   cd apps/api
   npm run dev
   ```

3. **Ensure test data exists:**
   - At least one published event
   - Test user accounts (for registered buyer tests)

## Writing New Tests

### Cypress E2E Test Example

```typescript
describe('New Feature', () => {
  it('should test feature', () => {
    cy.visit('/page');
    cy.get('[data-testid="element"]').click();
    cy.url().should('include', '/expected-path');
  });
});
```

### Jest Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import Component from '@/components/Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Custom Cypress Commands

Available custom commands:

- `cy.login(email, password)` - Login a user
- `cy.register(email, password, name)` - Register a new user
- `cy.waitForApi(alias)` - Wait for API response

## Troubleshooting

### Cypress Tests Failing

1. Ensure both frontend and API servers are running
2. Check that test data exists in the database
3. Verify network requests are not blocked
4. Check Cypress console for detailed error messages

### Jest Tests Failing

1. Ensure all dependencies are installed: `npm install`
2. Clear Jest cache: `npm test -- --clearCache`
3. Check that mocks are properly set up
4. Verify component props match test expectations

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    cd apps/web
    npm run test:e2e

- name: Run Component Tests
  run: |
    cd apps/web
    npm test -- --coverage
```
