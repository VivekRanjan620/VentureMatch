import { create } from 'zustand';
import { FilterState } from './types';
import { SkillType, AvailabilityType } from '../profile/types';
import { StageType } from './types';

export interface RequirementFilterStore {
  searchQuery: string;
  filters: FilterState;
  activeFilterCount: number;

  setSearchQuery: (q: string) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
}

const initialFilters: FilterState = {
  skill: undefined,
  stage: undefined,
  commitment: undefined,
  location: undefined,
  remote: undefined,
};

function calculateActiveCount(filters: FilterState): number {
  let count = 0;
  if (filters.skill) count++;
  if (filters.stage) count++;
  if (filters.commitment) count++;
  if (filters.location && filters.location.trim().length > 0) count++;
  if (typeof filters.remote === 'boolean') count++;
  return count;
}

export const useRequirementFilterStore = create<RequirementFilterStore>((set) => ({
  searchQuery: '',
  filters: initialFilters,
  activeFilterCount: 0,

  setSearchQuery: (q: string) => {
    set({ searchQuery: q });
  },

  setFilter: (key, value) => {
    set((state) => {
      const newFilters = { ...state.filters, [key]: value };
      return {
        filters: newFilters,
        activeFilterCount: calculateActiveCount(newFilters),
      };
    });
  },

  setFilters: (newFilters: FilterState) => {
    set({
      filters: newFilters,
      activeFilterCount: calculateActiveCount(newFilters),
    });
  },

  resetFilters: () => {
    set({
      filters: initialFilters,
      activeFilterCount: 0,
    });
  },
}));
