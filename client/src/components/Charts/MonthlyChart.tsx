import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMonthlySaleQuery } from '../../redux/features/management/saleApi';
import { Flex } from 'antd';
import Loader from '../Loader';
import { useLanguage } from '../../i18n/LanguageContext';
import DashboardLegend from '../DashboardLegend';
import { formatCurrencyByLanguage, formatDateByLanguage, formatNumberByLanguage } from '../../utils/formatters';

const MonthlyChart = () => {
  const { t, language } = useLanguage();
  const { data: monthlyData, isLoading } = useMonthlySaleQuery(undefined);

  if (isLoading)
    return (
      <Flex>
        <Loader />
      </Flex>
    );

  const data = monthlyData?.data.map(
    (item: { month: number; year: number; totalRevenue: number }) => ({
      name: formatDateByLanguage(new Date(item.year, item.month - 1, 1), language, { month: 'short', year: 'numeric' }),
      revenue: item.totalRevenue,
    })
  );

  return (
    <>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='name' />
          <YAxis tickFormatter={(value) => formatNumberByLanguage(value, language)} />
          <Tooltip formatter={(value: number) => formatCurrencyByLanguage(value, language)} />
          <Bar dataKey='revenue' fill='#164863' name={t ? t('totalRevenue') : 'Revenue'} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={[{ label: t ? t('totalRevenue') : 'Revenue', color: '#164863' }]} />
    </>
  );
};

export default MonthlyChart;
