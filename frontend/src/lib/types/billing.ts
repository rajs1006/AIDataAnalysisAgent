export interface TokenMetrics {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface CostMetrics {
  prompt_cost: number;
  completion_cost: number;
  total_cost: number;
}

export interface ModelUsage {
  requests: number;
  tokens: number;
  cost: number;
}

export interface TimeSeriesEntry {
  timestamp?: string;
  date?: string;
  month?: string;
  total_tokens: TokenMetrics;
  cost: CostMetrics;
  models_used: Record<string, ModelUsage>;
}

export interface BillingData {
  overall_stats: {
    total_tokens: number;
    total_cost: number;
    average_tokens_per_request: number;
    total_requests: number;
  };
  time_series_data: {
    hourly: TimeSeriesEntry[];
    daily: TimeSeriesEntry[];
    monthly: TimeSeriesEntry[];
  };
}
