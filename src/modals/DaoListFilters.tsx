import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal, { Metadata, modalName } from "../stores/modals";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";
import TriStateCheckbox from "../components/TriStateCheckbox";
import MinMaxRange from "../components/MinMaxRange";
import Dropdown from "../components/Dropdown";
import { loadFiltersFromLocalStorage, saveFiltersToLocalStorage } from "../utils/filterServices";

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
  NAME_ASCENDING = 'nameAscending',
  NAME_DESCENDING = 'nameDescending',
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
}

export interface DaoListFiltersMetadata extends Metadata {
  updateFilters?: (newFilters: FilterStates, reset?: boolean) => void;
}

export const CHOOSE_ONE = 'Choose One';

// Helper function to format the enum keys into a more readable string
const formatOptionName = (option: string) => {
  return option
    .replace(/([A-Z])/g, ' $1') // insert a space before all caps
    .replace(/^./, (str) => str.toUpperCase()) // capitalize the first letter
    .trim();
};

// Calculate the value once outside of your component
const orderByOptions = Object.values(OrderByOption).map(option => ({ name: formatOptionName(option) }));

export const defaultFilters = (): FilterStates => ({
  totalStakersRange: { minValue: 0, maxValue: 1000 },
  totalStakedRange: { minValue: 0, maxValue: 99999 },
  isMinSupportMet: { isChecked: false, isIndeterminate: false },
  isMyStakedDAOs: { isChecked: false, isIndeterminate: false },
  orderBy: CHOOSE_ONE,
});

const DaoListFilters = (props: DaoListFiltersProps) => {
  const { isOpen } = props;
  const lsFilters = loadFiltersFromLocalStorage();
  const [filters, setFilters] = useState<FilterStates>(lsFilters);
  const [reset, setReset] = useState(false);
  const resetDefaultFilters = useRef(false);
  const { closeCurrentModal, openModals } = useModal(
    (state) => state,
    shallow
  );
  const [localMetadata, setLocalMetadata] = useState<DaoListFiltersMetadata | null>(null);
  const targetModal = openModals.find(modal => modal.name === modalName.FILTERS);
  const metadata = targetModal ? targetModal.metadata : undefined;

  const closeModal = useCallback(() => {
    closeCurrentModal();
  }, [closeCurrentModal]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters());
    setReset(true);
    resetDefaultFilters.current = true;
  }, []);

  const onReset = useCallback(() => {
    setReset(false);
  }, []);

  const onSelect = useCallback((value: { name: string; } | null) => {
    if (value) {
      const orderByKey = value.name.replace(/ /g, '_').toUpperCase() as keyof typeof OrderByOption;
      const orderBy = OrderByOption[orderByKey];
      if (orderBy) {
        setFilters((prevFilters) => ({ ...prevFilters, orderBy }));
      }
    }
  }, []);

  const applyFilters = useCallback(() => {
    try {
      if (!localMetadata || !localMetadata.updateFilters) {
        throw new Error('Metadata or updateFilters is not defined');
      }

      const { updateFilters } = localMetadata;

      if (typeof updateFilters !== 'function') {
        throw new Error('updateFilters is not a function');
      }

      updateFilters(filters, reset);
      saveFiltersToLocalStorage(filters);
    } catch (error) {
      console.error(error);
    } finally {
      closeModal();
    }
  }, [filters, localMetadata, closeModal, reset]);

  const handleMinSupportMetChange = useCallback((checked: boolean, indeterminate: boolean | undefined) => {
    if (checked || indeterminate) {
      setFilters(prevFilters => ({
        ...prevFilters,
        isMinSupportMet: { isChecked: checked, isIndeterminate: indeterminate },
        isMyStakedDAOs: { isChecked: false, isIndeterminate: false }
      }));
    }
  }, []);

  const handleMyStakedDAOsChange = useCallback((checked: boolean, indeterminate: boolean |
    undefined) => {
    if (checked || indeterminate) {
      setFilters(prevFilters => ({
        ...prevFilters,
        isMyStakedDAOs: { isChecked: checked, isIndeterminate: indeterminate },
        isMinSupportMet: { isChecked: false, isIndeterminate: false }
      }));
    }
  }, []);

  const handleTotalStakersMinChange = useCallback((newMinValue: number) => {
    setFilters(filters => ({ ...filters, totalStakersRange: { ...filters.totalStakersRange, minValue: newMinValue } }));
  }, []);

  const handleTotalStakersMaxChange = useCallback((newMaxValue: number) => {
    setFilters(filters => ({ ...filters, totalStakersRange: { ...filters.totalStakersRange, maxValue: newMaxValue } }));
  }, []);

  const handleTotalTNKRStakedMinChange = useCallback((newMinValue: number) => {
    setFilters(filters => ({ ...filters, totalStakedRange: { ...filters.totalStakedRange, minValue: newMinValue } }));
  }, []);

  const handleTotalTNKRStakedMaxChange = useCallback((newMaxValue: number) => {
    setFilters(filters => ({ ...filters, totalStakedRange: { ...filters.totalStakedRange, maxValue: newMaxValue } }));
  }, []);

  const calculateActiveFilterLength = (filters: FilterStates) => {
    let activeFilterCount = 0;

    // Check checkbox filters
    if (filters.isMinSupportMet.isChecked || filters.isMinSupportMet.isIndeterminate) {
      activeFilterCount++;
    }
    if (filters.isMyStakedDAOs.isChecked || filters.isMyStakedDAOs.isIndeterminate) {
      activeFilterCount++;
    }

    // Check range filters
    if (filters.totalStakersRange.minValue !== 0 || filters.totalStakersRange.maxValue !== 1000) {
      activeFilterCount++;
    }
    if (filters.totalStakedRange.minValue !== 0 || filters.totalStakedRange.maxValue !== 99999) {
      activeFilterCount++;
    }

    // Check orderBy filter
    if (filters.orderBy !== CHOOSE_ONE) {
      activeFilterCount++;
    }

    return activeFilterCount;
  };

  useEffect(() => {
    if (metadata) {
      setLocalMetadata(metadata as DaoListFiltersMetadata);
    }
    return () => {
      setLocalMetadata(null);
    };
  }, [metadata]);

  const currentValue = useMemo(() => ({ name: formatOptionName(filters.orderBy) }), [filters.orderBy]);

  const activeFilterCount = useMemo(() => calculateActiveFilterLength(filters), [filters]);

  if (!localMetadata) return null;

  const { updateFilters } = localMetadata;

  if (!updateFilters) return null;

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
                <h2 className="text-md font-bold text-white bg-tinkerDarkGrey mb-5 flex flex-row items-center gap-2">
                  <span>Refine Search Results</span>
                  {activeFilterCount > 0 && <span className="bg-tinkerYellow text-black px-[9px] py-[4px] rounded-full text-xs text-center">{activeFilterCount}</span>}
                </h2>
                <div className="text-white text-sm">
                  <div className="mb-1">Order By</div>
                  <Dropdown
                    onReset={onReset}
                    reset={reset}
                    list={orderByOptions}
                    onSelect={onSelect}
                    defaultOption={CHOOSE_ONE}
                    currentValue={currentValue}
                  />
                  {HR_BREAK}
                  <div>
                    <div className="text-sm text-white">Include/Don't Include</div>
                    <div className="flex flex-row justify-between">
                      <TriStateCheckbox
                        key={`MinSupportMet-${ filters.isMinSupportMet.isChecked }-${ filters.isMinSupportMet.isIndeterminate }`}
                        onReset={onReset}
                        reset={reset}
                        label="Min. Support Met"
                        checked={filters.isMinSupportMet.isChecked}
                        indeterminate={filters.isMinSupportMet.isIndeterminate}
                        onChange={handleMinSupportMetChange}
                      />
                      <TriStateCheckbox
                        key={`MyStakedDAOs-${ filters.isMyStakedDAOs.isChecked }-${ filters.isMyStakedDAOs.isIndeterminate }`}
                        onReset={onReset}
                        reset={reset}
                        label="My Staked DAOs"
                        checked={filters.isMyStakedDAOs.isChecked}
                        indeterminate={filters.isMyStakedDAOs.isIndeterminate}
                        onChange={handleMyStakedDAOsChange}
                      />
                    </div>
                  </div>
                  {HR_BREAK}
                  <div className="flex flex-col gap-3">
                    <MinMaxRange
                      label="Total Stakers"
                      min={0}
                      max={1000}
                      step={50}
                      minValue={filters.totalStakersRange.minValue}
                      maxValue={filters.totalStakersRange.maxValue}
                      onMinChange={handleTotalStakersMinChange}
                      onMaxChange={handleTotalStakersMaxChange}
                    />
                    <MinMaxRange
                      label="Total TNKR Staked"
                      min={0}
                      max={99999}
                      step={5000}
                      minValue={filters.totalStakedRange.minValue}
                      maxValue={filters.totalStakedRange.maxValue}
                      onMinChange={handleTotalTNKRStakedMinChange}
                      onMaxChange={handleTotalTNKRStakedMaxChange}
                    />
                  </div>
                  {HR_BREAK}
                </div>
              </div>
              <div onClick={resetFilters} className="text-center text-xs text-tinkerTextGrey hover:text-tinkerYellow hover:text-opacity-60 hover:underline hover:cursor-pointer hover:underline-offset-4">Reset Default Filters</div>
              <div>
                <Button variant="primary" mini onClick={applyFilters}>Apply Filters</Button>
              </div>
            </div>
          </>
        </Dialog.Panel>
      </>
    </Dialog>
  ) : null;
};

export default DaoListFilters;
