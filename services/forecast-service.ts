import type { ElectricityForecast, ForecastComparison } from "@/types/forecast";

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "[::1]" || /^127\./.test(hostname);
}

function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FORECAST_API_URL?.trim();
  if (!configured) throw new Error("Set NEXT_PUBLIC_FORECAST_API_URL to connect the forecasting backend, then rebuild or restart the frontend.");
  let url: URL;
  try { url = new URL(configured); } catch {
    throw new Error("NEXT_PUBLIC_FORECAST_API_URL must be an absolute HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_FORECAST_API_URL must be an HTTP or HTTPS base URL without credentials, query parameters, or a fragment.");
  }
  const deployed = typeof window !== "undefined"
    ? !isLoopback(window.location.hostname)
    : process.env.NODE_ENV === "production";
  if (deployed && (isLoopback(url.hostname) || url.protocol !== "https:")) {
    throw new Error("NEXT_PUBLIC_FORECAST_API_URL must use a public HTTPS backend in production. Update the Vercel environment variable and redeploy.");
  }
  return url.toString().replace(/\/+$/, "");
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, { signal, cache: "no-store" });
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
