import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export interface LegendItem {
  label: string;
  color: string;
}

interface DashboardLegendProps {
  items: LegendItem[];
  className?: string;
}

const DashboardLegend: React.FC<DashboardLegendProps> = ({ items, className }) => {
  const { dir } = useLanguage();
  return (
    <div
      className={`dashboard-legend${className ? ' ' + className : ''}`}
      dir={dir}
    >
      {items.map((item, idx) => (
        <span
          key={item.label + idx}
        >
          <span
            className='dashboard-legend__swatch'
            style={{
              background: item.color,
            }}
            aria-label={item.label}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
};

export default DashboardLegend;
