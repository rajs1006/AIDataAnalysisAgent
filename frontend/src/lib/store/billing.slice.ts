import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BillingData } from '../types/billing';

interface BillingState {
  metrics: BillingData | null;
  loading: boolean;
  error: string | null;
}

const initialState: BillingState = {
  metrics: null,
  loading: false,
  error: null,
};

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    setBillingMetrics: (state, action: PayloadAction<BillingData>) => {
      state.metrics = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearBillingMetrics: (state) => {
      state.metrics = null;
      state.loading = false;
      state.error = null;
    }
  }
});

export const { 
  setBillingMetrics, 
  setLoading, 
  setError, 
  clearBillingMetrics 
} = billingSlice.actions;

export default billingSlice.reducer;
