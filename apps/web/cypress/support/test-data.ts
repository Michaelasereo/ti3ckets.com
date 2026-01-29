/// <reference types="cypress" />

import { adminApi, organizerApi, authApi } from '../../lib/api';

/**
 * Test data utilities for Cypress tests
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: 'BUYER' | 'ORGANIZER' | 'ADMIN';
}

export interface TestEvent {
  title: string;
  description?: string;
  category: string;
  imageUrl?: string;
  bannerUrl?: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startDateTime: string;
  endDateTime: string;
  saleStart: string;
  saleEnd: string;
  ticketTypes: Array<{
    name: string;
    price: number;
    totalQuantity: number;
  }>;
}

/**
 * Create a test user via API
 */
export async function createTestUser(user: TestUser): Promise<{ userId: string; email: string }> {
  try {
    const response = await authApi.register({
      email: user.email,
      password: user.password,
      name: user.name,
    });
    
    // Note: In a real scenario, you'd need to handle the response and extract user ID
    // For now, return the email as identifier
    return {
      userId: user.email, // This would be the actual user ID in production
      email: user.email,
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Create a test event via API (requires organizer authentication)
 */
export async function createTestEventViaAPI(eventData: TestEvent, authToken?: string): Promise<{ eventId: string }> {
  try {
    // In a real scenario, you'd pass the auth token
    const response = await organizerApi.createEvent({
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      imageUrl: eventData.imageUrl,
      bannerUrl: eventData.bannerUrl,
      venueName: eventData.venueName,
      venueAddress: eventData.venueAddress,
      city: eventData.city,
      startDateTime: eventData.startDateTime,
      endDateTime: eventData.endDateTime,
      saleStart: eventData.saleStart,
      saleEnd: eventData.saleEnd,
      ticketTypes: eventData.ticketTypes,
    });

    if (response.data.success) {
      return { eventId: response.data.data.id };
    }
    throw new Error('Failed to create test event');
  } catch (error) {
    console.error('Error creating test event:', error);
    throw error;
  }
}

/**
 * Cleanup test data
 * Note: In a real scenario, you'd have cleanup endpoints or direct database access
 */
export async function cleanupTestData(userIds: string[], eventIds: string[]): Promise<void> {
  // This would typically call cleanup endpoints or directly delete from database
  console.log('Cleaning up test data:', { userIds, eventIds });
  // Implementation would depend on available cleanup mechanisms
}

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

/**
 * Generate test event data
 */
export function generateTestEventData(overrides?: Partial<TestEvent>): TestEvent {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateStr = futureDate.toISOString().slice(0, 16);

  return {
    title: `Test Event ${Date.now()}`,
    description: 'Test event description',
    category: 'concert',
    venueName: 'Test Venue',
    venueAddress: '123 Test Street',
    city: 'Lagos',
    startDateTime: dateStr,
    endDateTime: dateStr,
    saleStart: new Date().toISOString().slice(0, 16),
    saleEnd: dateStr,
    ticketTypes: [
      {
        name: 'General Admission',
        price: 5000,
        totalQuantity: 100,
      },
    ],
    ...overrides,
  };
}
