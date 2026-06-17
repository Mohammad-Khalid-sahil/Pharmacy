import { Table, TableColumnsType } from 'antd';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatReportMoney, formatReportNumber, periodLabel } from '../../utils/reportHelpers';

interface IData {
  _id: string;
  day?: number;
  month?: number;
  week?: number;
  year: number;
  totalQuantity: number;
  totalRevenue: number;
}

const HistoryTable = ({ data, isFetching }: { data?: { data: IData[] }; isFetching: boolean }) => {
  const { t, language } = useLanguage();
  const columns: TableColumnsType<any> = [
    { title: t('dateYear'), key: 'date', dataIndex: 'date' },
    { title: t('totalSellQuantity'), key: 'totalQuantity', dataIndex: 'totalQuantity', align: 'center', render: (v: number) => formatReportNumber(v, language) },
    { title: t('totalRevenueLabel'), key: 'totalRevenue', dataIndex: 'totalRevenue', align: 'right', render: (v: number) => formatReportMoney(v, language) },
  ];
  const tableData = data?.data?.map((row: IData) => ({
    key: row._id,
    date: periodLabel({ year: row.year, week: row.week, month: row.month, day: row.day }, language),
    totalQuantity: row.totalQuantity,
    totalRevenue: row.totalRevenue,
  }));

  return (
    <Table
      size='small'
      loading={isFetching}
      columns={columns}
      dataSource={tableData}
      pagination={false}
      scroll={{ x: 640 }}
    />
  );
};

export default HistoryTable;
