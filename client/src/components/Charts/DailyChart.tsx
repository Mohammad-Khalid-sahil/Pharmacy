import { Flex } from 'antd';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDailySaleQuery } from '../../redux/features/management/saleApi';
import Loader from '../Loader';
import { useLanguage } from '../../i18n/LanguageContext';
import DashboardLegend from '../DashboardLegend';
import { formatCurrencyByLanguage, formatDateByLanguage, formatNumberByLanguage } from '../../utils/formatters';

export default function DailyChart() {
  const { t, language } = useLanguage();
  const { data: dailyData, isLoading } = useDailySaleQuery(undefined);

  if (isLoading)
    return (
      <Flex>
        <Loader />
      </Flex>
    );

  const data = dailyData?.data.map(
    (item: {
      day: number;
      month: number;
      year: number;
      totalRevenue: number;
      totalQuantity: number;
    }) => ({
      name: formatDateByLanguage(new Date(item.year, item.month - 1, item.day), language, { month: 'short', day: 'numeric' }),
      revenue: item.totalRevenue,
      quantity: item.totalQuantity,
    })
  );

  return (
    <>
      <ResponsiveContainer width='100%' height={300}>
        <AreaChart
          width={500}
          height={400}
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='name' />
          <YAxis tickFormatter={(value) => formatNumberByLanguage(value, language)} />
          <Tooltip formatter={(value: number, name: string) => [name === 'quantity' ? formatNumberByLanguage(value, language) : formatCurrencyByLanguage(value, language), name]} />
          <Area type='monotone' dataKey='revenue' stroke='#8884d8' fill='#164863' name={t ? t('totalRevenue') : 'Revenue'} />
          <Area type='monotone' dataKey='quantity' stroke='#8884d8' fill='#164863' name={t ? t('quantity') : 'Quantity'} />
        </AreaChart>
      </ResponsiveContainer>
      <DashboardLegend items={[
        { label: t ? t('totalRevenue') : 'Revenue', color: '#164863' },
        { label: t ? t('quantity') : 'Quantity', color: '#164863' },
      ]} />
    </>
  );
}
