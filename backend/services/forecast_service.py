import calendar
from collections.abc import Iterable

from backend.models.schemas import EnergyRecord, ForecastResponse, MonthlyForecast
from backend.services.anomaly_service import anomaly_months
from backend.services.energy_service import FLOORS


def complete_sum(values: Iterable[float | int | None]) -> float | int | None:
    values = list(values)
    return None if not values or any(v is None for v in values) else sum(values)


def floor_forecast(records: list[EnergyRecord], floor_id: str,
                   method: str = "baseline_growth") -> ForecastResponse:
    if floor_id not in FLOORS:
        raise ValueError("Invalid floor")
    usage = {(r.year, r.month): r.energyKwh for r in records if r.floorId == floor_id}
    excluded = anomaly_months(floor_id)
    paired = [m for m in range(1, 13) if m not in excluded
              and usage.get((2025, m)) is not None and usage.get((2026, m)) is not None]
    baseline = sum(usage[(2025, m)] for m in paired)
    current = sum(usage[(2026, m)] for m in paired)
    growth = (current - baseline) / baseline if baseline > 0 else None
    history = [usage.get((2026, m)) for m in range(1, 13)]
    monthly = []
    for month in range(1, 13):
        actual25, actual26 = usage.get((2025, month)), usage.get((2026, month))
        if method == "moving_average_3_month":
            window = complete_sum(history[-3:])
            prediction = None if window is None else window / 3
            history.append(prediction)
        elif method == "baseline_growth":
            source = actual25 if month in excluded else actual26
            prediction = None if source is None or growth is None else source * (1 + growth) ** (2 if month in excluded else 1)
        else:
            raise ValueError("Unknown forecast method")
        monthly.append(MonthlyForecast(
            month=calendar.month_abbr[month], actual2025=actual25, actual2026=actual26,
            forecast2027=None if prediction is None else round(prediction),
            isAnomaly2026=month in excluded,
        ))
    return summarize("floor", floor_id, method, growth, monthly,
                     [calendar.month_name[m] for m in sorted(excluded)] if method == "baseline_growth" else [])


def summarize(scope, floor_id, method, growth, monthly, excluded) -> ForecastResponse:
    available = [(i, row.forecast2027) for i, row in enumerate(monthly, 1) if row.forecast2027 is not None]
    return ForecastResponse(
        scope=scope, floorId=floor_id, method=method, growthRate=growth,
        actual2025Total=complete_sum(row.actual2025 for row in monthly),
        actual2026Total=complete_sum(row.actual2026 for row in monthly),
        forecast2027Total=complete_sum(row.forecast2027 for row in monthly),
        highestForecastMonth=calendar.month_name[max(available, key=lambda p: p[1])[0]] if available else None,
        anomalyMonthsExcluded=excluded, monthly=monthly,
    )


def building_forecast(records: list[EnergyRecord]) -> ForecastResponse:
    floors = [floor_forecast(records, floor) for floor in FLOORS]
    monthly = [MonthlyForecast(
        month=calendar.month_abbr[m + 1],
        actual2025=complete_sum(f.monthly[m].actual2025 for f in floors),
        actual2026=complete_sum(f.monthly[m].actual2026 for f in floors),
        forecast2027=complete_sum(f.monthly[m].forecast2027 for f in floors),
        isAnomaly2026=any(f.monthly[m].isAnomaly2026 for f in floors),
    ) for m in range(12)]
    # Baseline-weighted normal growth, excluding each floor's abnormal periods.
    baseline = current = 0
    for floor in FLOORS:
        usage = {(r.year, r.month): r.energyKwh for r in records if r.floorId == floor}
        for m in range(1, 13):
            a, b = usage.get((2025, m)), usage.get((2026, m))
            if m not in anomaly_months(floor) and a is not None and b is not None:
                baseline += a
                current += b
    return summarize("building", None, "baseline_growth",
                     (current - baseline) / baseline if baseline > 0 else None, monthly,
                     [calendar.month_name[m] for m in sorted(set().union(*(anomaly_months(f) for f in FLOORS)))])
