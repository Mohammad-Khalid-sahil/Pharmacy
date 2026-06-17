import { PrinterOutlined } from '@ant-design/icons';
import { Alert, Button, Col, DatePicker, Empty, Flex, Row, Spin, Statistic } from 'antd';
import { ReactNode } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { DateRange, ReportSummaryItem, formatSummaryValue } from '../../utils/reportHelpers';

const { RangePicker } = DatePicker;

type ReportSectionProps = {
  title: string;
  loading?: boolean;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  showDateFilter?: boolean;
  extraFilters?: ReactNode;
  summary?: ReportSummaryItem[];
  error?: unknown;
  isEmpty?: boolean;
  children: ReactNode;
};

const ReportSection = ({
  title,
  loading,
  onRangeChange,
  showDateFilter = true,
  extraFilters,
  summary,
  error,
  isEmpty,
  children,
}: ReportSectionProps) => {
  const { t, language } = useLanguage();

  const handlePrint = async () => {
    if (window.pharmacyReport?.savePdf) {
      await window.pharmacyReport.savePdf(`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.pdf`);
      return;
    }
    window.print();
  };

  return (
    <div className='report-print-area'>
      <Flex
        className='report-section-header no-print'
        justify='space-between'
        align='center'
        wrap='wrap'
        gap={12}
      >
        <h2>{title}</h2>
        <Button type='primary' className='btn-role-print' icon={<PrinterOutlined />} onClick={handlePrint}>
          {t('print')}
        </Button>
      </Flex>

      <Flex className='report-filter-row no-print' gap={12} wrap='wrap'>
        {showDateFilter && (
          <RangePicker
            size='large'
            className='report-date-filter'
            onChange={(dates) =>
              onRangeChange({
                from: dates?.[0]?.format('YYYY-MM-DD'),
                to: dates?.[1]?.format('YYYY-MM-DD'),
              })
            }
          />
        )}
        {extraFilters}
      </Flex>

      {summary && summary.length > 0 && (
        <Row gutter={[12, 12]} className='report-summary-row'>
          {summary.map((item) => (
            <Col xs={12} sm={8} md={6} key={item.label}>
              <div className={`report-summary-card report-summary-card--${item.type || 'text'}`}>
                <Statistic title={item.label} value={formatSummaryValue(item, language)} />
              </div>
            </Col>
          ))}
        </Row>
      )}

      {error ? (
        <Alert type='error' showIcon message={t('reportLoadError')} />
      ) : loading ? (
        <Flex justify='center' className='report-loading'>
          <Spin />
        </Flex>
      ) : isEmpty ? (
        <Empty description={t('noReportData')} />
      ) : (
        children
      )}
    </div>
  );
};

export default ReportSection;
