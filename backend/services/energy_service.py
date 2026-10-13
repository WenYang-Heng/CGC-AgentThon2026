from pathlib import Path

from backend.models.schemas import EnergyRecord

FLOORS = tuple(f"F{i:02d}" for i in range(1, 17))
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
WORKBOOKS = (
    ("CGC_Energy_AgentThon_Data_Template_1.xlsx", "Energy_Data", 2025),
    ("CGC_Energy_2026_Mock_Only.xlsx", "Energy_Data_2026_Mock", 2026),
)


def load_energy_data(data_dir: Path = DATA_DIR) -> list[EnergyRecord]:
    """Read the inspected sheets (two title rows before the header).

    Reindex all floor/month pairs so absent rows remain explicitly unknown.
    No workbook values are filled with zero.
    """
    import pandas as pd

    records = []
    for filename, sheet, year in WORKBOOKS:
        frame = pd.read_excel(data_dir / filename, sheet_name=sheet, header=2)
        required = {"Floor_ID", "Month", "Electricity_kWh"}
        if not required.issubset(frame.columns):
            raise ValueError(f"{filename}/{sheet}: missing columns {required - set(frame.columns)}")
        frame = frame[frame["Floor_ID"].isin(FLOORS)].copy()
        # openpyxl decodes Excel date cells; also accept unformatted serial dates.
        dates = frame["Month"].map(
            lambda value: pd.to_datetime(value, unit="D", origin="1899-12-30")
            if isinstance(value, (int, float)) else pd.to_datetime(value)
        )
        if dates.isna().any() or (dates.dt.year != year).any():
            raise ValueError(f"{filename}/{sheet}: invalid reporting dates")
        frame["month"] = dates.dt.month
        frame["energyKwh"] = pd.to_numeric(frame["Electricity_kWh"], errors="raise")
        if (frame["energyKwh"].dropna() < 0).any():
            raise ValueError(f"{filename}/{sheet}: negative electricity usage")
        if frame.duplicated(["Floor_ID", "month"]).any():
            raise ValueError(f"{filename}/{sheet}: duplicate floor/month records")
        indexed = frame.set_index(["Floor_ID", "month"])["energyKwh"]
        for floor in FLOORS:
            for month in range(1, 13):
                value = indexed.get((floor, month))
                records.append(EnergyRecord(
                    floorId=floor, year=year, month=month,
                    energyKwh=None if pd.isna(value) else float(value),
                ))
    return records
