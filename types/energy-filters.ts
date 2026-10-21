export type EnergyPeriod = { year: number; startMonth: number; endMonth: number };
export type EnergyFilterState = { period: EnergyPeriod; floorIds: string[] | null };
