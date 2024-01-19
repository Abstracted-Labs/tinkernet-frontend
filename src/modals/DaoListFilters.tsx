import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal from "../stores/modals";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";
import TriStateCheckbox from "../components/TriStateCheckbox";
import MinMaxRange from "../components/MinMaxRange";
import Dropdown from "../components/Dropdown";

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
  orderBy: OrderByOption;
}

export interface DaoListFiltersProps {
  isOpen: boolean;
  updateCores: (filters: FilterStates) => void;
}

const DaoListFilters = ({ isOpen }: { isOpen: boolean; }) => {
  const [filters, setFilters] = useState<FilterStates>({
    totalStakersRange: { minValue: 0, maxValue: 99999 },
    totalStakedRange: { minValue: 0, maxValue: 99999 },
    isMinSupportMet: { isChecked: false },
    isMyStakedDAOs: { isChecked: false },
    orderBy: OrderByOption.NAME_ASC,
  });

  const { closeCurrentModal } = useModal(
    (state) => state,
    shallow
  );

  const closeModal = () => {
    closeCurrentModal();
  };

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
            <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] h-[472px] rounded-xl space-y-4 p-8 border border-2 border-neutral-700 ${ BG_GRADIENT }`}>
              <div>
                <h2 className="text-md font-bold text-white bg-tinkerDarkGrey mb-5">
                  <span>Refine Search Results</span>
                </h2>
                <div className="text-white text-sm">
                  <TriStateCheckbox
                    checked={filters.isMinSupportMet.isChecked}
                    indeterminate={filters.isMinSupportMet.isIndeterminate}
                    onChange={(newState) => setFilters({ ...filters, isMinSupportMet: { isChecked: newState } })}
                  /> Min Support Met
                  <TriStateCheckbox
                    checked={filters.isMyStakedDAOs.isChecked}
                    indeterminate={filters.isMyStakedDAOs.isIndeterminate}
                    onChange={(newState) => setFilters({ ...filters, isMyStakedDAOs: { isChecked: newState } })}
                  /> My Staked DAOs
                  {/* <MinMaxRange
                    min={filters.totalStakersRange.minValue}
                    max={filters.totalStakersRange.maxValue}
                    minValue={filters.totalStakersRange.minValue}
                    maxValue={filters.totalStakersRange.maxValue}
                    onMinChange={(e) => setFilters({ ...filters, totalStakersRange: { ...filters.totalStakersRange, minValue: Number(e.target.value) } })}
                    onMaxChange={(e) => setFilters({ ...filters, totalStakersRange: { ...filters.totalStakersRange, maxValue: Number(e.target.value) } })}
                  /> Total Stakers */}
                  <div className="my-4">
                    <MinMaxRange
                      min={0}
                      max={99999}
                      minValue={filters.totalStakedRange.minValue}
                      maxValue={filters.totalStakedRange.maxValue}
                      onMinChange={(newMinValue) => setFilters({ ...filters, totalStakedRange: { ...filters.totalStakedRange, minValue: newMinValue } })}
                      onMaxChange={(newMaxValue) => setFilters({ ...filters, totalStakedRange: { ...filters.totalStakedRange, maxValue: newMaxValue } })}
                    /> Total Staked
                  </div>
                  <Dropdown
                    list={Object.values(OrderByOption).map(option => ({ name: option }))}
                    onSelect={(value) => {
                      if (value) {
                        setFilters({ ...filters, orderBy: OrderByOption[value.name as keyof typeof OrderByOption] });
                      }
                    }}
                    defaultOption={OrderByOption.NAME_ASC}
                    currentValue={{ name: filters.orderBy }}
                    initialValue={{ name: OrderByOption.NAME_ASC }}
                  /> Order By
                </div>
              </div>
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
