import { DeleteFilled, FileTextOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Pagination, Popconfirm, Row, Statistic, Table } from 'antd';
import { useState } from 'react';
import SearchInput from '../components/SearchInput';
import {
  useDeletePrescriptionMutation,
  useGetPrescriptionsQuery,
} from '../redux/features/management/prescriptionApi';
import { useLanguage } from '../i18n/LanguageContext';
import formatDate from '../utils/formatDate';
import toastMessage from '../lib/toastMessage';
import PrescriptionDetailModal from '../components/prescription/PrescriptionDetailModal';
import { IPrescription } from '../types/prescription.types';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../utils/formatters';

const PrescriptionManagementPage = () => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data, isFetching, refetch } = useGetPrescriptionsQuery(query);
  const [deletePrescription] = useDeletePrescriptionMutation();
  const prescriptions = data?.data || [];
  const totalPrescriptionAmount = prescriptions.reduce(
    (total: number, row: IPrescription) => total + Number(row.totalAmount || 0),
    0,
  );

  const onDelete = async (id: string) => {
    try {
      const res = await deletePrescription(id).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('prescriptionDeleteFailed') });
    }
  };

  const columns = [
    {
      title: t('date'),
      key: 'date',
      render: (_: unknown, row: IPrescription) => formatDate(row.createdAt || '', language),
    },
    {
      title: t('patientName'),
      dataIndex: 'patientName',
      key: 'patientName',
      render: (v: string, row: IPrescription) => v || row.customerName || '-',
    },
    {
      title: t('doctorName'),
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (v: string) => v || '-',
    },
    {
      title: t('totalAmount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'center' as const,
      render: (value: number) => <span className='prescription-money'>{formatCurrencyByLanguage(value, language)}</span>,
    },
    {
      title: t('items'),
      key: 'items',
      align: 'center' as const,
      render: (_: unknown, row: IPrescription) => formatNumberByLanguage(row.items?.length ?? 0, language),
    },
    {
      title: t('action'),
      key: 'action',
      render: (_: unknown, row: IPrescription) => (
        <Flex gap={8} className='table-actions' justify='center' wrap>
          <Button size='middle' className='btn-role-view' icon={<FileTextOutlined />} onClick={() => setDetailId(row._id)}>
            {t('view')}
          </Button>
          <Popconfirm
            title={t('deletePrescriptionConfirm')}
            onConfirm={() => onDelete(row._id)}
            okText={t('delete')}
            cancelText={t('close')}
            okButtonProps={{ danger: true, className: 'btn-role-delete' }}
            cancelButtonProps={{ className: 'btn-role-neutral' }}
          >
            <Button size='middle' danger className='btn-role-delete' icon={<DeleteFilled />}>
              {t('delete')}
            </Button>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <div className='secondary-page prescription-page page-fade-in'>
      <Flex className='secondary-page-header prescription-page-header' justify='space-between' align='center' wrap='wrap' gap={16}>
        <div>
          <span>{t('prescriptions')}</span>
          <h1>{t('prescriptionHistory')}</h1>
          <p>{t('prescriptionDetails')}</p>
        </div>
        <MedicineBoxOutlined />
      </Flex>

      <Row gutter={[14, 14]} className='secondary-summary-row'>
        <Col xs={24} md={6}>
          <div className='secondary-summary-card is-total'>
            <Statistic title={t('prescriptions')} value={formatNumberByLanguage(data?.meta?.total || prescriptions.length, language)} />
          </div>
        </Col>
        <Col xs={24} md={6}>
          <div className='secondary-summary-card is-info'>
            <Statistic title={t('items')} value={formatNumberByLanguage(prescriptions.reduce((sum: number, row: IPrescription) => sum + (row.items?.length || 0), 0), language)} />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className='secondary-summary-card is-success'>
            <Statistic title={t('totalAmount')} value={formatCurrencyByLanguage(totalPrescriptionAmount, language)} />
          </div>
        </Col>
      </Row>

      <Flex justify='space-between' align='center' className='secondary-toolbar' wrap='wrap' gap={12}>
        <div>
          <h2>{t('prescriptionHistory')}</h2>
          <p>{t('searchPrescription')}</p>
        </div>
        <Flex gap={8} className='secondary-search-control'>
          <SearchInput
            placeholder={t('searchPrescription')}
            setQuery={setQuery}
            value={searchInput}
            onChange={setSearchInput}
          />
        </Flex>
      </Flex>

      <div className='secondary-table-card'>
        <Table
          size='middle'
          loading={isFetching}
          columns={columns}
          dataSource={prescriptions}
          rowKey='_id'
          pagination={false}
          scroll={{ x: 860 }}
        />
      </div>
      <Flex justify='center' style={{ marginTop: '1rem' }}>
        <Pagination
          current={query.page}
          pageSize={query.limit}
          total={data?.meta?.total || 0}
          onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      </Flex>

      <PrescriptionDetailModal
        prescriptionId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
};

export default PrescriptionManagementPage;
