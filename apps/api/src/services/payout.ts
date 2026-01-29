import { PrismaClient } from '@prisma/client';
import { PaystackService } from './paystack';

export class PayoutService {
  private paystackService: PaystackService;
  private platformFeePercentage: number;
  private paystackFeePercentage: number;
  private paystackFixedFee: number; // in NGN
  private freeTicketsThreshold: number;

  constructor() {
    this.paystackService = new PaystackService();
    // Platform fee: 3.5% (50% lower than competitors)
    this.platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3.5') / 100;
    // Paystack fee: 1.5% + ₦100 per transaction
    this.paystackFeePercentage = parseFloat(process.env.PAYSTACK_FEE_PERCENTAGE || '1.5') / 100;
    this.paystackFixedFee = parseFloat(process.env.PAYSTACK_FIXED_FEE || '100');
    // Free for first 100 tickets per organizer
    this.freeTicketsThreshold = parseFloat(process.env.FREE_TICKETS_THRESHOLD || '100');
  }

  /**
   * Calculate fees for an order
   * Platform fee is FREE for first 100 tickets per organizer
   */
  private calculateOrderFees(orderAmount: number, ticketCount: number, ticketsSoldBeforeThisOrder: number): {
    platformFee: number;
    paystackFee: number;
    totalFees: number;
  } {
    // Paystack fee: 1.5% + ₦100 per transaction
    const paystackFee = (orderAmount * this.paystackFeePercentage) + this.paystackFixedFee;

    // Platform fee: 3.5%, but FREE for first 100 tickets
    let platformFee = 0;
    const ticketsAfterThisOrder = ticketsSoldBeforeThisOrder + ticketCount;
    
    if (ticketsAfterThisOrder > this.freeTicketsThreshold) {
      // Some or all tickets in this order are chargeable
      const freeTicketsRemaining = Math.max(0, this.freeTicketsThreshold - ticketsSoldBeforeThisOrder);
      const chargeableTickets = Math.max(0, ticketCount - freeTicketsRemaining);
      
      if (chargeableTickets > 0) {
        // Calculate platform fee proportionally for chargeable tickets
        const chargeableAmount = (orderAmount / ticketCount) * chargeableTickets;
        platformFee = chargeableAmount * this.platformFeePercentage;
      }
    }

    const totalFees = platformFee + paystackFee;

    return {
      platformFee,
      paystackFee,
      totalFees,
    };
  }

  /**
   * Calculate payout balances for an organizer
   */
  async calculateBalances(prisma: PrismaClient, organizerId: string) {
    // Get all events for this organizer with orders and tickets
    const events = await prisma.event.findMany({
      where: { organizerId },
      include: {
        orders: {
          where: { status: 'PAID' },
          include: {
            tickets: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc', // Process in chronological order for free tickets calculation
          },
        },
      },
    });

    // Calculate fees per order, tracking ticket count for free tickets
    let totalRevenue = 0;
    let totalPlatformFee = 0;
    let totalPaystackFee = 0;
    let totalFees = 0;
    let pendingRevenue = 0;
    let pendingFees = 0;
    let ticketsSoldSoFar = 0;

    const holdPeriodDays = 7; // Revenue from orders in last 7 days is pending
    const holdPeriodDate = new Date();
    holdPeriodDate.setDate(holdPeriodDate.getDate() - holdPeriodDays);

    // Process orders chronologically to track free tickets
    const allOrders: Array<{
      amount: number;
      ticketCount: number;
      createdAt: Date;
    }> = [];

    events.forEach((event) => {
      event.orders.forEach((order) => {
        allOrders.push({
          amount: Number(order.totalAmount),
          ticketCount: order.tickets.length,
          createdAt: order.createdAt,
        });
      });
    });

    // Sort by creation date to process chronologically
    allOrders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Calculate fees for each order
    allOrders.forEach((order) => {
      const orderAmount = order.amount;
      const ticketCount = order.ticketCount;
      
      totalRevenue += orderAmount;

      // Calculate fees for this order
      const fees = this.calculateOrderFees(orderAmount, ticketCount, ticketsSoldSoFar);
      totalPlatformFee += fees.platformFee;
      totalPaystackFee += fees.paystackFee;
      totalFees += fees.totalFees;

      ticketsSoldSoFar += ticketCount;

      // Revenue from orders in last 7 days is pending
      if (order.createdAt >= holdPeriodDate) {
        pendingRevenue += orderAmount;
        pendingFees += fees.totalFees;
      }
    });

    // Get total completed payouts
    const completedPayouts = await prisma.payout.findMany({
      where: {
        organizerId,
        status: 'COMPLETED',
      },
      select: {
        amount: true,
      },
    });

    const totalPayouts = completedPayouts.reduce(
      (sum, payout) => sum + Number(payout.amount),
      0
    );

    // Available balance = total revenue - total fees - total payouts
    const availableBalance = totalRevenue - totalFees - totalPayouts;
    // Pending balance = revenue from recent orders (last 7 days) - fees for those orders
    const pendingBalance = Math.max(0, pendingRevenue - pendingFees);

    return {
      totalRevenue,
      platformFee: totalPlatformFee,
      paystackFee: totalPaystackFee,
      totalFees,
      totalPayouts,
      availableBalance: Math.max(0, availableBalance),
      pendingBalance: Math.max(0, pendingBalance),
      ticketsSold: ticketsSoldSoFar,
      freeTicketsRemaining: Math.max(0, this.freeTicketsThreshold - ticketsSoldSoFar),
      currency: 'NGN',
    };
  }

  /**
   * Create a transfer recipient (bank account) in Paystack
   */
  async setupBankAccount(accountDetails: {
    type: 'nuban';
    name: string;
    account_number: string;
    bank_code: string;
    currency?: 'NGN';
  }) {
    try {
      const response = await this.paystackService.createTransferRecipient(accountDetails);
      return response;
    } catch (error: any) {
      console.error('Error creating transfer recipient:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to setup bank account');
    }
  }

  /**
   * Initiate a payout transfer via Paystack
   */
  async initiateTransfer(data: {
    source: 'balance';
    amount: number; // in kobo
    recipient: string; // recipient code from Paystack
    reason: string;
  }) {
    try {
      const axios = require('axios');
      const response = await axios.post(
        'https://api.paystack.co/transfer',
        data,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error initiating transfer:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initiate payout transfer');
    }
  }

  /**
   * Verify a transfer status via Paystack.
   * Useful as a fallback when webhooks are not available.
   */
  async verifyTransfer(referenceOrCode: string) {
    try {
      const axios = require('axios');
      const response = await axios.get(
        `https://api.paystack.co/transfer/verify/${referenceOrCode}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          timeout: 30000,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error verifying transfer:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify transfer');
    }
  }

  /**
   * Get minimum payout threshold (default ₦10,000)
   */
  getMinimumPayoutThreshold(): number {
    return parseFloat(process.env.MINIMUM_PAYOUT_THRESHOLD || '10000');
  }
}
