import { useState } from 'react';
import { TOUR_PACKAGE_TYPE_DEFAULT } from '../[tourPackageId]/components/defaultValues';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

type EditableCellProps = {
  value: string;
  onChange: (value: string) => void;
};

export const EditableCell: React.FC<EditableCellProps> = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div onClick={() => setIsEditing(true)}>
      {isEditing ? (
        <Select
          value={value}
          onValueChange={(newValue) => {
            onChange(newValue);
            setIsEditing(false);
          }}
        >
          <SelectTrigger>
            {value || 'Select Tour Package Type'}
          </SelectTrigger>
          <SelectContent>
            {TOUR_PACKAGE_TYPE_DEFAULT.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
};
