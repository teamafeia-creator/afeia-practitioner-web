/**
 * Subscription API Service
 */

import apiClient from './client';
import type { Subscription, SubscriptionPlan } from '@/types';

export const subscriptionApi = {
  /**
   * Get current subscription status
   */
  async getStatus(): Promise<{
    isPremium: boolean;
    subscription: Subscription | null;
  }> {
    const response = await apiClient.get<{
      isPremium: boolean;
      subscription: Subscription | null;
    }>('/subscription/status');
    return response.data;
  },

  /**
   * Create Stripe checkout session
   */
  async createCheckout(plan: 'premium_monthly' | 'premium_yearly'): Promise<{
    checkoutUrl: string;
  }> {
    const response = await apiClient.post<{ checkoutUrl: string }>(
      '/subscription/create-checkout',
      { plan }
    );
    return response.data;
  },

  /**
   * Cancel subscription
   */
  async cancel(): Promise<{ success: boolean; endsAt: string }> {
    const response = await apiClient.post<{ success: boolean; endsAt: string }>(
      '/subscription/cancel'
    );
    return response.data;
  },

  /**
   * Reactivate cancelled subscription
   */
  async reactivate(): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/subscription/reactivate');
    return response.data;
  },

  /**
   * Get billing portal URL
   */
  async getBillingPortalUrl(): Promise<{ url: string }> {
    const response = await apiClient.get<{ url: string }>('/subscription/billing-portal');
    return response.data;
  },
};
