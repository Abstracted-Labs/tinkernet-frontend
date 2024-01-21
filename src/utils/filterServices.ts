import { FilterStates, defaultFilters } from "../modals/DaoListFilters";

export const saveFiltersToLocalStorage = (filters: FilterStates) => {
  localStorage.setItem('daoListFilters', JSON.stringify(filters));
};

export const loadFiltersFromLocalStorage = (): FilterStates => {
  const savedFilters = localStorage.getItem('daoListFilters');
  return savedFilters ? JSON.parse(savedFilters) : defaultFilters();
};