import {
  DeleteFilled,
  DollarOutlined,
  EditFilled,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Button, Col, Flex, Form, Modal, Pagination, Popconfirm, Row, Statistic, Table, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import SearchInput from '../components/SearchInput';
import EmployeeFormFields from '../components/employee/EmployeeFormFields';
import SalaryPayModal from '../components/employee/SalaryPayModal';
import SalaryPaymentHistoryTable from '../components/employee/SalaryPaymentHistoryTable';
import { useLanguage } from '../i18n/LanguageContext';
import toastMessage from '../lib/toastMessage';
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
} from '../redux/features/management/employeeApi';
import { useGetSalaryPaymentsQuery } from '../redux/features/management/salaryPaymentApi';
import { EmployeePayload, IEmployee } from '../types/employee.types';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../utils/formatters';

const isThisMonth = (date?: string) => {
  if (!date) return false;
  const value = new Date(date);
  const today = new Date();
  return value.getFullYear() === today.getFullYear() && value.getMonth() === today.getMonth();
};

const toPayload = (values: Record<string, unknown>): EmployeePayload => ({
  name: String(values.name).trim(),
  ...(values.phone ? { phone: String(values.phone).trim() } : {}),
  ...(values.position ? { position: String(values.position).trim() } : {}),
  ...(values.salary != null && values.salary !== '' ? { salary: Number(values.salary) } : {}),
  ...(values.address ? { address: String(values.address).trim() } : {}),
  ...(values.note ? { note: String(values.note).trim() } : {}),
  ...(values.status ? { status: values.status as EmployeePayload['status'] } : {}),
});

const EmployeeManagementPage = () => {
  const { t, language } = useLanguage();
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const formatMoney = (value: number | undefined) =>
    value != null ? formatCurrencyByLanguage(value, language) : '-';
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<IEmployee | null>(null);
  const [paySalaryEmployee, setPaySalaryEmployee] = useState<IEmployee | null>(null);
  const [paySalaryOpen, setPaySalaryOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isFetching, refetch } = useGetEmployeesQuery(query);
  const { data: allEmployees } = useGetEmployeesQuery({ limit: 500 });
  const { data: salaryPayments } = useGetSalaryPaymentsQuery({ limit: 500 });
  const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  useEffect(() => {
    if (!editEmployee) return;
    editForm.setFieldsValue({
      name: editEmployee.name,
      phone: editEmployee.phone,
      position: editEmployee.position,
      salary: editEmployee.salary,
      address: editEmployee.address,
      note: editEmployee.note,
      status: editEmployee.status,
    });
  }, [editEmployee, editForm]);

  const summary = useMemo(() => {
    const employees = allEmployees?.data || [];
    const payments = salaryPayments?.data || [];

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((employee: IEmployee) => employee.status !== 'INACTIVE').length,
      monthlySalaryPaid: payments
        .filter((payment: { paymentDate?: string; createdAt?: string }) =>
          isThisMonth(payment.paymentDate || payment.createdAt),
        )
        .reduce((sum: number, payment: { amount?: number }) => sum + Number(payment.amount || 0), 0),
    };
  }, [allEmployees?.data, salaryPayments?.data]);

  const onCreate = async () => {
    const values = await createForm.validateFields();
    try {
      const res = await createEmployee(toPayload(values)).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      setCreateOpen(false);
      createForm.resetFields();
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('employeeSaveFailed') });
    }
  };

  const onUpdate = async () => {
    if (!editEmployee) return;
    const values = await editForm.validateFields();
    try {
      const res = await updateEmployee({ id: editEmployee._id, payload: toPayload(values) }).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      setEditEmployee(null);
      editForm.resetFields();
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('employeeSaveFailed') });
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await deleteEmployee(id).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('employeeDeleteFailed') });
    }
  };

  const columns = [
    { title: t('name'), dataIndex: 'name', key: 'name', render: (value: string) => <strong>{value}</strong> },
    { title: t('phone'), dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
    { title: t('position'), dataIndex: 'position', key: 'position', render: (v: string) => v || '-' },
    {
      title: t('salary'),
      dataIndex: 'salary',
      key: 'salary',
      align: 'center' as const,
      render: (v: number) => <span className='employee-money'>{formatMoney(v)}</span>,
    },
    {
      title: t('status'),
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (v: string) => (
        <Tag color={v === 'INACTIVE' ? 'error' : 'success'} className='employee-status-tag'>
          {v === 'INACTIVE' ? t('statusInactive') : t('statusActive')}
        </Tag>
      ),
    },
    {
      title: t('action'),
      key: 'action',
      align: 'center' as const,
      render: (_: unknown, row: IEmployee) => (
        <Flex gap={8} className='table-actions employee-table-actions' justify='center' wrap>
          <Button
            size='middle'
            type='primary'
            icon={<DollarOutlined />}
            className='btn-role-pay'
            onClick={() => setPaySalaryEmployee(row)}
          >
            {t('paySalary')}
          </Button>
          <Button
            size='middle'
            type='primary'
            icon={<EditFilled />}
            className='btn-role-edit'
            onClick={() => setEditEmployee(row)}
          >
            {t('update')}
          </Button>
          <Popconfirm
            title={t('deleteEmployeeConfirm')}
            onConfirm={() => onDelete(row._id)}
            okText={t('delete')}
            cancelText={t('close')}
            okButtonProps={{ danger: true, className: 'btn-role-delete' }}
            cancelButtonProps={{ className: 'btn-role-neutral' }}
          >
            <Button size='middle' type='primary' icon={<DeleteFilled />} className='btn-role-delete'>
              {t('delete')}
            </Button>
          </Popconfirm>
        </Flex>
      ),
      width: 300,
    },
  ];

  return (
    <div className='employee-page page-fade-in'>
      <div className='employee-page-header'>
        <div>
          <span>{t('employeePageSubtitle')}</span>
          <h1>{t('employees')}</h1>
          <p>{t('employeePageDescription')}</p>
        </div>
        <TeamOutlined />
      </div>

      <Row gutter={[14, 14]} className='employee-summary-row'>
        <Col xs={24} md={8}>
          <div className='employee-summary-card is-total'>
            <Statistic title={t('totalEmployees')} value={formatNumber(summary.totalEmployees)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='employee-summary-card is-active'>
            <Statistic title={t('activeEmployees')} value={formatNumber(summary.activeEmployees)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='employee-summary-card is-salary'>
            <Statistic title={t('monthlySalaryPaid')} value={formatMoney(summary.monthlySalaryPaid)} />
          </div>
        </Col>
      </Row>

      <div className='employee-toolbar'>
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <Flex gap={8} className='employee-search-actions'>
            <SearchInput
              placeholder={t('searchEmployee')}
              setQuery={setQuery}
              value={searchInput}
              onChange={setSearchInput}
            />
          </Flex>
          <Flex gap={8} className='employee-main-actions'>
            <Button type='primary' icon={<DollarOutlined />} className='btn-role-pay' onClick={() => setPaySalaryOpen(true)}>
              {t('paySalary')}
            </Button>
            <Button type='primary' icon={<PlusOutlined />} className='btn-role-create' onClick={() => setCreateOpen(true)}>
              {t('createEmployee')}
            </Button>
          </Flex>
        </Flex>
      </div>

      <div className='employee-table-card'>
        <Table
          size='middle'
          loading={isFetching}
          columns={columns}
          dataSource={data?.data || []}
          rowKey='_id'
          pagination={false}
          scroll={{ x: 950 }}
        />
      </div>

      <Flex justify='center' className='employee-pagination'>
        <Pagination
          current={query.page}
          pageSize={query.limit}
          total={data?.meta?.total || 0}
          onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      </Flex>

      <Modal
        title={t('createEmployee')}
        open={createOpen}
        onOk={onCreate}
        okText={t('submit')}
        cancelText={t('cancel')}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        confirmLoading={creating}
        destroyOnClose
        className='employee-form-modal'
      >
        <Form form={createForm} layout='vertical' className='employee-modal-form'>
          <EmployeeFormFields />
        </Form>
      </Modal>

      <Modal
        title={t('editEmployee')}
        open={!!editEmployee}
        onOk={onUpdate}
        okText={t('update')}
        cancelText={t('cancel')}
        onCancel={() => {
          setEditEmployee(null);
          editForm.resetFields();
        }}
        confirmLoading={updating}
        destroyOnClose
        className='employee-form-modal'
      >
        <Form form={editForm} layout='vertical' className='employee-modal-form'>
          <EmployeeFormFields />
        </Form>
      </Modal>

      <SalaryPayModal
        open={!!paySalaryEmployee || paySalaryOpen}
        presetEmployee={
          paySalaryEmployee
            ? {
                id: paySalaryEmployee._id,
                name: paySalaryEmployee.name,
                salary: paySalaryEmployee.salary,
              }
            : null
        }
        onClose={() => {
          setPaySalaryEmployee(null);
          setPaySalaryOpen(false);
        }}
      />

      <SalaryPaymentHistoryTable />
    </div>
  );
};

export default EmployeeManagementPage;
