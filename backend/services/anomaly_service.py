ANOMALY_MONTHS = {"F04": {7}, "F05": {9}, "F08": {3}, "F12": {5}}


def anomaly_months(floor_id: str) -> set[int]:
    return ANOMALY_MONTHS.get(floor_id, set())
