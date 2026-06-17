import { Col, Input, InputNumber, Row, Slider } from 'antd';
import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrencyByLanguage, getCurrencyAddonByLanguage } from '../../utils/formatters';

interface ProductManagementFilterProps {
  query: { name: string; limit: number; minPrice: number; maxPrice: number };
  setQuery: React.Dispatch<React.SetStateAction<{ name: string; limit: number; minPrice: number; maxPrice: number }>>;
}

const ProductManagementFilter = ({ query, setQuery }: ProductManagementFilterProps) => {
  const { t, language } = useLanguage();
  const formatCurrency = (value: number | null | undefined) => formatCurrencyByLanguage(value, language);
  const minPrice = query.minPrice ?? 0;
  const maxPrice = query.maxPrice ?? 20000;

  const updatePriceRange = (nextMin: number | null, nextMax: number | null) => {
    const safeMin = Number(nextMin ?? 0);
    const safeMax = Number(nextMax ?? 20000);
    setQuery((prev) => ({
      ...prev,
      minPrice: Math.min(safeMin, safeMax),
      maxPrice: Math.max(safeMin, safeMax),
    }));
  };

  return (
    <div className='product-filter-card page-toolbar'>
      <Row gutter={[16, 16]} align='bottom'>
        <Col xs={{ span: 24 }} lg={{ span: 9 }}>
          <label className='product-field-label'>{t('searchByProductName')}</label>
          <Input
            value={query.name}
            className='product-search-input'
            placeholder={t('searchByProductName')}
            allowClear
            onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
          />
        </Col>
        <Col xs={{ span: 24 }} lg={{ span: 15 }}>
          <div className='product-filter-range-header'>
            <label className='product-field-label'>{t('priceRange')}</label>
            <span>{formatCurrency(minPrice)} - {formatCurrency(maxPrice)}</span>
          </div>
          <Slider
            range
            step={100}
            max={20000}
            value={[minPrice, maxPrice]}
            tooltip={{ formatter: (value) => formatCurrency(value) }}
            onChange={(value) => {
              setQuery((prev) => ({
                ...prev,
                minPrice: value[0],
                maxPrice: value[1],
              }));
            }}
          />
          <div className='product-price-inputs'>
            <div className='product-price-box'>
              <span>{t('minPrice')}</span>
              <InputNumber
                min={0}
                max={20000}
                step={100}
                value={minPrice}
                addonAfter={getCurrencyAddonByLanguage(language)}
                onChange={(value) => updatePriceRange(value, maxPrice)}
              />
            </div>
            <div className='product-price-box'>
              <span>{t('maxPrice')}</span>
              <InputNumber
                min={0}
                max={20000}
                step={100}
                value={maxPrice}
                addonAfter={getCurrencyAddonByLanguage(language)}
                onChange={(value) => updatePriceRange(minPrice, value)}
              />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ProductManagementFilter;
