import { Fragment, useEffect, useState, ReactNode, isValidElement, memo } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DropdownProps<T> {
  list?: T[];
  onSelect: (value: T | null) => void;
  defaultOption?: string;
  currentValue?: T | null;
  initialValue?: T | null | string;
  children?: ReactNode[];
}

const DEFAULT_OPTION = "Available Balance";

const Dropdown = memo(function Dropdown<T extends { name: string; }>({ initialValue, list, onSelect, defaultOption = DEFAULT_OPTION, currentValue, children }: DropdownProps<T>) {
  const [optionSelected, setOptionSelected] = useState<T | ReactNode | null>(null);

  const handleSelect = (value: T | ReactNode | null) => {
    setOptionSelected(value);
    onSelect(value as T | null);
  };

  useEffect(() => {
    if (list) {
      const initialOption = list.find(item => item.name === initialValue);
      if (initialOption) {
        setOptionSelected(initialOption);
      }
    } else if (children) {
      const initialChild = children.find(child => isValidElement(child) && child.key === initialValue);
      if (initialChild) {
        setOptionSelected(initialChild);
      }
    }
  }, [initialValue, list, children]);

  useEffect(() => {
    if (currentValue) {
      setOptionSelected(currentValue);
    } else if (children) {
      const currentChild = children.find(child => child === currentValue);
      if (currentChild) {
        setOptionSelected(currentChild);
      }
    }
  }, [currentValue, children]);

  return (
    <div className='flex-grow'>
      <Listbox value={optionSelected} onChange={handleSelect}>
        <Listbox.Button className={`relative rounded-md w-full h-[45px] py-2 px-3 text-white text-xs leading-tight bg-tinkerGrey border-transparent focus:outline-none focus:ring-0 focus:border-tinkerYellow hover:bg-tinkerYellow hover:bg-opacity-20`}>
          {({ value, open }) => {
            let displayValue;
            if (value && typeof value === 'object' && 'props' in value && value.props.children) {
              displayValue = value.props.children;
            } else if (value === null || (value && 'name' in value && value.name === initialValue)) {
              displayValue = defaultOption;
            } else if (value && 'name' in value) {
              const selectedChild = children?.find(child => isValidElement(child) && child.key === value.name);
              displayValue = selectedChild ? (isValidElement(selectedChild) ? selectedChild.props.children : selectedChild) : value.name;
            } else if (children && children[0] && isValidElement(children[0]) && children[0].key) {
              displayValue = children[0];
            }
            return <div className='flex flex-row items-center'>
              <div className='flex flex-grow gap-1 items-center'>
                {displayValue}
              </div>
              <div className={`h-3 w-3 flex transition-transform ${ !open ? 'rotate-180' : 'rotate-0' }`}>
                <ChevronUpIcon />
              </div>
            </div>;
          }}
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 py-1 mt-1 overflow-auto text-xs bg-tinkerGrey rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm max-h-50 w-2/5 tinker-scrollbar scrollbar scrollbar-thumb-amber-300">
            {children ? children.map((child, childIdx) => (
              <Listbox.Option
                key={childIdx}
                className={({ active }) =>
                  `${ active ? 'text-tinkerYellow bg-tinkerLightGrey cursor-pointer' : 'text-white' } cursor-default select-none relative py-3 pr-4 pl-3 flex flex-row items-center`}
                value={isValidElement(child) ? { name: child.key } : { name: child }}
              >
                <div className='h-4 w-4 mr-1 text-tinkerYellow'>
                  {optionSelected && typeof optionSelected === 'object' && 'name' in optionSelected && isValidElement(child) && typeof child.key === 'string' && optionSelected.name === child.key ? <CheckIcon /> : null}
                </div>
                <div>{child}</div>
              </Listbox.Option>
            )) : list?.map((item, itemIdx) => (
              <Listbox.Option
                id={item?.name}
                key={itemIdx}
                className={({ active }) =>
                  `${ active ? 'text-tinkerYellow bg-tinkerLightGrey cursor-pointer' : 'text-white' } cursor-default select-none relative py-3 pr-4 pl-3`}
                value={item}
              >
                <>
                  <div className={`${ optionSelected === item ? 'font-medium' : 'font-normal' } text-xs`}>
                    <div className='flex flex-row items-center'>
                      <div className='h-4 w-4 mr-1 text-tinkerYellow'>
                        {optionSelected === item ? <CheckIcon /> : null}
                      </div>
                      <div>{item?.name === initialValue ? defaultOption : (typeof item === 'string' ? item : item?.name)}</div>
                    </div>
                  </div>
                </>
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </Listbox>
    </div>
  );
});

export default Dropdown;