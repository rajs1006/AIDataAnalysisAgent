import React from 'react';
import { BillingData } from '../lib/types/billing';
import { getBillingMetrics } from '../lib/api/billing';

export const useGetBillingMetricsQuery = () => {
  const [data, setData] = React.useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [error, setError] = React.useState<any>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getBillingMetrics();
      setData(result);
      setIsLoading(false);
    } catch (err) {
      setIsError(true);
      setError(err);
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => fetchData();

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
};
