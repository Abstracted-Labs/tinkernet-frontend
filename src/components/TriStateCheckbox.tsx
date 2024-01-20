import { useEffect, useRef, useState } from 'react';

export interface TriStateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean, indeterminate?: boolean) => void;
  label?: string;
}

export enum CheckboxState {
  Checked,
  Unchecked,
  Indeterminate
}

const TriStateCheckbox = (props: TriStateCheckboxProps) => {
  const { onChange, checked, label, indeterminate } = props;
  const [checkboxState, setCheckboxState] = useState<CheckboxState>(checked ? CheckboxState.Checked : CheckboxState.Unchecked);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    setCheckboxState((prevState) => {
      let nextState;
      switch (prevState) {
        case CheckboxState.Checked:
          nextState = CheckboxState.Indeterminate;
          break;
        case CheckboxState.Unchecked:
          nextState = CheckboxState.Checked;
          break;
        case CheckboxState.Indeterminate:
          nextState = CheckboxState.Unchecked;
          break;
        default:
          nextState = prevState;
      }

      return nextState;
    });
  };

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = checkboxState === CheckboxState.Indeterminate;
    }
    onChange(checkboxState === CheckboxState.Checked, checkboxState === CheckboxState.Indeterminate);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkboxState]);

  useEffect(() => {
    if (indeterminate) {
      setCheckboxState(CheckboxState.Indeterminate);
    } else {
      setCheckboxState(checked ? CheckboxState.Checked : CheckboxState.Unchecked);
    }
  }, [checked, indeterminate]);

  return (
    <div className='flex flex-row items-center gap-2 my-2'>
      <input
        type="checkbox"
        ref={checkboxRef}
        checked={checkboxState === CheckboxState.Checked}
        onChange={handleClick}
        className={`form-checkbox h-4 w-4 bg-tinkerGrey rounded-sm text-tinkerYellow focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-tinkerYellow ${ checkboxState === CheckboxState.Indeterminate ? 'indeterminate-checkbox' : '' }`}
      />
      <span className='text-tinkerTextGrey text-xs'>{label}</span>
    </div>
  );
};

export default TriStateCheckbox;