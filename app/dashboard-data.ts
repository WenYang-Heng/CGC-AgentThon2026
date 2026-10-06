export type EnergyFloorData = {
  label: string;
  short: string;
  usageType: string;
  area: number;
  employees: number;
  peakDemand: number;
  demandValues: number[];
  values: number[];
  cost: number;
  costValues: number[];
};

export type EnergyDashboardData = {
  floors: Record<string, EnergyFloorData>;
  emissionFactor: number;
};
