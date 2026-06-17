import Swal, { SweetAlertOptions } from 'sweetalert2';

type Language = 'fa' | 'ps' | 'en';

const alertTranslations: Record<Language, Record<string, string>> = {
  en: {
    failed: 'Failed',
    Cancel: 'Cancel',
    OK: 'OK',
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
    Confirmation: 'Confirmation',
  },
  fa: {
    Cancel: 'لغو',
    OK: 'بلی',
    Success: 'موفقیت',
    Warning: 'هشدار',
    Error: 'خطا',
    Confirmation: 'تأیید',
    'Created successfully': 'با موفقیت ثبت شد',
    'Updated successfully': 'با موفقیت ویرایش شد',
    'Deleted successfully': 'با موفقیت حذف شد',
    'Cashbox transaction created successfully!': 'تراکنش صندوق با موفقیت ثبت شد',
    'Cashbox transactions retrieved successfully': 'تراکنش‌های صندوق با موفقیت دریافت شد',
    'Cashbox summary retrieved successfully!': 'خلاصه صندوق با موفقیت دریافت شد',
    'Cashbox person accounts retrieved successfully!': 'حساب‌های اشخاص با موفقیت دریافت شد',
    'Customer debtors retrieved successfully': 'حساب‌های قرضدار مشتریان با موفقیت دریافت شد',
    'Expense amount must be greater than zero': 'مبلغ مصرف باید بیشتر از صفر باشد',
    'Expense is not found!': 'مصرف پیدا نشد',
    'Amount must be greater than zero': 'مبلغ باید بیشتر از صفر باشد',
    'Stock quantity must be greater than zero': 'مقدار موجودی باید بیشتر از صفر باشد',
    'Stock quantity is required': 'مقدار موجودی الزامی است',
    'Cashbox direction is required': 'جهت تراکنش صندوق الزامی است',
    'Operator is required': 'نام اپراتور الزامی است',
    'Operator is required for deposits and withdrawals': 'نام اپراتور برای افزودن یا برداشت پول الزامی است',
    'Person name is required': 'نام شخص الزامی است',
    'Failed': 'ناموفق بود',
    'Purchase failed': 'خرید ناموفق بود',
    'Failed to save medicine': 'ثبت دوا ناموفق بود',
    'Static login is not available. Open the app through Electron.': 'ورود مستقیم فعال نیست. برنامه را از طریق Electron باز کنید.',
  },
  ps: {
    Cancel: 'لغوه',
    OK: 'هو',
    Success: 'بریالیتوب',
    Warning: 'خبرداری',
    Error: 'تېروتنه',
    Confirmation: 'تایید',
    'Created successfully': 'په بریالیتوب ثبت شو',
    'Updated successfully': 'په بریالیتوب تازه شو',
    'Deleted successfully': 'په بریالیتوب حذف شو',
    'Cashbox transaction created successfully!': 'د صندوق معامله په بریالیتوب ثبت شوه',
    'Cashbox transactions retrieved successfully': 'د صندوق معاملې په بریالیتوب ترلاسه شوې',
    'Cashbox summary retrieved successfully!': 'د صندوق لنډیز په بریالیتوب ترلاسه شو',
    'Cashbox person accounts retrieved successfully!': 'د اشخاصو حسابونه په بریالیتوب ترلاسه شول',
    'Customer debtors retrieved successfully': 'د پېرودونکو پوروړي حسابونه په بریالیتوب ترلاسه شول',
    'Expense amount must be greater than zero': 'د لګښت مبلغ باید له صفر څخه زیات وي',
    'Expense is not found!': 'لګښت ونه موندل شو',
    'Amount must be greater than zero': 'مبلغ باید له صفر څخه زیات وي',
    'Stock quantity must be greater than zero': 'د ذخیرې مقدار باید له صفر څخه زیات وي',
    'Stock quantity is required': 'د ذخیرې مقدار اړین دی',
    'Cashbox direction is required': 'د صندوق د معاملې جهت اړین دی',
    'Operator is required': 'د اپراتور نوم اړین دی',
    'Operator is required for deposits and withdrawals': 'د پیسو زیاتولو یا ایستلو لپاره د اپراتور نوم اړین دی',
    'Person name is required': 'د شخص نوم اړین دی',
    'Failed': 'ناکام شو',
    'Purchase failed': 'پېرود ناکام شو',
    'Failed to save medicine': 'د دوا ثبت ناکام شو',
    'Static login is not available. Open the app through Electron.': 'مستقیم ننوتل فعال نه دي. پروګرام د Electron له لارې پرانیزئ.',
  },
};

const currentLanguage = (): Language => {
  const value = localStorage.getItem('language');
  return value === 'en' || value === 'ps' || value === 'fa' ? value : 'fa';
};

const translateAlertText = <T,>(value: T): T => {
  if (typeof value !== 'string') return value;
  return (alertTranslations[currentLanguage()][value] || value) as T;
};

const defaultTitleForIcon = (icon?: SweetAlertOptions['icon']) => {
  if (icon === 'success') return 'Success';
  if (icon === 'warning') return 'Warning';
  if (icon === 'error') return 'Error';
  if (icon === 'question') return 'Confirmation';
  return undefined;
};

const toastMessage = (props: SweetAlertOptions) => {
  const iconClass = props.icon ? `pharmacy-swal--${props.icon}` : '';
  const confirmText = props.confirmButtonText || 'OK';
  const resolvedTitle = props.title || (props.icon && !props.text && !props.html ? defaultTitleForIcon(props.icon) : undefined);

  return Swal.fire({
    ...props,
    buttonsStyling: false,
    showDenyButton: props.showDenyButton ?? false,
    showCancelButton: props.showCancelButton ?? false,
    showConfirmButton: props.showConfirmButton ?? true,
    customClass: {
      popup: `pharmacy-swal-popup ${iconClass}`.trim(),
      title: 'pharmacy-swal-title',
      htmlContainer: 'pharmacy-swal-text',
      actions: 'pharmacy-swal-actions',
      confirmButton: 'pharmacy-swal-btn pharmacy-swal-btn-confirm',
      cancelButton: 'pharmacy-swal-btn pharmacy-swal-btn-cancel',
      denyButton: 'pharmacy-swal-btn pharmacy-swal-btn-deny',
      ...(props.customClass || {}),
    },
    title: translateAlertText(resolvedTitle),
    text: translateAlertText(props.text),
    html: translateAlertText(props.html),
    confirmButtonText: translateAlertText(confirmText),
    cancelButtonText: translateAlertText(props.cancelButtonText || 'Cancel'),
  });
};

export default toastMessage;
