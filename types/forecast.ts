export interface MonthlyForecast {
  month: string;
  actual2025: number | null;
  actual2026: number | null;
  forecast2027: number | null;
  isAnomaly2026: boolean;
}

export interface ElectricityForecast {
  scope: "floor" | "building";
  floorId: string | null;
  baselineYear: number;
  currentYear: number;
  forecastYear: number;
  method: "baseline_growth" | "moving_average_3_month";
  growthRate: number | null;
  actual2025Total: number | null;
  actual2026Total: number | null;
  forecast2027Total: number | null;
  highestForecastMonth: string | null;
  anomalyMonthsExcluded: string[];
  monthly: MonthlyForecast[];
}

export interface ForecastComparison {
  floorId: string;
  baselineGrowth: ElectricityForecast;
  movingAverage: ElectricityForecast;
}
