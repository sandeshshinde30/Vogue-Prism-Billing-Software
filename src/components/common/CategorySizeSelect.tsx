import { Select } from './Select';
import { getSizesForCategory, type Category } from '../../types';

interface CategorySizeSelectProps {
  category: Category | string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export function CategorySizeSelect({ 
  category, 
  value, 
  onChange, 
  required = false,
  className 
}: CategorySizeSelectProps) {
  const availableSizes = typeof category === 'string' 
    ? getSizesForCategory(category as Category)
    : getSizesForCategory(category);

  const sizeOptions = [
    { value: '', label: 'Select size...' },
    ...availableSizes.map(size => ({
      value: size,
      label: size
    }))
  ];

  const getSizeLabel = () => {
    if (typeof category === 'string') {
      switch (category) {
        case 'Jeans':
        case 'Formal Pants':
        case 'Night Pants':
          return 'Waist Size';
        case 'Underwear':
          return 'Size';
        default:
          return 'Size';
      }
    }
    return 'Size';
  };

  return (
    <Select
      label={getSizeLabel()}
      value={value}
      onChange={onChange}
      options={sizeOptions}
      required={required}
      className={className}
    />
  );
}