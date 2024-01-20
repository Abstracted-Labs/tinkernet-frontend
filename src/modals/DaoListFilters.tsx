import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal from "../stores/modals";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";
import TriStateCheckbox from "../components/TriStateCheckbox";
import MinMaxRange from "../components/MinMaxRange";
import Dropdown from "../components/Dropdown";

export const HR_BREAK = <hr className="border-t-1 border-tinkerGrey my-4" />;

export interface CheckboxFilterState {
  isChecked: boolean;
  isIndeterminate?: boolean;
}

export interface RangeFilterState {
  minValue: number;
  maxValue: number;
}

export enum OrderByOption {
  NAME_ASC = 'nameAsc',
  NAME_DESC = 'nameDesc',
  TOTAL_STAKED_HIGH = 'totalStakedHigh',
  TOTAL_STAKED_LOW = 'totalStakedLow',
  SUPPORT_SHARE_HIGH = 'supportShareHigh',
  SUPPORT_SHARE_LOW = 'supportShareLow'
}

export interface FilterStates {
  totalStakersRange: RangeFilterState;
  totalStakedRange: RangeFilterState;
  isMinSupportMet: CheckboxFilterState;
  isMyStakedDAOs: CheckboxFilterState;
  orderBy: OrderByOption | string;
}

export interface DaoListFiltersProps {
  isOpen: boolean;
  updateCores: (filters: FilterStates) => void;
}

const ORDER_BY = 'Order By';

// Helper function to format the enum keys into a more readable string
const formatOptionName = (option: string) => {
  return option
    .replace(/([A-Z])/g, ' $1') // insert a space before all caps
    .replace(/^./, (str) => str.toUpperCase()) // capitalize the first letter
    .trim();
};

const defaultFilters = (): FilterStates => ({
  totalStakersRange: { minValue: 0, maxValue: 10000 },
  totalStakedRange: { minValue: 0, maxValue: 99999 },
  isMinSupportMet: { isChecked: false, isIndeterminate: false },
  isMyStakedDAOs: { isChecked: false, isIndeterminate: false },
  orderBy: ORDER_BY,
});

const DaoListFilters = ({ isOpen }: { isOpen: boolean; }) => {
  const [filters, setFilters] = useState<FilterStates>(defaultFilters());
  const [reset, setReset] = useState<boolean>(false);

  const { closeCurrentModal } = useModal(
    (state) => state,
    shallow
  );

  const closeModal = () => {
    closeCurrentModal();
  };

  const resetFilters = () => {
    setFilters(defaultFilters());
    setReset(true);
  };

  useEffect(() => {
    setReset(false);
  }, []);

  return isOpen ? (
    <Dialog open={true} onClose={closeCurrentModal}>
      <>
        <Dialog.Title className="sr-only">Notice</Dialog.Title>
        <div className="fixed inset-0 z-[49] h-screen w-full bg-black/10 backdrop-blur-md" />
        <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
          <XMarkIcon className="h-5 w-5" />
          <span className="block">Close</span>
        </button>
        <Dialog.Panel>
          <>
            <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] h-auto rounded-xl space-y-4 p-8 border border-2 border-neutral-700 ${ BG_GRADIENT }`}>
              <div>
                <h2 className="text-md font-bold text-white bg-tinkerDarkGrey mb-5">
                  <span>Refine Search Results</span>
                </h2>
                <div className="text-white text-sm">
                  <Dropdown
                    onReset={() => setReset(false)}
                    reset={reset}
                    list={Object.values(OrderByOption).map(option => ({ name: formatOptionName(option) }))}
                    onSelect={(value) => {
                      if (value) {
                        setFilters({ ...filters, orderBy: OrderByOption[value.name.replace(/ /g, '') as keyof typeof OrderByOption] });
                      }
                    }}
                    defaultOption={ORDER_BY}
                  />
                  {HR_BREAK}
                  <div>
                    <div className="text-sm text-white">Include/Don't Include</div>
                    <div className="flex flex-row justify-between">
                      <TriStateCheckbox
                        label="Min. Support Met"
                        checked={filters.isMinSupportMet.isChecked}
                        indeterminate={filters.isMinSupportMet.isIndeterminate}
                        onChange={(checked, indeterminate) => setFilters({ ...filters, isMinSupportMet: { isChecked: checked, isIndeterminate: indeterminate } })}
                      />
                      <TriStateCheckbox
                        label="My Staked DAOs"
                        checked={filters.isMyStakedDAOs.isChecked}
                        indeterminate={filters.isMyStakedDAOs.isIndeterminate}
                        onChange={(checked, indeterminate) => setFilters({ ...filters, isMyStakedDAOs: { isChecked: checked, isIndeterminate: indeterminate } })}
                      />
                    </div>
                  </div>
                  {HR_BREAK}
                  <MinMaxRange
                    label="Total Stakers"
                    min={0}
                    max={10000}
                    step={500}
                    minValue={filters.totalStakersRange.minValue}
                    maxValue={filters.totalStakersRange.maxValue}
                    onMinChange={(newMinValue) => setFilters(filters => ({ ...filters, totalStakersRange: { ...filters.totalStakersRange, minValue: newMinValue } }))}
                    onMaxChange={(newMaxValue) => setFilters(filters => ({ ...filters, totalStakersRange: { ...filters.totalStakersRange, maxValue: newMaxValue } }))}
                  />
                  <MinMaxRange
                    label="Total TNKR Staked"
                    min={0}
                    max={99999}
                    minValue={filters.totalStakedRange.minValue}
                    maxValue={filters.totalStakedRange.maxValue}
                    onMinChange={(newMinValue) => setFilters(filters => ({ ...filters, totalStakedRange: { ...filters.totalStakedRange, minValue: newMinValue } }))}
                    onMaxChange={(newMaxValue) => setFilters(filters => ({ ...filters, totalStakedRange: { ...filters.totalStakedRange, maxValue: newMaxValue } }))}
                  />
                  {HR_BREAK}
                </div>
              </div>
              <div onClick={resetFilters} className="text-center text-xs text-tinkerTextGrey hover:text-tinkerYellow hover:text-opacity-60 hover:underline hover:cursor-pointer hover:underline-offset-4">Reset Default Filters</div>
              <div>
                <Button variant="primary" mini onClick={closeModal}>Apply Filters</Button>
              </div>
            </div>
          </>
        </Dialog.Panel>
      </>
    </Dialog>
  ) : null;
};

export default DaoListFilters;
