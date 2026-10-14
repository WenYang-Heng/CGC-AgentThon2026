import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.models.schemas import ComparisonResponse, ForecastResponse, HealthResponse
from backend.services.energy_service import FLOORS, load_energy_data
from backend.services.forecast_service import building_forecast, floor_forecast

app = FastAPI(title="CGC Electricity Forecast")
app.add_middleware(CORSMiddleware, allow_origins=[
                       "http://localhost:3000",
                       "https://cgc-agent-thon2026.vercel.app",
                   ],
                   allow_methods=["GET"], allow_headers=["*"])


def energy_records():
    try:
        return load_energy_data()
    except (OSError, ValueError, KeyError, ImportError) as exc:
        logging.getLogger(__name__).exception("Unable to read energy workbooks")
        raise HTTPException(503, "Energy workbooks are unavailable or invalid") from exc


def validate_floor(floor_id: str):
    if floor_id not in FLOORS:
        raise HTTPException(404, "Floor not found; use F01-F16")


@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse()


@app.get("/api/forecast/building", response_model=ForecastResponse)
def building():
    return building_forecast(energy_records())


@app.get("/api/forecast/floor/{floor_id}", response_model=ForecastResponse)
def floor(floor_id: str):
    validate_floor(floor_id)
    return floor_forecast(energy_records(), floor_id)


@app.get("/api/forecast/floor/{floor_id}/compare", response_model=ComparisonResponse)
def compare(floor_id: str):
    validate_floor(floor_id)
    records = energy_records()
    return ComparisonResponse(floorId=floor_id,
                              baselineGrowth=floor_forecast(records, floor_id),
                              movingAverage=floor_forecast(records, floor_id, "moving_average_3_month"))
