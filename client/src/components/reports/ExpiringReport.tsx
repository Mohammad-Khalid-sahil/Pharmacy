import { InputNumber, Table } from 'antd';
import { useState } from 'react';
import { useGetExpiringAlertsQuery } from '../../redux/features/management/productApi';
import { useLanguage } from '../../i18n/LanguageContext';
import ReportSection from './ReportSection';
import formatDate from '../../utils/formatDate';
import { formatReportNumber } from '../../utils/reportHelpers';

const ExpiringReport = () => {
  const { t, language } = useLanguage();
  const [days, setDays] = useState(30);
  const { data, isFetching } = useGetExpiringAlertsQuery(days);
  const rows = data?.data || [];

  return (
    <ReportSection
      title={t('reportExpiring')}
      loading={isFetching}
      range={{}}
      onRangeChange={() => {}}
      showDateFilter={false}
      extraFilters={
        <InputNumber
          min={1}
          max={365}
          value={days}
          onChange={(v) => setDays(Number(v) || 30)}
          addonBefore={t('days')}
        />
      }
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
          { title: t('expireDate'), dataIndex: 'expireDate', key: 'expireDate', render: (v: string) => formatDate(v, language) },
        ]}
      />
    </ReportSection>
  );
};

export default ExpiringReport;
