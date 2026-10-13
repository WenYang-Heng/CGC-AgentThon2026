from typing import Literal

from pydantic import BaseModel


class EnergyRecord(BaseModel):
    floorId: str
    year: int
    month: int
    energyKwh: float | None


class MonthlyForecast(BaseModel):
    month: str
    actual2025: float | None
    actual2026: float | None
    forecast2027: int | None
    isAnomaly2026: bool


class ForecastResponse(BaseModel):
    scope: Literal["floor", "building"]
    floorId: str | None = None
    baselineYear: int = 2025
    currentYear: int = 2026
    forecastYear: int = 2027
    method: Literal["baseline_growth", "moving_average_3_month"]
    growthRate: float | None
    actual2025Total: float | None
    actual2026Total: float | None
    forecast2027Total: int | None
    highestForecastMonth: str | None
    anomalyMonthsExcluded: list[str]
    monthly: list[MonthlyForecast]


class ComparisonResponse(BaseModel):
    floorId: str
    baselineGrowth: ForecastResponse
    movingAverage: ForecastResponse


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
