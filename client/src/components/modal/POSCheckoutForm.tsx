import { Button, Col, Form, Input, InputNumber, Row, Select, Switch, Table, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { DeleteFilled, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useGetAllProductsQuery } from '../../redux/features/management/productApi';
import { useGetCustomersQuery } from '../../redux/features/management/customerApi';
import { useCreateBulkSaleMutation } from '../../redux/features/management/saleApi';
import { useCreatePrescriptionMutation } from '../../redux/features/management/prescriptionApi';
import toastMessage from '../../lib/toastMessage';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../../utils/formatters';
import { inputNumberParser, parseLocalizedNumber } from '../../utils/numberNormalizer';

type ProductOption = {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  stock: number;
  barcode?: string;
  genericName?: string;
  generic?: string;
  generic_name?: string;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  dosage?: string;
  instruction?: string;
};

const POSCheckoutForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { t, language } = useLanguage();
  const [form] = Form.useForm();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const { data: productsData, isFetching: loadingProducts, refetch: refetchProducts } = useGetAllProductsQuery({
    limit: 1000,
  });
  const { data: customersData, isLoading: loadingCustomers } = useGetCustomersQuery({ limit: 200 });
  const [createBulkSale, { isLoading }] = useCreateBulkSaleMutation();
  const [createPrescription, { isLoading: creatingPrescription }] = useCreatePrescriptionMutation();
  const [cart, setCart] = useState<CartItem[]>([]);

  const paymentType = Form.useWatch('paymentType', form) as 'CASH' | 'CREDIT' | 'PARTIAL' | undefined;
  const paidAmount = Form.useWatch('paidAmount', form) ?? 0;
  const discount = parseLocalizedNumber(Form.useWatch('discount', form), 0);

  const products = (productsData?.data || []) as ProductOption[];
  const subtotalAmount = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const totalAmount = useMemo(() => Math.max(subtotalAmount - discount, 0), [subtotalAmount, discount]);
  const dueAmount = useMemo(() => Math.max(totalAmount - parseLocalizedNumber(paidAmount, 0), 0), [paidAmount, totalAmount]);
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product._id)),
    [products, selectedProductIds],
  );

  const filterProductOption = (input: string, option?: { searchText?: string; label?: string; barcode?: string }) => {
    const term = input.trim().toLowerCase();
    if (!term) return true;
    const searchText = String(option?.searchText || '').toLowerCase();
    const name = String(option?.label || '').toLowerCase();
    const barcode = String(option?.barcode || '').toLowerCase();
    return searchText.includes(term) || name.includes(term) || barcode.includes(term) || barcode === term;
  };

  useEffect(() => {
    form.setFieldsValue({ paymentType: 'CASH', paidAmount: 0, discount: 0 });
  }, [form]);

  useEffect(() => {
    if (!paymentType) return;
    if (paymentType === 'CASH') {
      form.setFieldsValue({ paidAmount: totalAmount, customer: undefined });
    } else if (paymentType === 'CREDIT') {
      form.setFieldsValue({ paidAmount: 0 });
    } else if (paymentType === 'PARTIAL' && parseLocalizedNumber(paidAmount, 0) >= totalAmount) {
      form.setFieldsValue({ paidAmount: totalAmount > 0 ? Math.max(totalAmount - 1, 1) : 0 });
    }
  }, [form, paidAmount, paymentType, totalAmount]);

  const productOptions = products.map((product) => {
    const genericName = product.genericName || product.generic || product.generic_name || '';
    const price = Number(product.salePrice || product.price || 0);

    return {
      value: product._id,
      label: product.name,
      barcode: product.barcode || '',
      genericName,
      stock: Number(product.stock || 0),
      price,
      searchText: [product.name, product.barcode, genericName].filter(Boolean).join(' ').toLowerCase(),
      disabled: Number(product.stock || 0) <= 0,
    };
  });

  const customerOptions = (customersData?.data || []).map((customer: { _id: string; name: string; phone?: string }) => ({
    value: customer._id,
    label: customer.phone ? `${customer.name} (${customer.phone})` : customer.name,
  }));

  const addProductsToCart = (productIds: string[]) => {
    const uniqueIds = Array.from(new Set(productIds));
    if (uniqueIds.length === 0) return;

    setCart((current) => {
      const next = [...current];
      uniqueIds.forEach((productId) => {
        const product = products.find((item) => item._id === productId);
        if (!product || Number(product.stock || 0) <= 0) return;
        const existing = next.find((item) => item.productId === productId);
        if (existing) {
          existing.quantity = Math.min(existing.quantity + 1, existing.stock);
        } else {
          next.push({
            productId,
            name: product.name,
            price: Number(product.salePrice || product.price || 0),
            stock: Number(product.stock || 0),
            quantity: 1,
          });
        }
      });
      return next;
    });
    setSelectedProductIds([]);
  };

  const addSelectedMedicinesToCart = () => {
    if (selectedProductIds.length === 0) {
      toastMessage({ icon: 'warning', text: t('selectMedicinesFirst') });
      return;
    }
    addProductsToCart(selectedProductIds);
  };

  const removeSelectedProduct = (productId: string) => {
    setSelectedProductIds((current) => current.filter((id) => id !== productId));
  };

  const updateCartItem = (productId: string, patch: Partial<CartItem>) => {
    setCart((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;
        const nextQuantity = patch.quantity === undefined ? item.quantity : Math.min(Math.max(parseLocalizedNumber(patch.quantity, 1), 1), item.stock);
        return { ...item, ...patch, quantity: nextQuantity };
      }),
    );
  };

  const removeItem = (productId: string) => setCart((current) => current.filter((item) => item.productId !== productId));
  const clearCart = () => setCart([]);

  const validatePayment = (_: unknown, value: number) => {
    if (discount >= subtotalAmount && subtotalAmount > 0) {
      return Promise.reject(new Error(t('discountLessThanSubtotal')));
    }
    const paidValue = parseLocalizedNumber(value, 0);
    if (paymentType === 'CASH' && paidValue !== totalAmount) {
      return Promise.reject(new Error(t('validationCashPaid')));
    }
    if (paymentType === 'CREDIT' && paidValue !== 0) {
      return Promise.reject(new Error(t('validationCreditPaid')));
    }
    if (paymentType === 'PARTIAL' && (paidValue <= 0 || paidValue >= totalAmount)) {
      return Promise.reject(new Error(t('validationPartialPaid')));
    }
    return Promise.resolve();
  };

  const discountedItems = () => {
    let remainingDiscount = Math.min(discount, Math.max(subtotalAmount - 0.01, 0));
    return cart.map((item, index) => {
      const lineSubtotal = item.price * item.quantity;
      const isLast = index === cart.length - 1;
      const lineDiscount = isLast ? remainingDiscount : Number(((lineSubtotal / subtotalAmount) * discount).toFixed(2));
      if (!isLast) remainingDiscount -= lineDiscount;
      const adjustedLineTotal = Math.max(lineSubtotal - lineDiscount, 0);
      return {
        product: item.productId,
        quantity: item.quantity,
        productPrice: Number((adjustedLineTotal / item.quantity).toFixed(2)),
      };
    });
  };

  const onFinish = async (values: any) => {
    if (cart.length === 0) {
      toastMessage({ icon: 'warning', text: t('cartEmpty') });
      return;
    }
    const overStockItem = cart.find((item) => item.quantity > item.stock);
    if (overStockItem) {
      toastMessage({ icon: 'error', text: `${overStockItem.name}: ${t('stock')} ${formatNumberByLanguage(overStockItem.stock, language)}` });
      return;
    }
    if (discount >= subtotalAmount) {
      toastMessage({ icon: 'error', text: t('discountLessThanSubtotal') });
      return;
    }

    const payload = {
      items: discountedItems(),
      buyerName: values.buyerName,
      date: values.date,
      paymentType: values.paymentType,
      ...(values.customer ? { customer: values.customer } : {}),
      paidAmount: parseLocalizedNumber(values.paidAmount, 0),
    };

    try {
      const res = await createBulkSale(payload).unwrap();
      if (res.statusCode === 201) {
        if (values.addPrescription) {
          const created = res.data;
          const saleId = Array.isArray(created) ? created[0]?._id : created?._id;
          if (saleId) {
            try {
              await createPrescription({
                ...(values.customer ? { customer: values.customer } : {}),
                ...(values.patientName?.trim() ? { patientName: values.patientName.trim() } : {}),
                ...(values.doctorName?.trim() ? { doctorName: values.doctorName.trim() } : {}),
                ...(values.note?.trim() ? { note: values.note.trim() } : {}),
                sale: saleId,
                items: cart.map((item) => ({
                  product: item.productId,
                  quantity: item.quantity,
                  ...(item.dosage?.trim() ? { dosage: item.dosage.trim() } : {}),
                  ...(item.instruction?.trim() ? { instruction: item.instruction.trim() } : {}),
                })),
                totalAmount,
              }).unwrap();
            } catch (error: any) {
              toastMessage({ icon: 'warning', text: error?.data?.message || t('prescriptionFailed') });
            }
          }
        }

        toastMessage({
          icon: 'success',
          text: values.addPrescription ? `${res.message} ${t('prescriptionCreated')}` : res.message || t('saleCreatedSuccess'),
        });
        form.resetFields();
        form.setFieldsValue({ paymentType: 'CASH', paidAmount: 0, discount: 0 });
        clearCart();
        refetchProducts();
        onSuccess?.();
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('saleFailed') });
    }
  };

  const columns = [
    {
      title: t('productName'),
      dataIndex: 'name',
      key: 'name',
      render: (value: string, row: CartItem) => (
        <div className='pos-item-name'>
          <strong>{value}</strong>
          <span>{t('stock')}: {formatNumberByLanguage(row.stock, language)}</span>
        </div>
      ),
    },
    {
      title: t('salePrice'),
      dataIndex: 'price',
      key: 'price',
      width: 150,
      render: (value: number, row: CartItem) => (
        <InputNumber min={0.01} parser={inputNumberParser} value={value} onChange={(next) => updateCartItem(row.productId, { price: parseLocalizedNumber(next, 0) })} />
      ),
    },
    {
      title: t('quantity'),
      key: 'quantity',
      width: 130,
      render: (_: unknown, row: CartItem) => (
        <InputNumber min={1} max={row.stock} parser={inputNumberParser} value={row.quantity} onChange={(next) => updateCartItem(row.productId, { quantity: parseLocalizedNumber(next, 1) })} />
      ),
    },
    {
      title: t('subtotal'),
      key: 'subtotal',
      width: 140,
      render: (_: unknown, row: CartItem) => <strong>{formatCurrencyByLanguage(row.price * row.quantity, language)}</strong>,
    },
    {
      title: t('dosage'),
      key: 'dosage',
      width: 150,
      render: (_: unknown, row: CartItem) => (
        <Input value={row.dosage} onChange={(event) => updateCartItem(row.productId, { dosage: event.target.value })} />
      ),
    },
    {
      title: t('action'),
      key: 'action',
      width: 80,
      render: (_: unknown, row: CartItem) => (
        <Button danger icon={<DeleteFilled />} onClick={() => removeItem(row.productId)} />
      ),
    },
  ];

  return (
    <div className='pos-checkout'>
      <Form form={form} layout='vertical' onFinish={onFinish} initialValues={{ paymentType: 'CASH', discount: 0 }}>
        <Row gutter={[14, 14]}>
          <Col xs={24} xl={15}>
            <div className='pos-panel pos-panel--picker'>
              <div className='pos-panel-heading'>
                <div>
                  <h2>{t('sellProduct')}</h2>
                  <p>{t('posSearchHelp')}</p>
                </div>
                <Tag color='cyan'>{formatNumberByLanguage(cart.length, language)} {t('items')}</Tag>
              </div>
              <div className='pos-picker-field pos-picker-field--multi'>
                <Select
                  mode='multiple'
                  showSearch
                  allowClear
                  value={selectedProductIds}
                  loading={loadingProducts}
                  filterOption={(input, option) => filterProductOption(input, option as { searchText?: string; label?: string; barcode?: string })}
                  onChange={(values) => setSelectedProductIds(values)}
                  options={productOptions}
                  maxTagCount='responsive'
                  popupMatchSelectWidth={false}
                  popupClassName='pos-product-select-dropdown'
                  dropdownStyle={{ minWidth: 'min(720px, calc(100vw - 32px))', maxWidth: 'calc(100vw - 32px)' }}
                  optionRender={(option) => (
                    <div className='pos-product-option' title={String(option.data.label)}>
                      <div className='pos-product-option__name'>
                        <span>{t('medicineName')}</span>
                        <strong>{option.data.label}</strong>
                        {option.data.barcode ? (
                          <em className='pos-product-option__barcode'>
                            {t('barcode')}: {option.data.barcode}
                          </em>
                        ) : null}
                      </div>
                      <div>
                        <span>{t('price')}</span>
                        <strong>{formatCurrencyByLanguage(option.data.price, language)}</strong>
                      </div>
                      <div>
                        <span>{t('stock')}</span>
                        <strong>{formatNumberByLanguage(option.data.stock, language)}</strong>
                      </div>
                    </div>
                  )}
                  placeholder={t('posSearchPlaceholder')}
                  className='pos-product-select pos-product-select--multi'
                />
              </div>

              {selectedProducts.length > 0 ? (
                <div className='pos-selected-list'>
                  <div className='pos-selected-list__heading'>
                    <strong>{t('selectedMedicines')}</strong>
                    <Tag color='processing'>
                      {formatNumberByLanguage(selectedProducts.length, language)} {t('items')}
                    </Tag>
                  </div>
                  <div className='pos-selected-list__tags'>
                    {selectedProducts.map((product) => (
                      <Tag
                        key={product._id}
                        closable
                        onClose={() => removeSelectedProduct(product._id)}
                        className='pos-selected-tag'
                      >
                        {product.name}
                      </Tag>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className='pos-action-buttons'>
                <Button
                  type='primary'
                  className='btn-pos-add-to-cart'
                  icon={<PlusOutlined />}
                  onClick={addSelectedMedicinesToCart}
                  disabled={selectedProductIds.length === 0}
                >
                  {t('addSelectedMedicines')}
                </Button>
              </div>
            </div>

            <div className='pos-cart-card'>
              <Table
                size='middle'
                dataSource={cart}
                columns={columns}
                rowKey='productId'
                pagination={false}
                scroll={{ x: 900 }}
                locale={{ emptyText: t('posCartEmpty') }}
              />
            </div>
          </Col>

          <Col xs={24} xl={9}>
            <div className='pos-panel pos-total-panel'>
              <div className='pos-total-heading'>
                <ShoppingCartOutlined />
                <strong>{t('totalAmount')}</strong>
              </div>
              <div className='pos-total-line'>
                <span>{t('subtotal')}</span>
                <strong>{formatCurrencyByLanguage(subtotalAmount, language)}</strong>
              </div>
              <Form.Item name='discount' label={t('discount')}>
                <InputNumber min={0} max={Math.max(subtotalAmount - 0.01, 0)} parser={inputNumberParser} style={{ width: '100%' }} />
              </Form.Item>
              <div className='pos-grand-total'>{formatCurrencyByLanguage(totalAmount, language)}</div>

              <Row gutter={10}>
                <Col xs={24} md={12} lg={24}>
                  <Form.Item name='buyerName' label={t('buyerName')} rules={[{ required: true, message: t('buyerNameRequired') }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={24}>
                  <Form.Item name='date' label={t('sellingDate')} rules={[{ required: true, message: t('dateRequired') }]}>
                    <Input type='date' />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name='paymentType' label={t('paymentType')} rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'CASH', label: t('paymentCash') },
                    { value: 'CREDIT', label: t('paymentCredit') },
                    { value: 'PARTIAL', label: t('paymentPartial') },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name='customer'
                label={t('selectCustomer')}
                rules={[
                  {
                    validator: async (_, value) => {
                      if ((paymentType === 'CREDIT' || paymentType === 'PARTIAL') && !value) {
                        return Promise.reject(new Error(t('customerRequired')));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp='label'
                  loading={loadingCustomers}
                  disabled={paymentType === 'CASH'}
                  placeholder={paymentType === 'CASH' ? t('customerOptionalCash') : t('selectCustomer')}
                  options={customerOptions}
                />
              </Form.Item>

              <Form.Item
                name='paidAmount'
                label={t('paidAmount')}
                rules={[
                  { required: true, message: t('paidAmountRequired') },
                  { validator: validatePayment },
                ]}
              >
                <InputNumber min={0} parser={inputNumberParser} style={{ width: '100%' }} disabled={paymentType === 'CASH' || paymentType === 'CREDIT'} />
              </Form.Item>

              <div className='pos-total-line pos-due-line'>
                <span>{t('dueAmount')}</span>
                <strong>{formatCurrencyByLanguage(dueAmount, language)}</strong>
              </div>

              <div className='pos-prescription-box'>
                <Form.Item name='addPrescription' valuePropName='checked' noStyle>
                  <Switch />
                </Form.Item>
                <span>{t('addPrescription')}</span>
              </div>
              <Row gutter={10}>
                <Col xs={24} md={12} lg={24}>
                  <Form.Item name='patientName' label={t('patientNameOptional')}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={24}>
                  <Form.Item name='doctorName' label={t('doctorNameOptional')}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name='note' label={t('noteOptional')}>
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
              </Row>

              <Button type='primary' htmlType='submit' loading={isLoading || creatingPrescription} block size='large' className='btn-role-pay'>
                {t('sell')}
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default POSCheckoutForm;
