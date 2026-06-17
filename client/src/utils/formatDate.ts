import { Language } from '../i18n/LanguageContext';
import { formatDateByLanguage } from './formatters';

const formatDate = (time: string, language: Language = 'en') => formatDateByLanguage(time, language);

export default formatDate;
