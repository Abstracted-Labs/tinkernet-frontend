import { useEffect, useRef, useState } from 'react';

export interface TriStateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean, indeterminate?: boolean) => void;
  label?: string;
  reset?: boolean;
  onReset?: () => void;
}

export enum CheckboxState {
  Checked,
  Unchecked,
  Indeterminate
}

const TriStateCheckbox = (props: TriStateCheckboxProps) => {
  const { onChange, checked, label, indeterminate, reset, onReset } = props;
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

  }, [checkboxState, onChange]);

  useEffect(() => {
    if (indeterminate) {
      setCheckboxState(CheckboxState.Indeterminate);
    }
  }, [indeterminate]);

  useEffect(() => {
    if (checked) {
      setCheckboxState(checked ? CheckboxState.Checked : CheckboxState.Unchecked);
    }
  }, [checked]);

  useEffect(() => {
    if (reset) {
      setCheckboxState(CheckboxState.Unchecked);
      if (onReset) {
        onReset();
      }
    }
  }, [reset, onReset]);

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