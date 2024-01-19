import { useEffect, useRef } from 'react';

export interface TriStateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}

const TriStateCheckbox = (props: TriStateCheckboxProps) => {
  const { checked, indeterminate = false, onChange } = props;
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      ref={checkboxRef}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="form-checkbox h-5 w-5 text-tinkerYellow"
    />
  );
};

export default TriStateCheckbox;