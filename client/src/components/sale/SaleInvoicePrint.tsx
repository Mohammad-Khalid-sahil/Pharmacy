import { Button, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import SaleBillDocument, { SaleBillData } from './SaleBillDocument';

export type { SaleBillData, SaleBillItem } from './SaleBillDocument';

/** @deprecated Use SaleBillData */
export type SaleInvoiceData = SaleBillData;

type SaleBillPrintProps = {
  bill: SaleBillData | null;
  open: boolean;
  onClose: () => void;
  onPrinted?: () => void;
  onDismissWithoutPrint?: () => void;
};

const SaleBillPrint = ({
  bill,
  open,
  onClose,
  onPrinted,
  onDismissWithoutPrint,
}: SaleBillPrintProps) => {
  const { t } = useLanguage();
  const printedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      printedRef.current = false;
      return undefined;
    }

    const handleAfterPrint = () => {
      if (!printedRef.current) return;
      printedRef.current = false;
      onPrinted?.();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [open, onPrinted]);

  const handlePrint = () => {
    printedRef.current = true;
    window.print();
  };

  const handleClose = () => {
    if (!printedRef.current) {
      onDismissWithoutPrint?.();
    }
    onClose();
  };

  if (!bill) return null;

  return (
    <Modal
      title={t('saleBill')}
      open={open}
      onCancel={handleClose}
      width={360}
      className='sale-bill-modal sale-bill-thermal-modal'
      destroyOnClose
      footer={[
        <Button key='close' className='btn-role-neutral no-print' onClick={handleClose}>
          {t('close')}
        </Button>,
        <Button
          key='print'
          type='primary'
          className='btn-role-print no-print'
          icon={<PrinterOutlined />}
          onClick={handlePrint}
        >
          {t('printBill')}
        </Button>,
      ]}
    >
      <div className='sale-bill-print-area report-print-area'>
        <SaleBillDocument bill={bill} />
      </div>
    </Modal>
  );
};

export default SaleBillPrint;
