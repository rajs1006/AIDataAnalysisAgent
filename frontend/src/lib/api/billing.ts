import { api } from '../utils/axios-interceptor';
import { BillingData } from '../types/billing';

export const getBillingMetrics = async (): Promise<BillingData> => {
  try {
    const response = await api.get('/billing/');
    return response.data;
  } catch (error) {
    console.error('Error fetching billing metrics:', error);
    throw error;
  }
};
