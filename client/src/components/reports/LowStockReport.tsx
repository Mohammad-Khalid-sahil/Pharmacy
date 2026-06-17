import { Table } from 'antd';
import { useGetLowStockAlertsQuery } from '../../redux/features/management/productApi';
import { useLanguage } from '../../i18n/LanguageContext';
import ReportSection from './ReportSection';
import { formatReportNumber } from '../../utils/reportHelpers';

const LowStockReport = () => {
  const { t, language } = useLanguage();
  const { data, isFetching } = useGetLowStockAlertsQuery(undefined);
  const rows = data?.data || [];

  return (
    <ReportSection
      title={t('reportLowStock')}
      loading={isFetching}
      range={{}}
      onRangeChange={() => {}}
      showDateFilter={false}
      summary={[{ label: t('products'), value: rows.length, type: 'number' }]}
    >
      <Table
        size='small'
        rowKey='_id'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('productName'), dataIndex: 'name', key: 'name' },
          { title: t('stock'), dataIndex: 'stock', key: 'stock', align: 'center', render: (v: number) => formatReportNumber(v, language) },
          { title: t('minStock'), dataIndex: 'minStock', key: 'minStock', align: 'center', render: (v: number) => formatReportNumber(v, language) },
          { title: t('sellerName'), dataIndex: 'sellerName', key: 'sellerName', render: (v: string) => v || '-' },
        ]}
      />
    </ReportSection>
  );
};

export default LowStockReport;
