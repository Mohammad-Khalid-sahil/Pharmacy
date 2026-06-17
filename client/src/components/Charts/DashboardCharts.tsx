// lightweight chart wrapper component (no default React import required)
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardLegend from '../DashboardLegend';
import { Flex } from 'antd';
import Loader from '../Loader';

type Props = {
  dailyChartData: any[];
  monthlyChartData: any[];
  expenseChartData: any[];
  topMedicineData: any[];
  chartMargin: any;
  chartGrid: string;
  chartTick: string;
  legendItems: any;
  titles: {
    daily: string;
    monthly: string;
    expense: string;
    bestSelling: string;
  };
  labels: {
    revenue: string;
    quantity: string;
    profit: string;
    expense: string;
  };
  formatChartValue: (v: unknown, n: unknown) => any;
  money: (v?: number) => string;
  formatNumber: (v?: number) => string;
  isRTL?: boolean;
};

const DashboardCharts = ({
  dailyChartData,
  monthlyChartData,
  expenseChartData,
  topMedicineData,
  chartMargin,
  chartGrid,
  chartTick,
  legendItems,
  titles,
  labels,
  formatChartValue,
  money,
  formatNumber,
  isRTL,
}: Props) => {
  if (!dailyChartData) return <Flex><Loader /></Flex>;

  return (
    <div className='dashboard-chart-grid'>
      <div className='dashboard-chart-card'>
        <h2>{titles.daily}</h2>
        <ResponsiveContainer width='100%' height={300}>
          <AreaChart data={dailyChartData} margin={chartMargin}>
            <defs>
              <linearGradient id='dailySalesGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.32} />
                <stop offset='95%' stopColor='var(--color-primary)' stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id='dailyQuantityGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-blue)' stopOpacity={0.24} />
                <stop offset='95%' stopColor='var(--color-blue)' stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id='monthlySalesGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.5} />
                <stop offset='95%' stopColor='var(--color-primary)' stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id='monthlyProfitGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-blue)' stopOpacity={0.45} />
                <stop offset='95%' stopColor='var(--color-blue)' stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id='expenseGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-warning)' stopOpacity={0.42} />
                <stop offset='95%' stopColor='var(--color-warning)' stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id='topRevenueGradient' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%' stopColor='var(--color-blue)' stopOpacity={0.85} />
                <stop offset='100%' stopColor='var(--color-blue)' stopOpacity={0.45} />
              </linearGradient>
              <linearGradient id='topQuantityGradient' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%' stopColor='var(--color-primary)' stopOpacity={0.78} />
                <stop offset='100%' stopColor='var(--color-primary)' stopOpacity={0.28} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} vertical={false} />
            <XAxis dataKey='name' tickMargin={10} interval='preserveStartEnd' tick={{ fill: chartTick, fontSize: 12 }} />
            <YAxis yAxisId='money' width={104} tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
            <YAxis yAxisId='count' orientation='right' width={62} tickFormatter={(value) => formatNumber(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
            <Tooltip cursor={{ stroke: chartGrid, strokeOpacity: 0.25 }} formatter={formatChartValue} />
            <Area yAxisId='money' type='monotone' dataKey='sales' name={labels.revenue} stroke='var(--color-primary)' fill='url(#dailySalesGradient)' strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            <Area yAxisId='count' type='monotone' dataKey='quantity' name={labels.quantity} stroke='var(--color-blue)' fill='url(#dailyQuantityGradient)' strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
        <DashboardLegend items={legendItems.daily} />
      </div>

      <div className='dashboard-chart-card'>
        <h2>{titles.monthly}</h2>
        <ResponsiveContainer width='100%' height={300}>
          <BarChart data={monthlyChartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} vertical={false} />
            <XAxis dataKey='name' tickMargin={10} interval='preserveStartEnd' tick={{ fill: chartTick, fontSize: 12 }} />
            <YAxis width={104} tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
            <Tooltip cursor={{ stroke: chartGrid, strokeOpacity: 0.15 }} formatter={formatChartValue} />
            <Bar dataKey='sales' name={labels.revenue} fill='url(#monthlySalesGradient)' radius={[8, 8, 0, 0]} />
            <Bar dataKey='profit' name={labels.profit} fill='url(#monthlyProfitGradient)' radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <DashboardLegend items={legendItems.monthly} />
      </div>

      <div className='dashboard-chart-card'>
        <h2>{titles.expense}</h2>
        <ResponsiveContainer width='100%' height={300}>
          <BarChart data={expenseChartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} vertical={false} />
            <XAxis dataKey='name' tickMargin={10} interval='preserveStartEnd' tick={{ fill: chartTick, fontSize: 12 }} />
            <YAxis width={104} tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
            <Tooltip cursor={{ stroke: chartGrid, strokeOpacity: 0.15 }} formatter={(value, name) => [money(Number(value || 0)), String(name)]} />
            <Bar dataKey='value' name={labels.expense} fill='url(#expenseGradient)' radius={[8, 8, 0, 0]} minPointSize={4} />
          </BarChart>
        </ResponsiveContainer>
        <DashboardLegend items={legendItems.expense} />
      </div>

      <div className='dashboard-chart-card'>
        <h2>{titles.bestSelling}</h2>
        <ResponsiveContainer width='100%' height={360}>
          <BarChart data={topMedicineData} layout='vertical' margin={{ top: 18, right: isRTL ? 18 : 28, left: isRTL ? 28 : 18, bottom: 24 }}>
            <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} vertical={false} />
            <XAxis xAxisId='revenue' type='number' tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
            <XAxis xAxisId='quantity' type='number' hide />
            <YAxis type='category' dataKey='name' width={190} tickMargin={10} tick={{ fill: chartTick, fontSize: 12 }} />
            <Tooltip cursor={{ stroke: chartGrid, strokeOpacity: 0.22 }} formatter={formatChartValue} />
            <Bar xAxisId='revenue' dataKey='revenue' name={labels.revenue} fill='url(#topRevenueGradient)' radius={[0, 8, 8, 0]} minPointSize={4} />
            <Bar xAxisId='quantity' dataKey='quantity' name={labels.quantity} fill='url(#topQuantityGradient)' radius={[0, 8, 8, 0]} minPointSize={4} />
          </BarChart>
        </ResponsiveContainer>
        <DashboardLegend items={legendItems.bestSelling} />
      </div>
    </div>
  );
};

export default DashboardCharts;
