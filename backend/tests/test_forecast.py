import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.main import app
from backend.models.schemas import EnergyRecord
from backend.services.energy_service import FLOORS, load_energy_data
from backend.services.forecast_service import building_forecast, floor_forecast


def fixture():
    return [EnergyRecord(floorId=f, year=y, month=m, energyKwh=100 if y == 2025 else 110)
            for f in FLOORS for y in (2025, 2026) for m in range(1, 13)]


class ForecastTests(unittest.TestCase):
    def test_anomaly_does_not_affect_growth_or_prediction(self):
        records = fixture()
        for record in records:
            if (record.floorId, record.year, record.month) == ("F04", 2026, 7):
                record.energyKwh = 9999
        forecast = floor_forecast(records, "F04")
        self.assertAlmostEqual(forecast.growthRate, 0.1)
        self.assertEqual(forecast.monthly[6].forecast2027, 121)
        self.assertEqual(forecast.anomalyMonthsExcluded, ["July"])
        self.assertEqual(forecast.actual2026Total, 11209)

    def test_missing_values_and_zero_baseline(self):
        records = fixture()
        records[0].energyKwh = None
        forecast = floor_forecast(records, "F01")
        self.assertIsNone(forecast.actual2025Total)
        self.assertAlmostEqual(forecast.growthRate, 0.1)
        self.assertIsNone(building_forecast(records).monthly[0].actual2025)
        for record in records:
            if record.year == 2025:
                record.energyKwh = 0
        self.assertIsNone(floor_forecast(records, "F01").forecast2027Total)

    def test_recursive_moving_average(self):
        records = fixture()
        for record in records:
            if record.floorId == "F01" and record.year == 2026 and record.month >= 10:
                record.energyKwh = {10: 90, 11: 120, 12: 150}[record.month]
        forecast = floor_forecast(records, "F01", "moving_average_3_month")
        self.assertEqual([r.forecast2027 for r in forecast.monthly[:3]], [120, 130, 133])

    def test_workbooks_and_building_aggregation(self):
        records = load_energy_data()
        self.assertEqual(len(records), 384)
        building = building_forecast(records)
        floors = [floor_forecast(records, f) for f in FLOORS]
        for month in range(12):
            self.assertEqual(building.monthly[month].forecast2027,
                             sum(f.monthly[month].forecast2027 for f in floors))
        for floor, month in [("F04", 7), ("F05", 9), ("F08", 3), ("F12", 5)]:
            forecast = floor_forecast(records, floor)
            row = forecast.monthly[month - 1]
            self.assertEqual(row.forecast2027, round(row.actual2025 * (1 + forecast.growthRate) ** 2))

    def test_endpoints_and_cors(self):
        client = TestClient(app)
        self.assertEqual(client.get("/api/health").json(), {"status": "ok"})
        self.assertEqual(client.get("/api/forecast/floor/F17").status_code, 404)
        self.assertEqual(client.get("/api/forecast/floor/F17/compare").status_code, 404)
        with patch("backend.main.load_energy_data", return_value=fixture()):
            for path in ["/api/forecast/building", "/api/forecast/floor/F04", "/api/forecast/floor/F04/compare"]:
                response = client.get(path, headers={"Origin": "http://localhost:3000"})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")
        with patch("backend.main.load_energy_data", side_effect=ValueError("bad sheet")):
            self.assertEqual(client.get("/api/forecast/building").status_code, 503)


if __name__ == "__main__":
    unittest.main()
