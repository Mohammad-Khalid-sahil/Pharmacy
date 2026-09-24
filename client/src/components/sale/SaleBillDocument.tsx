import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../../utils/formatters';
import formatDate from '../../utils/formatDate';

export type SaleBillItem = {
  key?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type SaleBillData = {
  buyerName: string;
  date: string;
  items: SaleBillItem[];
  totalAmount: number;
  billNumber: string;
  transactionId?: string;
};

type SaleBillDocumentProps = {
  bill: SaleBillData;
  showMeta?: boolean;
};

const SaleBillDocument = ({ bill, showMeta = true }: SaleBillDocumentProps) => {
  const { t, language } = useLanguage();
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const saleDate = bill.date ? formatDate(bill.date, language) : '-';

  return (
    <div className='sale-bill-document sale-bill-thermal'>
      <header className='sale-bill-thermal__header'>
        <strong className='sale-bill-thermal__shop'>{t('appName')}</strong>
        <div className='sale-bill-thermal__title'>{t('saleBill')}</div>
        <p className='sale-bill-thermal__subtitle'>{t('saleBillSubtitle')}</p>
      </header>

      <div className='sale-bill-thermal__rule' aria-hidden='true' />

      <section className='sale-bill-thermal__meta'>
        <div className='sale-bill-thermal__row'>
          <span>{t('billNumber')}</span>
          <strong>#{bill.billNumber}</strong>
        </div>
        <div className='sale-bill-thermal__row'>
          <span>{t('sellingDate')}</span>
          <strong>{saleDate}</strong>
        </div>
        <div className='sale-bill-thermal__row'>
          <span>{t('buyerName')}</span>
          <strong>{bill.buyerName || t('walkInCustomer')}</strong>
        </div>
        {showMeta && bill.transactionId ? (
          <div className='sale-bill-thermal__row sale-bill-thermal__row--muted'>
            <span>{t('transactionId')}</span>
            <strong>{bill.transactionId}</strong>
          </div>
        ) : null}
      </section>

      <div className='sale-bill-thermal__rule' aria-hidden='true' />

      <section className='sale-bill-thermal__items'>
        {bill.items.map((item) => (
          <article key={item.key || `${item.productName}-${item.quantity}`} className='sale-bill-thermal__item'>
            <div className='sale-bill-thermal__item-name'>{item.productName}</div>
            <div className='sale-bill-thermal__item-line'>
              <span>
                {formatNumber(item.quantity)} x {formatMoney(item.unitPrice)}
              </span>
              <strong>{formatMoney(item.totalPrice)}</strong>
            </div>
          </article>
        ))}
      </section>

      <div className='sale-bill-thermal__rule sale-bill-thermal__rule--bold' aria-hidden='true' />

      <div className='sale-bill-thermal__total'>
        <span>{t('totalAmount')}</span>
        <strong>{formatMoney(bill.totalAmount)}</strong>
      </div>

      <footer className='sale-bill-thermal__footer'>{t('saleBillFooter')}</footer>
    </div>
  );
};

export default SaleBillDocument;
