import { DeleteFilled, EditFilled } from '@ant-design/icons';
import type { PaginationProps, TableColumnsType } from 'antd';
import { Button, Col, Flex, Modal, Pagination, Row, Select, Table, Tag, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { Controller, FieldValues, useForm } from 'react-hook-form';
import {
  useAddStockMutation,
  useDeleteProductMutation,
  useGetAllProductsQuery,
  useUpdateProductMutation,
} from '../../redux/features/management/productApi';
import { IProduct, ISeller } from '../../types/product.types';
import ProductManagementFilter from '../../components/query-filters/ProductManagementFilter';
import CustomInput from '../../components/CustomInput';
import toastMessage from '../../lib/toastMessage';
import { useGetAllSellerQuery } from '../../redux/features/management/sellerApi';
import { SpinnerIcon } from '@phosphor-icons/react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrencyByLanguage, formatDateByLanguage, formatNumberByLanguage } from '../../utils/formatters';
import { isValidLocalizedInteger, parseLocalizedNumber } from '../../utils/numberNormalizer';
import POSCheckoutForm from '../../components/modal/POSCheckoutForm';

const ProductManagePage = () => {
  const { t, language } = useLanguage();
  const [current, setCurrent] = useState(1);
  const [query, setQuery] = useState({
    name: '',
    limit: 10,
    minPrice: 0,
    maxPrice: 20000,
  });

  const { data: products, isFetching } = useGetAllProductsQuery(query);

  const onChange: PaginationProps['onChange'] = (page) => {
    setCurrent(page);
  };

  const tableData = products?.data?.map((product: IProduct) => ({
    key: product._id,
    name: product.name,
    price: product.price,
    purchasePrice: product.purchasePrice,
    expireDate: product.expireDate,
    minStock: product.minStock,
    stock: product.stock,
    seller: product?.seller,
    sellerName: product?.seller?.name || t('deletedSeller'),
    description: product.description,
    barcode: product.barcode,
  }));

  const columns: TableColumnsType<any> = [
    {
      title: t('productName'),
      key: 'name',
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
      render: (name: string) => <strong className='product-name-cell'>{name}</strong>,
    },
    {
      title: t('salePrice'),
      key: 'price',
      dataIndex: 'price',
      align: 'center',
      width: 130,
      render: (price: number) => <span className='product-money-cell'>{formatCurrencyByLanguage(price, language)}</span>,
    },
    {
      title: t('expireDate'),
      key: 'expireDate',
      dataIndex: 'expireDate',
      align: 'center',
      width: 130,
      render: (date: string) => formatDateByLanguage(date, language),
    },
    {
      title: t('stock'),
      key: 'stock',
      dataIndex: 'stock',
      align: 'center',
      width: 100,
      render: (stock: number, row: any) => stock <= (row.minStock || 5)
        ? <Tag color='red'>{formatNumberByLanguage(stock, language)}</Tag>
        : <Tag color='green'>{formatNumberByLanguage(stock, language)}</Tag>,
    },
    {
      title: t('purchaseFrom'),
      key: 'sellerName',
      dataIndex: 'sellerName',
      align: 'center',
      width: 150,
      ellipsis: true,
      render: (sellerName: string) => {
        if (sellerName === t('deletedSeller')) return <Tag color='red'>{sellerName}</Tag>;
        return <Tag color='green'>{sellerName}</Tag>;
      },
    },
    {
      title: t('action'),
      key: 'x',
      align: 'center' as const,
      render: (item) => {
        return (
          <Flex gap={8} className='product-table-actions' justify='center' wrap>
            <AddStockModal product={item} />
            <UpdateProductModal product={item} />
            <DeleteProductModal id={item.key} />
          </Flex>
        );
      },
      width: 330,
    },
  ];

  return (
    <div className='products-page'>
      <div className='product-page-header'>
        <div>
          <span>{t('products')}</span>
          <h1>{t('products')}</h1>
          <p>{t('productPageSubtitle')}</p>
        </div>
      </div>
      <div className='product-pos-section'>
        <POSCheckoutForm />
      </div>
      <ProductManagementFilter query={query} setQuery={setQuery} />
      <div className='product-table-card'>
        <Table
          size='middle'
          loading={isFetching}
          columns={columns}
          dataSource={tableData}
          pagination={false}
          scroll={{ x: 1150 }}
        />
      </div>
      <Flex justify='center' style={{ marginTop: '1rem' }}>
        <Pagination
          current={current}
          onChange={onChange}
          defaultPageSize={query.limit}
          total={products?.meta?.total}
        />
      </Flex>
    </div>
  );
};

/**
 * Add Stock Modal
 */
const AddStockModal = ({ product }: { product: IProduct & { key: string } }) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: sellers, isLoading: isSellerLoading } = useGetAllSellerQuery(undefined);
  const defaultSellerId = useMemo(() => {
    const sellerRef = product.seller;
    const sellerId = typeof sellerRef === 'object' ? sellerRef?._id : sellerRef;
    if (sellerId && sellers?.data?.some((item: ISeller) => item._id === sellerId)) return sellerId;
    return '';
  }, [product.seller, sellers?.data]);
  const sellerOptions = useMemo(
    () => (sellers?.data || []).map((item: ISeller) => ({ value: item._id, label: item.name })),
    [sellers?.data],
  );
  const { handleSubmit, register, reset, control, formState: { errors } } = useForm({
    defaultValues: { seller: defaultSellerId, stock: '' },
  });
  const [addToStock, { isLoading }] = useAddStockMutation();

  const onSubmit = async (data: FieldValues) => {
    if (!data.seller) {
      toastMessage({ icon: 'error', text: t('selectSeller') });
      return;
    }
    if (!isValidLocalizedInteger(data.stock, 1)) {
      toastMessage({ icon: 'error', text: t('quantityMin') });
      return;
    }

    const stock = parseLocalizedNumber(data.stock);
    const selectedSeller = sellers?.data?.find((item: ISeller) => item._id === data.seller);
    const payload = {
      stock,
      quantity: stock,
      seller: data.seller,
      companyId: data.seller,
      sellerName: selectedSeller?.name,
      companyName: selectedSeller?.name,
    };

    try {
      const res = await addToStock({ id: product.key, payload }).unwrap();
      if (res.statusCode === 200) {
        toastMessage({ icon: 'success', text: res.message });
        reset();
        handleCancel();
      }
    } catch (error: any) {
      handleCancel();
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  const showModal = () => {
    reset({ seller: defaultSellerId, stock: '' });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        onClick={showModal}
        type='primary'
        className='table-btn product-action-stock btn-role-add'
      >
        {t('addStock')}
      </Button>
      <Modal title={t('addStock')} open={isModalOpen} onCancel={handleCancel} footer={null}>
        <form onSubmit={handleSubmit(onSubmit)} className='product-modal-form'>
          <Row className='product-form-row'>
            <Col xs={{ span: 24 }} lg={{ span: 6 }}>
              <label htmlFor='add-stock-seller' className='label'>
                {t('sellers')}*
              </label>
            </Col>
            <Col xs={{ span: 24 }} lg={{ span: 18 }}>
              <Controller
                name='seller'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    id='add-stock-seller'
                    {...field}
                    showSearch
                    optionFilterProp='label'
                    placeholder={t('selectSeller')}
                    loading={isSellerLoading}
                    disabled={isSellerLoading}
                    options={sellerOptions}
                    className={`product-select-field ${errors.seller ? 'input-field-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Col>
          </Row>
          <CustomInput
            name='stock'
            label={t('addStock')}
            register={register}
            type='number'
            required
            errors={errors}
            validation={{
              validate: (value: string) => isValidLocalizedInteger(value, 1) || t('quantityMin'),
            }}
          />
          <Flex justify='center' style={{ marginTop: '1rem' }}>
            <Button htmlType='submit' type='primary' className='btn-role-add' disabled={isLoading}>
              {isLoading && <SpinnerIcon className='spin' weight='bold' />}
              {t('submit')}
            </Button>
          </Flex>
        </form>
      </Modal>
    </>
  );
};

/**
 * Update Product Modal
 */
const UpdateProductModal = ({ product }: { product: IProduct & { key: string } }) => {
  const { t } = useLanguage();
  const [updateProduct] = useUpdateProductMutation();
  const { data: sellers, isLoading: isSellerLoading } = useGetAllSellerQuery(undefined);

  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: product.name,
      price: product.price,
      seller: product?.seller?._id,
      description: product.description,
    },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onSubmit = async (data: FieldValues) => {
    try {
      const res = await updateProduct({ id: product.key, payload: data }).unwrap();
      if (res.statusCode === 200) {
        toastMessage({ icon: 'success', text: res.message });
        reset();
        handleCancel();
      }
    } catch (error: any) {
      handleCancel();
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        onClick={showModal}
        type='primary'
        className='table-btn-small product-action-edit btn-role-edit'
      >
        <Tooltip title={t('update')}>
          <EditFilled />
        </Tooltip>
      </Button>
      <Modal title={t('update')} open={isModalOpen} onCancel={handleCancel} footer={null}>
        <form onSubmit={handleSubmit(onSubmit)} className='product-modal-form'>
          <CustomInput
            name='name'
            errors={errors}
            label={t('medicineName')}
            register={register}
            required={true}
          />
          <CustomInput
            errors={errors}
            label={t('salePrice')}
            type='number'
            name='price'
            register={register}
            required={true}
          />
          <Row className='product-form-row'>
            <Col xs={{ span: 24 }} lg={{ span: 6 }}>
              <label htmlFor='Size' className='label'>
                {t('sellers')}
              </label>
            </Col>
            <Col xs={{ span: 24 }} lg={{ span: 18 }}>
              <select
                disabled={isSellerLoading}
                {...register('seller', { required: true })}
                className={`input-field product-select-field ${errors['seller'] ? 'input-field-error' : ''}`}
              >
                <option value=''>{t('selectSeller')}*</option>
                {sellers?.data.map((item: ISeller) => (
                  <option value={item._id} key={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Col>
          </Row>

          <CustomInput label={t('description')} name='description' register={register} />

          <Flex justify='flex-end' className='product-form-actions'>
            <Button
              htmlType='submit'
              type='primary'
              className='btn-role-edit'
              style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
            >
              {t('update')}
            </Button>
          </Flex>
        </form>
      </Modal>
    </>
  );
};

/**
 * Delete Product Modal
 */
const DeleteProductModal = ({ id }: { id: string }) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteProduct] = useDeleteProductMutation();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteProduct(id).unwrap();
      if (res.statusCode === 200) {
        toastMessage({ icon: 'success', text: res.message });
        handleCancel();
      }
    } catch (error: any) {
      handleCancel();
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  return (
    <>
      <Button
        onClick={showModal}
        type='primary'
        className='table-btn-small product-action-delete btn-role-delete'
      >
        <Tooltip title={t('delete')}>
          <DeleteFilled />
        </Tooltip>
      </Button>
      <Modal title={t('deleteTitle')} open={isModalOpen} onCancel={handleCancel} footer={null}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>{t('deleteQuestion')}</h2>
          <h4>{t('deleteWarning')}</h4>
          <div
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}
          >
            <Button
              onClick={handleCancel}
              type='primary'
              className='btn-role-neutral'
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={() => handleDelete(id)}
              type='primary'
              className='btn-role-delete'
            >
              {t('confirmDelete')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProductManagePage;
