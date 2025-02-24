import React, { useState, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ChartOptions,
  ChartData,
  ScaleOptionsByType,
  CartesianScaleTypeRegistry
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import { useGetBillingMetricsQuery } from '@/hooks/use-billing-metrics';
import { TimeSeriesEntry } from '@/lib/types/billing';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type TimeFrame = 'hourly' | 'daily' | 'monthly';
type ChartType = 'line' | 'bar';
type MetricType = 'tokens' | 'cost';

export function BillingMetrics() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [metricType, setMetricType] = useState<MetricType>('tokens');

  const { 
    data: billingData, 
    isLoading, 
    isError, 
    refetch 
  } = useGetBillingMetricsQuery();

  const lineChartData = useMemo<ChartData<'line', number[], string>>(() => {
    if (!billingData) return { labels: [], datasets: [] };

    const timeSeriesData: TimeSeriesEntry[] = billingData.time_series_data[timeFrame];
    
    const labels = timeSeriesData.map(entry => 
      entry.timestamp 
        ? format(parseISO(entry.timestamp), 'MMM dd, HH:mm')
        : entry.date || entry.month || ''
    );

    const promptData = timeSeriesData.map(entry => 
      metricType === 'tokens' 
        ? entry.total_tokens.prompt_tokens 
        : entry.cost.prompt_cost
    );

    const completionData = timeSeriesData.map(entry => 
      metricType === 'tokens'
        ? entry.total_tokens.completion_tokens
        : entry.cost.completion_cost
    );

    return {
      labels,
      datasets: [
        {
          label: 'Prompt',
          data: promptData,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3B82F6',
          tension: 0.4
        },
        {
          label: 'Completion',
          data: completionData,
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: '#10B981',
          tension: 0.4
        }
      ]
    };
  }, [billingData, timeFrame, metricType]);

  const barChartData = useMemo<ChartData<'bar', number[], string>>(() => {
    if (!billingData) return { labels: [], datasets: [] };

    const timeSeriesData: TimeSeriesEntry[] = billingData.time_series_data[timeFrame];
    
    const labels = timeSeriesData.map(entry => 
      entry.timestamp 
        ? format(parseISO(entry.timestamp), 'MMM dd, HH:mm')
        : entry.date || entry.month || ''
    );

    const promptData = timeSeriesData.map(entry => 
      metricType === 'tokens' 
        ? entry.total_tokens.prompt_tokens 
        : entry.cost.prompt_cost
    );

    const completionData = timeSeriesData.map(entry => 
      metricType === 'tokens'
        ? entry.total_tokens.completion_tokens
        : entry.cost.completion_cost
    );

    return {
      labels,
      datasets: [
        {
          label: 'Prompt',
          data: promptData,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3B82F6'
        },
        {
          label: 'Completion',
          data: completionData,
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: '#10B981'
        }
      ]
    };
  }, [billingData, timeFrame, metricType]);

  const chartOptions: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear',
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            const numValue = Number(value);
            return metricType === 'tokens' 
              ? numValue.toLocaleString() 
              : `$${numValue.toFixed(2)}`;
          }
        }
      }
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return metricType === 'tokens'
              ? `${label}: ${value.toLocaleString()} tokens`
              : `${label}: $${value.toFixed(2)}`;
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Loading billing metrics...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">Failed to load billing metrics</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingData?.overall_stats.total_tokens.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${billingData?.overall_stats.total_cost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Tokens/Request</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingData?.overall_stats.average_tokens_per_request.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingData?.overall_stats.total_requests.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Tabs defaultValue="tokens">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="tokens" 
            onClick={() => setMetricType('tokens')}
          >
            Token Usage
          </TabsTrigger>
          <TabsTrigger 
            value="cost" 
            onClick={() => setMetricType('cost')}
          >
            Cost Analysis
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Time Frame and Chart Type Controls */}
      <div className="flex justify-between">
        <div className="space-x-2">
          {(['hourly', 'daily', 'monthly'] as TimeFrame[]).map(frame => (
            <Button
              key={frame}
              variant={timeFrame === frame ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFrame(frame)}
            >
              {frame.charAt(0).toUpperCase() + frame.slice(1)}
            </Button>
          ))}
        </div>
        <div className="space-x-2">
          {(['line', 'bar'] as ChartType[]).map(type => (
            <Button
              key={type}
              variant={chartType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Chart
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        {chartType === 'line' ? (
          <Line data={lineChartData} options={chartOptions} />
        ) : (
          <Bar data={barChartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
