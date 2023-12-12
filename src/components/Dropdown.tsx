import { Fragment, useEffect, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DropdownProps<T> {
  list: T[];
  onSelect: (value: T | null) => void;
  defaultOption?: string;
  currentValue?: T | null;
  initialValue?: string;
}

const DEFAULT_OPTION = "Available Balance";

function Dropdown<T extends { name: string; }>({ initialValue, list, onSelect, defaultOption = DEFAULT_OPTION, currentValue }: DropdownProps<T>) {
  const [optionSelected, setOptionSelected] = useState<T | null>(null);

  const handleSelect = (value: T | null) => {
    setOptionSelected(value);
    onSelect(value);
  };

  useEffect(() => {
    const initialOption = list.find(item => item.name === initialValue);
    if (initialOption) {
      setOptionSelected(initialOption);
    }
  }, [initialValue, list]);

  useEffect(() => {
    if (currentValue) {
      setOptionSelected(currentValue);
    }
  }, [currentValue]);

  return (
    <div>
      <Listbox value={optionSelected} onChange={handleSelect}>
        <Listbox.Button className={`relative rounded-md w-full h-[45px] py-2 px-3 text-white text-xs leading-tight bg-tinkerGrey border-transparent focus:outline-none focus:ring-0 focus:border-tinkerYellow hover:bg-tinkerYellow hover:bg-opacity-20`}>
          {({ value, open }) => {
            const displayValue = value === null || value?.name === initialValue ? defaultOption : value?.name;
            return <div className='flex flex-row items-center'>
              <div className='flex flex-grow items-start'>
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
          <Listbox.Options className="absolute z-50 py-1 mt-1 overflow-auto text-xs bg-tinkerGrey rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm max-h-50 w-4/5 md:w-2/5 tinker-scrollbar scrollbar scrollbar-thumb-amber-300">
            {list.map((item, itemIdx) => (
              <Listbox.Option
                key={itemIdx}
                className={({ active }) =>
                  `${ active ? 'text-tinkerYellow bg-tinkerLightGrey cursor-pointer' : 'text-white' } cursor-default select-none relative py-3 pr-4 pl-3`}
                value={item}
              >
                <>
                  <div className={`${ optionSelected?.name === item?.name ? 'font-medium' : 'font-normal' } text-xs`}>
                    <div className='flex flex-row items-center'>
                      <div className='h-4 w-4 mr-1 text-tinkerYellow'>
                        {optionSelected?.name === item?.name ? <CheckIcon /> : null}
                      </div>
                      <div>{item.name === initialValue ? defaultOption : item.name}</div>
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
}

export default Dropdown;