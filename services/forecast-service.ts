import type { ElectricityForecast, ForecastComparison } from "@/types/forecast";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_FORECAST_API_URL;
  if (!baseUrl) throw new Error("Set NEXT_PUBLIC_FORECAST_API_URL to connect the forecasting backend.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Forecast could not be loaded (${response.status}). Check the forecasting backend and workbooks.`);
  return response.json() as Promise<T>;
}

export function getForecast(floorId: string | null, signal?: AbortSignal) {
  return request<ElectricityForecast>(floorId
    ? `/api/forecast/floor/${encodeURIComponent(floorId)}`
    : "/api/forecast/building", signal);
}

export function getForecastComparison(floorId: string, signal?: AbortSignal) {
  return request<ForecastComparison>(`/api/forecast/floor/${encodeURIComponent(floorId)}/compare`, signal);
}
