import { Input } from 'antd';
import { ChangeEvent, CSSProperties, useEffect, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';

interface SearchInputProps {
  setQuery: React.Dispatch<
    React.SetStateAction<{
      page: number;
      limit: number;
      search: string;
    }>
  >;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  allowClear?: boolean;
  size?: 'small' | 'middle' | 'large';
  style?: CSSProperties;
}

const SearchInput = ({
  setQuery,
  placeholder = 'Search...',
  value,
  onChange,
  allowClear = true,
  size = 'large',
  style,
}: SearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState(value || '');

  useEffect(() => {
    if (value !== undefined && value !== searchTerm) {
      setSearchTerm(value);
    }
  }, [value]);

  useEffect(() => {
    const debounceId = setTimeout(() => {
      setQuery((prev) => ({ ...prev, page: 1, search: searchTerm.trim() }));
    }, 500);

    return () => {
      clearTimeout(debounceId);
    };
  }, [searchTerm, setQuery]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setSearchTerm(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div className='toolbar-search-control' style={style}>
      <Input
        size={size}
        allowClear={allowClear}
        value={searchTerm}
        placeholder={placeholder}
        onChange={handleChange}
        prefix={<SearchOutlined />}
      />
    </div>
  );
};

export default SearchInput;
