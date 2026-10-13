import type { EnergyAnomaly } from "@/types/anomaly";

// Prototype anomaly examples only; these are not calculated from the forecasting API.
export const anomalyMockData: { anomalies: EnergyAnomaly[] } = {
  anomalies: [
    { id: "AN-104", floor: "Floor 4", startTime: "6:00 PM", endTime: "9:00 PM", severity: "high", baselineDeviation: 28, description: "Energy remained unusually high after office hours.", possibleCauses: ["Extended AHU operating hours", "Lighting not switched off"], recommendedAction: "Review Floor 4 AHU and lighting schedules." },
    { id: "AN-103", floor: "Floor 3", startTime: "1:30 PM", endTime: "4:00 PM", severity: "high", baselineDeviation: 21, description: "Cooling demand stayed above its expected occupied-period range.", possibleCauses: ["Cooling-system inefficiency", "Higher occupancy"], recommendedAction: "Inspect cooling performance and confirm occupancy conditions." },
    { id: "AN-102", floor: "Floor 2", startTime: "7:00 PM", endTime: "8:30 PM", severity: "medium", baselineDeviation: 16, description: "Lighting load persisted after the usual closing period.", possibleCauses: ["Lighting left on", "After-office-hour usage"], recommendedAction: "Check timer schedules and floor-closing procedures." },
    { id: "AN-101", floor: "Floor 5", startTime: "8:00 AM", endTime: "10:00 AM", severity: "medium", baselineDeviation: 12, description: "Morning startup demand increased faster than the normal profile.", possibleCauses: ["Extended AHU operating hours"], recommendedAction: "Review equipment start-up sequencing." },
    { id: "AN-100", floor: "Floor 1", startTime: "12:00 PM", endTime: "1:00 PM", severity: "low", baselineDeviation: 8, description: "A short demand increase occurred during the lunch period.", possibleCauses: ["Higher occupancy"], recommendedAction: "Monitor the same period over the next five working days." },
  ],
};
