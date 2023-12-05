import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';

interface DropdownProps<T> {
  list: T[];
  onSelect: (value: T) => void;
}

function Dropdown<T extends { name: string; }>({ list, onSelect }: DropdownProps<T>) {
  const [selected, setSelected] = useState<T | undefined>(list[0]);

  const handleSelect = (value: T) => {
    setSelected(value);
    onSelect(value);
  };

  return (
    <div className="w-60">
      <Listbox value={selected} onChange={handleSelect}>
        <Listbox.Button>{selected?.name || 'Select'}</Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute w-60 py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {list.map((item, itemIdx) => (
              <Listbox.Option
                key={itemIdx}
                className={({ active }) =>
                  `${ active ? 'text-amber-900 bg-amber-100' : 'text-gray-900' }
                          cursor-default select-none relative py-2 pl-10 pr-4`
                }
                value={item}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`${ selected ? 'font-medium' : 'font-normal'
                        } block truncate`}
                    >
                      {item.name}
                    </span>
                    {selected ? (
                      <span
                        className={`${ active ? 'text-amber-600' : 'text-amber-600'
                          }
                                absolute inset-y-0 left-0 flex items-center pl-3`}
                      >
                        {/* <CheckIcon className="w-5 h-5" aria-hidden="true" /> */}
                      </span>
                    ) : null}
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