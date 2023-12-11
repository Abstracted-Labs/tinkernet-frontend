import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DropdownProps<T> {
  list: T[];
  onSelect: (value: T | null) => void;
}

function Dropdown<T extends { name: string; }>({ list, onSelect }: DropdownProps<T>) {
  const [selected, setSelected] = useState<T | null>(null);
  const DEFAULT_OPTION = "Available Balance";

  const handleSelect = (value: T | null) => {
    setSelected(value);
    onSelect(value);
  };

  return (
    <div>
      <Listbox value={selected} onChange={handleSelect}>
        <Listbox.Button className={`relative rounded-md w-full h-[45px] py-2 px-3 text-white text-xs leading-tight bg-tinkerGrey border-transparent focus:outline-none focus:ring-0 focus:border-tinkerYellow hover:bg-tinkerYellow hover:bg-opacity-20`}>
          {(state) => {
            return <div className='flex flex-row items-center'>
              <div className='flex flex-grow items-start'>
                {selected?.name || DEFAULT_OPTION}
              </div>
              <div className={`h-3 w-3 flex transition-transform ${ !state.open ? 'rotate-180' : 'rotate-0' }`}>
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
            <Listbox.Option value={null} className={({ active }) =>
              `${ active ? 'text-tinkerYellow bg-tinkerLightGrey cursor-pointer' : 'text-white' } cursor-default select-none relative py-3 pr-4 pl-3`}>
              {({ selected }) => (
                <>
                  <div className={`${ selected ? 'font-medium' : 'font-normal' } text-xs`}>
                    <div className='flex flex-row items-center'>
                      <div className='h-4 w-4 mr-1 text-tinkerYellow'>
                        {selected ? <CheckIcon /> : null}
                      </div>
                      <div>{DEFAULT_OPTION}</div>
                    </div>
                  </div>
                </>
              )}
            </Listbox.Option>
            {list.map((item, itemIdx) => (
              <Listbox.Option
                key={itemIdx}
                className={({ active }) =>
                  `${ active ? 'text-tinkerYellow bg-tinkerLightGrey cursor-pointer' : 'text-white' } cursor-default select-none relative py-3 pr-4 pl-3`}
                value={item}
              >
                {({ selected }) => (
                  <>
                    <div className={`${ selected ? 'font-medium' : 'font-normal' } text-xs`}>
                      <div className='flex flex-row items-center'>
                        <div className='h-4 w-4 mr-1 text-tinkerYellow'>
                          {selected ? <CheckIcon /> : null}
                        </div>
                        <div>{item.name}</div>
                      </div>
                    </div>
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </Listbox>
    </div>
  );
}

export default Dropdown;