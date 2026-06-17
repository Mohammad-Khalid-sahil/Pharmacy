import {
  CloudDownloadOutlined,
  DatabaseOutlined,
  DeleteFilled,
  DownloadOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { Button, Col, Flex, Popconfirm, Row, Statistic, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import toastMessage from '../lib/toastMessage';
import {
  useCreateBackupMutation,
  useDeleteBackupMutation,
  useDownloadBackupMutation,
  useGetBackupsQuery,
  useRestoreBackupMutation,
} from '../redux/features/management/backupApi';
import { IBackupLog } from '../types/backup.types';
import formatDate from '../utils/formatDate';
import formatFileSize from '../utils/formatFileSize';
import { formatNumberByLanguage } from '../utils/formatters';

type BackupLogRow = IBackupLog & {
  createdBy?: string | { name?: string; email?: string };
};

const ensureDownloadName = (fileName?: string) => {
  if (!fileName) return `pharmacy-backup-${Date.now()}.json`;
  return /\.(json|zip)$/i.test(fileName) ? fileName : `${fileName}.json`;
};

const BackupManagementPage = () => {
  const { t, language } = useLanguage();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data, isFetching, refetch } = useGetBackupsQuery(undefined);
  const [createBackup, { isLoading: creating }] = useCreateBackupMutation();
  const [downloadBackup] = useDownloadBackupMutation();
  const [deleteBackup] = useDeleteBackupMutation();
  const [restoreBackup, { isLoading: restoring }] = useRestoreBackupMutation();

  const backups = data?.data || [];
  const latestBackup = useMemo(() => backups[0], [backups]);
  const totalSize = useMemo(
    () => backups.reduce((sum: number, row: IBackupLog) => sum + Number(row.size || 0), 0),
    [backups],
  );

  const getCreator = (row: BackupLogRow) => {
    if (!row.createdBy) return t('notAvailable');
    if (typeof row.createdBy === 'string') return row.createdBy;
    return row.createdBy.name || row.createdBy.email || t('notAvailable');
  };

  const onCreate = async () => {
    try {
      const res = await createBackup().unwrap();
      toastMessage({ icon: 'success', text: res.message || t('backupCreateSuccess') });
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('backupCreateFailed') });
    }
  };

  const onDownload = async (row: IBackupLog) => {
    setDownloadingId(row._id);
    try {
      const result = await downloadBackup(row._id).unwrap();
      const fileName = ensureDownloadName(result.fileName || row.fileName);
      const blob =
        result.blob.type || fileName.endsWith('.zip')
          ? result.blob
          : new Blob([result.blob], { type: 'application/json;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
      toastMessage({ icon: 'success', text: t('backupDownloadSuccess') });
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('backupDownloadFailed') });
    } finally {
      setDownloadingId(null);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await deleteBackup(id).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('backupDeleteSuccess') });
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('backupDeleteFailed') });
    }
  };

  const onRestore = async (id: string) => {
    try {
      const res = await restoreBackup(id).unwrap() as { message?: string };
      toastMessage({ icon: 'success', text: res.message || t('backupRestoreSuccess') });
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('backupRestoreFailed') });
    }
  };

  const onExportReport = async () => {
    if (window.pharmacyReport?.savePdf) {
      await window.pharmacyReport.savePdf(`backup-report-${Date.now()}.pdf`);
      return;
    }
    window.print();
  };

  const columns = [
    {
      title: t('fileName'),
      dataIndex: 'fileName',
      key: 'fileName',
      render: (value: string) => (
        <Flex align='center' gap={8} className='backup-file-cell'>
          <FileDoneOutlined />
          <strong>{value}</strong>
        </Flex>
      ),
    },
    {
      title: t('backupType'),
      key: 'type',
      align: 'center' as const,
      render: (_: unknown, row: IBackupLog) => (
        <Tag color={row.fileName?.endsWith('.zip') ? 'blue' : 'green'} className='backup-type-tag'>
          {row.fileName?.endsWith('.zip') ? '.zip' : '.json'}
        </Tag>
      ),
    },
    {
      title: t('backupSize'),
      dataIndex: 'size',
      key: 'size',
      align: 'center' as const,
      render: (size: number) => <span className='backup-size-value'>{formatFileSize(size)}</span>,
    },
    {
      title: t('backupCreated'),
      key: 'createdAt',
      render: (_: unknown, row: IBackupLog) => formatDate(row.createdAt || '', language),
    },
    {
      title: t('createdBy'),
      key: 'createdBy',
      render: (_: unknown, row: BackupLogRow) => getCreator(row),
    },
    {
      title: t('action'),
      key: 'action',
      align: 'center' as const,
      render: (_: unknown, row: IBackupLog) => (
        <Flex gap={8} className='table-actions backup-table-actions' justify='center' wrap>
          <Button
            size='middle'
            type='primary'
            icon={<DownloadOutlined />}
            className='btn-role-download'
            loading={downloadingId === row._id}
            onClick={() => onDownload(row)}
          >
            {t('downloadBackup')}
          </Button>
          <Popconfirm
            title={t('restoreBackupConfirm')}
            onConfirm={() => onRestore(row._id)}
            okText={t('restoreBackup')}
            cancelText={t('close')}
            okButtonProps={{ className: 'btn-role-pay', loading: restoring }}
            cancelButtonProps={{ className: 'btn-role-neutral' }}
          >
            <Button size='middle' type='primary' icon={<ReloadOutlined />} className='btn-role-pay' loading={restoring}>
              {t('restoreBackup')}
            </Button>
          </Popconfirm>
          <Popconfirm
            title={t('deleteBackupConfirm')}
            onConfirm={() => onDelete(row._id)}
            okText={t('delete')}
            cancelText={t('close')}
            okButtonProps={{ danger: true, className: 'btn-role-delete' }}
            cancelButtonProps={{ className: 'btn-role-neutral' }}
          >
            <Button size='middle' type='primary' icon={<DeleteFilled />} className='btn-role-delete'>
              {t('deleteBackup')}
            </Button>
          </Popconfirm>
        </Flex>
      ),
      width: 'auto',
    },
  ];

  return (
    <div className='backup-page page-fade-in report-print-area'>
      <div className='backup-page-header no-print'>
        <div>
          <span>{t('backupPageSubtitle')}</span>
          <h1>{t('backups')}</h1>
          <p>{t('backupPageDescription')}</p>
        </div>
        <DatabaseOutlined />
      </div>

      <Row gutter={[14, 14]} className='backup-summary-row'>
        <Col xs={24} md={8}>
          <div className='backup-summary-card is-total'>
            <Statistic title={t('totalBackups')} value={formatNumberByLanguage(backups.length, language)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='backup-summary-card is-latest'>
            <Statistic title={t('latestBackupDate')} value={latestBackup?.createdAt ? formatDate(latestBackup.createdAt, language) : '-'} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='backup-summary-card is-size'>
            <Statistic title={t('totalBackupSize')} value={formatFileSize(totalSize)} />
          </div>
        </Col>
      </Row>

      <Row gutter={[14, 14]} className='backup-capability-row no-print'>
        <Col xs={24} md={8}>
          <div className='backup-capability-card is-ready'>
            <CloudDownloadOutlined />
            <div>
              <strong>{t('manualBackup')}</strong>
              <span>{t('backupDownloadHint')}</span>
            </div>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='backup-capability-card is-muted'>
            <ScheduleOutlined />
            <div>
              <strong>{t('autoBackup')}</strong>
              <span>{t('autoBackupUnavailable')}</span>
            </div>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='backup-capability-card is-ready'>
            <ReloadOutlined />
            <div>
              <strong>{t('restoreBackup')}</strong>
              <span>{t('restoreBackupHint')}</span>
            </div>
          </div>
        </Col>
      </Row>

      <div className='backup-toolbar'>
        <div>
          <h2>{t('backupList')}</h2>
          <p>{t('backupDownloadHint')}</p>
        </div>
        <Flex gap={10} wrap>
          <Button
            icon={<FilePdfOutlined />}
            className='btn-role-download'
            onClick={onExportReport}
          >
            {t('exportBackupReport')}
          </Button>
          <Button
            type='primary'
            icon={<CloudDownloadOutlined />}
            className='btn-role-backup'
            loading={creating}
            onClick={onCreate}
          >
            {t('createBackup')}
          </Button>
        </Flex>
      </div>

      <div className='backup-table-card'>
        <Table
          size='middle'
          loading={isFetching}
          columns={columns}
          dataSource={backups}
          rowKey='_id'
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
};

export default BackupManagementPage;
