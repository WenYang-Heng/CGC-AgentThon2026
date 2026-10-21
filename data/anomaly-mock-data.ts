import type { EnergyAnomaly } from "@/types/anomaly";

// Monthly scenarios and consumption from CGC_Energy_2026_Mock_Only.xlsx:
// Energy_Data_2026_Mock and Data_Issue_Log_2026_Mock. Not utility readings.
// No expected monthly consumption is supplied; no deviation is inferred.
export const anomalyMockData: { anomalies: EnergyAnomaly[] } = {
  "anomalies": [
    {
      "id": "MOCK-F04-2026-07",
      "floorId": "F04",
      "floorName": "Floor 4",
      "month": "July 2026",
      "severity": "high",
      "actualKWh": 9925,
      "expectedKWh": null,
      "deviationPercent": null,
      "type": "High Consumption / Cooling Load",
      "description": "July consumption is elevated in the prototype cooling-load scenario.",
      "possibleCauses": [
        "Cooling demand",
        "Continuous IT load"
      ],
      "recommendedAction": "Review cooling operation and continuous equipment loads.",
      "status": "Unresolved"
    },
    {
      "id": "MOCK-F05-2026-09",
      "floorId": "F05",
      "floorName": "Floor 5",
      "month": "September 2026",
      "severity": "medium",
      "actualKWh": 10877,
      "expectedKWh": null,
      "deviationPercent": null,
      "type": "After-hours Consumption",
      "description": "Elevated September consumption may warrant an operating-schedule review; monthly readings do not establish when energy was used.",
      "possibleCauses": [
        "Extended equipment operation",
        "Continuous IT load"
      ],
      "recommendedAction": "Review equipment schedules and confirm operating hours before attributing usage to after-hours activity.",
      "status": "Unresolved"
    },
    {
      "id": "MOCK-F08-2026-03",
      "floorId": "F08",
      "floorName": "Floor 8",
      "month": "March 2026",
      "severity": "low",
      "actualKWh": 6592,
      "expectedKWh": null,
      "deviationPercent": null,
      "type": "Unexpected Usage Drop",
      "description": "March consumption was reduced in the prototype partial-occupancy scenario.",
      "possibleCauses": [
        "Partial occupancy",
        "Reduced equipment operation"
      ],
      "recommendedAction": "Validate monthly consumption against occupancy and metering records.",
      "status": "Resolved"
    },
    {
      "id": "MOCK-F12-2026-05",
      "floorId": "F12",
      "floorName": "Floor 12",
      "month": "May 2026",
      "severity": "medium",
      "actualKWh": 7752,
      "expectedKWh": null,
      "deviationPercent": null,
      "type": "Meter Reconciliation",
      "description": "May includes a prototype meter-reconciliation correction and billing credit; this is not evidence of energy waste.",
      "possibleCauses": [
        "Meter adjustment",
        "Billing reconciliation"
      ],
      "recommendedAction": "Review meter and billing adjustments before interpreting the monthly change.",
      "status": "Resolved"
    }
  ]
};
