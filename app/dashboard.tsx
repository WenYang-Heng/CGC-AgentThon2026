"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Sidebar from "@/components/Sidebar/Sidebar";
import StatCard from "@/components/StatCard/StatCard";
import type {
  EnergyDashboardData,
  EnergyFloorData,
} from "./dashboard-data";
import styles from "./dashboard.module.css";

const sidebarItems = [
  {
    label: "Energy Explorer",
    href: "/",
    icon: <Icon name="explorer" />,
  },
  {
    label: "Report Energy Waste",
    href: "/report-energy-waste",
    icon: <Icon name="alert" />,
  },
  {
    label: "Cost",
    href: "#cost",
    icon: <Icon name="cost" />,
  },
  {
    label: "Sustainability",
    href: "#sustainability",
    icon: <Icon name="leaf" />,
  },
  {
    label: "Insights",
    href: "#insights",
    icon: <Icon name="insights" />,
  },
];

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const floorOptions = Array.from(
  { length: 16 },
  (_, index) => `Floor ${index + 1}`
);

type FloorId = string;
type FloorEntry = [FloorId, EnergyFloorData];

type Scope = "ALL" | FloorId;

type Metric =
  | "consumption"
  | "cost"
  | "intensity"
  | "demand"
  | "emissions";

type Comparison =
  | "building-average"
  | "previous-month"
  | "none";

type FloorSort = "usage" | "carbon" | "cost" | "demand";

type DashboardTab =
  | "summary"
  | "breakdown"
  | "comparison"
  | "demand"
  | "details"
  | "insights";

type IconName =
  | "bolt"
  | "explorer"
  | "building"
  | "cost"
  | "leaf"
  | "insights"
  | "menu"
  | "calendar"
  | "trend"
  | "trendDown"
  | "alert"
  | "spark"
  | "send"
  | "stack"
  | "chart"
  | "close"
  | "arrow";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />,

    explorer: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        <path d="m4 14 5-4 4 3 6-7" />
      </>
    ),

    building: (
      <path d="M4 21V7l8-4 8 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1M2 21h20" />
    ),

    cost: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .9-3 2s1.1 1.7 3 2.1 3 1 3 2.2-1.3 2.2-3.2 2.2c-1.2 0-2.4-.4-3.3-1.2M12 5v14" />
      </>
    ),

    leaf: (
      <>
        <path d="M20.5 3.5C12 3.7 5.1 7.2 4.3 13.2c-.5 3.7 2.4 6.8 6.1 6.3 6-.8 9.5-7.7 10.1-16Z" />
        <path d="M4 21c2.2-5.5 6.5-9.7 12.7-12.5" />
      </>
    ),

    insights: <path d="M4 20v-6M9 20V9M14 20v-4M19 20V4" />,

    menu: <path d="M4 7h16M4 12h16M4 17h16" />,

    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),

    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),

    trendDown: (
      <>
        <path d="m3 7 6 6 4-4 8 9" />
        <path d="M15 18h6v-6" />
      </>
    ),

    alert: (
      <>
        <path d="M12 3 2.8 19h18.4Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),

    spark: (
      <>
        <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
        <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
      </>
    ),

    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),

    stack: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 10v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
      </>
    ),

    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,

    close: <path d="m6 6 12 12M18 6 6 18" />,

    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const compactEnergy = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} GWh`;
  }

  if (value >= 100_000) {
    return `${(value / 1000).toFixed(1)} MWh`;
  }

  return `${Math.round(value).toLocaleString()} kWh`;
};

const money = (value: number) =>
  `RM ${value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;

function createAxisScale(maxValue: number, intervals = 4) {
  const rawStep = Math.max(maxValue, 0) / intervals;

  if (rawStep === 0) {
    return { majorUnit: 1, maximum: intervals };
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const niceStep =
    normalizedStep <= 1
      ? 1
      : normalizedStep <= 2
      ? 2
      : normalizedStep <= 2.5
      ? 2.5
      : normalizedStep <= 5
      ? 5
      : 10;
  const majorUnit = niceStep * magnitude;

  return {
    majorUnit,
    maximum: majorUnit * intervals,
  };
}

type ChartSeries = {
  id: string;
  label: string;
  values: readonly number[];
  color: string;
};

const floorLineColors = [
  "#0bb894", "#137be8", "#8b5cf6", "#f97316",
  "#e11d48", "#0891b2", "#65a30d", "#d97706",
  "#7c3aed", "#0284c7", "#be123c", "#0f766e",
  "#9333ea", "#2563eb", "#c2410c", "#4d7c0f",
] as const;

function LineChart({
  values,
  comparisonValues,
  label,
  formatTick = (value) => `${Math.round(value / 1000)}k`,
  formatValue = (value) => `${value.toLocaleString()} kWh`,
  activeMonthIndex,
  series,
}: {
  values: readonly number[];
  comparisonValues?: readonly number[];
  label: string;
  formatTick?: (value: number) => string;
  formatValue?: (value: number) => string;
  activeMonthIndex?: number;
  series?: ChartSeries[];
}) {
  const [hoveredIndex, setHoveredIndex] =
    useState<number | null>(null);

  const width = 760;
  const height = 280;
  const left = 58;
  const right = 18;
  const top = 28;
  const bottom = 42;

  const renderedSeries =
    series?.length
      ? series
      : [{ id: "total", label: "Total", values, color: "#0bb894" }];
  const allValues = [
    ...renderedSeries.flatMap((item) => item.values),
    ...(comparisonValues ?? []),
  ];

  const maxValue = Math.max(...allValues);
  const axisIntervals = 4;
  const axisScale = createAxisScale(maxValue, axisIntervals);
  const min = 0;
  const max = axisScale.maximum;

  const x = (index: number) =>
    left + (index * (width - left - right)) / 11;

  const y = (value: number) =>
    top +
    ((max - value) * (height - top - bottom)) /
      Math.max(max - min, 1);

  const comparisonPoints = comparisonValues
    ?.map(
      (value, index) => `${x(index)},${y(value)}`
    )
    .join(" ");

  const peak = Math.max(...values);
  const peakIndex = values.indexOf(peak);
  const highlightedIndex =
    hoveredIndex ?? activeMonthIndex ?? peakIndex;
  const highlightedValue = values[highlightedIndex] ?? 0;

  const ticks = Array.from(
    { length: axisIntervals + 1 },
    (_, index) => max - axisScale.majorUnit * index
  );

  return (
    <div className={styles.chartWrapper}>
      <svg
        className={styles.lineChart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        {ticks.map((tick, index) => (
          <g key={`tick-${index}-${tick}`}>
            <line
              x1={left}
              y1={y(tick)}
              x2={width - right}
              y2={y(tick)}
              className={styles.gridLine}
            />

            <text
              x={left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              className={styles.axisText}
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {months.map((month, index) => (
          <text
            key={month}
            x={x(index)}
            y={height - 13}
            textAnchor="middle"
            className={`${styles.axisText} ${
              index % 2
                ? styles.optionalTick
                : ""
            }`}
          >
            {month}
          </text>
        ))}

        {renderedSeries.length === 1 ? (
          <polygon
            points={`${left},${height - bottom} ${renderedSeries[0].values
              .map((value, index) => `${x(index)},${y(value)}`)
              .join(" ")} ${x(11)},${height - bottom}`}
            className={styles.chartArea}
          />
        ) : null}

        {comparisonPoints ? (
          <polyline
            points={comparisonPoints}
            className={styles.comparisonLine}
          />
        ) : null}

        {renderedSeries.map((item) => (
          <g key={item.id}>
            <polyline
              points={item.values
                .map((value, index) => `${x(index)},${y(value)}`)
                .join(" ")}
              pathLength="1"
              className={styles.chartLine}
              style={{ stroke: item.color }}
            />
            {item.values.map((value, index) => (
              <circle
                key={`${item.id}-${index}`}
                cx={x(index)}
                cy={y(value)}
                r={index === highlightedIndex ? 4.8 : 3.2}
                className={`${styles.chartPoint} ${
                  index === highlightedIndex
                    ? styles.selectedChartPoint
                    : ""
                }`}
                style={{ fill: item.color }}
              />
            ))}
          </g>
        ))}

        <line
          x1={x(highlightedIndex)}
          y1={top}
          x2={x(highlightedIndex)}
          y2={height - bottom}
          className={styles.chartHoverGuide}
        />

        <g
          className={styles.peakLabel}
          transform={`translate(${Math.min(
            width - 154,
            Math.max(left, x(highlightedIndex) - 60)
          )} ${Math.max(3, y(highlightedValue) - 49)})`}
        >
          <rect width="142" height="39" rx="8" />
          <text x="10" y="15">
            {months[highlightedIndex]} 2025
          </text>
          <text x="10" y="31">
            {formatValue(highlightedValue)}
          </text>
        </g>

        {values.map((value, index) => {
          const step = (width - left - right) / 11;
          const start =
            index === 0 ? left : x(index) - step / 2;
          const end =
            index === 11 ? width - right : x(index) + step / 2;

          return (
            <rect
              key={`hit-${index}`}
              x={start}
              y={top}
              width={end - start}
              height={height - top - bottom}
              className={styles.chartHitArea}
              tabIndex={0}
              role="button"
              aria-label={`${months[index]} 2025, ${formatValue(value)}`}
              onPointerEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>

      <div className={styles.seriesLegend} aria-label="Chart series">
        {renderedSeries.map((item) => (
          <span key={item.id}>
            <i style={{ backgroundColor: item.color }} />
            <b>{item.label}</b>
          </span>
        ))}
      </div>

      {comparisonValues ? (
        <div className={styles.chartLegend}>
          <span>
            <i className={styles.legendPrimary} />
            Selected
          </span>

          <span>
            <i className={styles.legendComparison} />
            Building average
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PanelHead({
  title,
  subtitle,
  unit,
  action,
}: {
  title: string;
  subtitle?: string;
  unit?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.panelHead}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {action ? action : unit ? (
        <span className={styles.unit}>{unit}</span>
      ) : null}
    </div>
  );
}

function FloorRanking({
  selected,
  metric,
  onSelect,
  floorEntries,
  emissionFactor,
  monthIndex,
}: {
  selected: Scope;
  metric: Metric;
  onSelect: (floor: FloorId) => void;
  floorEntries: FloorEntry[];
  emissionFactor: number;
  monthIndex: number;
}) {
  const ranked = useMemo(() => {
    return floorEntries
      .map(([id, floor]) => {
        const total = floor.values[monthIndex] ?? 0;

        const intensity = floor.area > 0 ? total / floor.area : 0;
        const cost = floor.costValues[monthIndex] ?? 0;
        const peakDemand = floor.demandValues[monthIndex] ?? 0;

        const emissions = total * emissionFactor;

        const metricValue =
          metric === "cost"
            ? cost
            : metric === "intensity"
            ? intensity
            : metric === "demand"
            ? peakDemand
            : metric === "emissions"
            ? emissions
            : total;

        return {
          id,
          ...floor,
          total,
          intensity,
          emissions,
          cost,
          peakDemand,
          metricValue,
        };
      })
      .sort(
        (a, b) => b.metricValue - a.metricValue
      );
  }, [emissionFactor, floorEntries, metric, monthIndex]);

  const maxValue = ranked[0]?.metricValue ?? 1;

  const formatValue = (
    floor: (typeof ranked)[number]
  ) => {
    switch (metric) {
      case "cost":
        return `RM ${(floor.cost / 1000).toFixed(
          1
        )}K`;

      case "intensity":
        return `${floor.intensity.toFixed(1)}`;

      case "demand":
        return `${floor.peakDemand} kW`;

      case "emissions":
        return `${Math.round(floor.emissions).toLocaleString()} kg`;

      default:
        return Math.round(
          floor.total
        ).toLocaleString();
    }
  };

  return (
    <div className={styles.ranking}>
      {ranked.map((floor) => (
        <button
          type="button"
          key={floor.id}
          className={`${styles.rankRow} ${
            selected === floor.id
              ? styles.selectedRank
              : ""
          }`}
          onClick={() => onSelect(floor.id)}
        >
          <span>{floor.short}</span>

          <span className={styles.rankTrack}>
            <i
              style={{
                width: `${
                  (floor.metricValue / maxValue) *
                  100
                }%`,
              }}
            />
          </span>

          <strong>{formatValue(floor)}</strong>
        </button>
      ))}
    </div>
  );
}

function FloorComparisonTable({
  selected,
  onSelect,
  sortBy,
  floorEntries,
  emissionFactor,
  monthIndex,
}: {
  selected: Scope;
  onSelect: (floor: FloorId) => void;
  sortBy: FloorSort;
  floorEntries: FloorEntry[];
  emissionFactor: number;
  monthIndex: number;
}) {
  const ranked = floorEntries
    .map(([id, floor]) => {
      const total = floor.values[monthIndex] ?? 0;

      const intensity = floor.area > 0 ? total / floor.area : 0;
      const cost = floor.costValues[monthIndex] ?? 0;
      const peakDemand = floor.demandValues[monthIndex] ?? 0;

      return {
        id,
        ...floor,
        total,
        intensity,
        carbon: total * emissionFactor,
        cost,
        peakDemand,
      };
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "carbon":
          return b.carbon - a.carbon;
        case "cost":
          return b.cost - a.cost;
        case "demand":
          return b.peakDemand - a.peakDemand;
        default:
          return b.total - a.total;
      }
    });

  const averageIntensity =
    ranked.reduce(
      (sum, floor) => sum + floor.intensity,
      0
    ) / ranked.length;

  return (
    <div className={styles.tableScroll}>
      <table className={styles.comparisonTable}>
        <thead>
          <tr>
            <th>Floor</th>
            <th>Electricity Usage</th>
            <th>Carbon Emissions (kgCO₂e)</th>
            <th>Cost</th>
            <th>Peak</th>
            <th>Employees</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {ranked.map((floor) => {
            const highIntensity =
              floor.intensity >
              averageIntensity * 1.1;

            return (
              <tr
                key={floor.id}
                className={
                  selected === floor.id
                    ? styles.selectedTableRow
                    : ""
                }
                onClick={() =>
                  onSelect(floor.id)
                }
              >
                <td>
                  <strong>{floor.short}</strong>
                </td>

                <td>
                  {Math.round(
                    floor.total
                  ).toLocaleString()}{" "}
                  kWh
                </td>

                <td>
                  {Math.round(floor.carbon).toLocaleString()}{" "}
                  kgCO₂e
                </td>

                <td>
                  {money(floor.cost)}
                </td>

                <td>
                  {floor.peakDemand} kW
                </td>

                <td>
                  {floor.employees}
                </td>

                <td>
                  <span
                    className={
                      highIntensity
                        ? styles.statusWarning
                        : styles.statusGood
                    }
                  >
                    {highIntensity
                      ? "Attention"
                      : "Normal"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Insight({
  icon,
  tone,
  title,
  copy,
  action,
  onClick,
}: {
  icon: IconName;
  tone:
    | "danger"
    | "warning"
    | "success";
  title: string;
  copy: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div>
      <span
        className={
          styles[`${tone}Icon`]
        }
      >
        <Icon name={icon} />
      </span>

      <p>
        <strong>{title}</strong>
        <small>{copy}</small>
      </p>

      <button onClick={onClick}>
        {action}
        <Icon name="arrow" size={11} />
      </button>
    </div>
  );
}

export default function EnergyDashboard({
  dashboardData,
}: {
  dashboardData: EnergyDashboardData;
}) {
  const { floors, emissionFactor } = dashboardData;

  const floorEntries = useMemo(
    () => Object.entries(floors) as FloorEntry[],
    [floors]
  );

  const portfolioValues = useMemo(
    () =>
      months.map((_, monthIndex) =>
        floorEntries.reduce(
          (sum, [, floor]) =>
            sum + (floor.values[monthIndex] ?? 0),
          0
        )
      ),
    [floorEntries]
  );

  const buildingAverageValues = useMemo(
    () =>
      portfolioValues.map(
        (value) => value / Math.max(floorEntries.length, 1)
      ),
    [floorEntries.length, portfolioValues]
  );
  const [scope, setScope] =
    useState<Scope>("ALL");

  const [selectedMonth, setSelectedMonth] =
    useState("0");

  const [monthPickerOpen, setMonthPickerOpen] =
    useState(false);

  const [floorPickerOpen, setFloorPickerOpen] =
    useState(false);

  const [appliedFloors, setAppliedFloors] =
    useState<string[]>(["ALL"]);

  const [draftFloors, setDraftFloors] =
    useState<string[]>(["ALL"]);

  const [comparison] = useState<Comparison>(
    "building-average"
  );

  const [activeTab] =
    useState<DashboardTab>("breakdown");

  const [floorSort, setFloorSort] =
    useState<FloorSort>("usage");

  const [mobileNavOpen, setMobileNavOpen] =
    useState(false);

  const [copilotOpen, setCopilotOpen] =
    useState(false);

  const [notice, setNotice] = useState<
    string | null
  >(null);

  const [question, setQuestion] =
    useState("");

  const [reply, setReply] = useState(
    "Select a suggested question or ask about the available 2025 energy data."
  );

  const menuButtonRef =
    useRef<HTMLButtonElement>(null);

  const copilotButtonRef =
    useRef<HTMLButtonElement>(null);

  const copilotCloseRef =
    useRef<HTMLButtonElement>(null);

  const floorPickerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!floorPickerOpen) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        floorPickerRef.current &&
        !floorPickerRef.current.contains(event.target as Node)
      ) {
        setDraftFloors(appliedFloors);
        setFloorPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOnOutsideClick
      );
    };
  }, [floorPickerOpen, appliedFloors]);

  const monthIndex = Number(selectedMonth);

  const filteredFloorEntries = useMemo(() => {
    if (appliedFloors.includes("ALL")) {
      return floorEntries;
    }

    return floorEntries.filter(([, floor]) =>
      appliedFloors.includes(floor.label)
    );
  }, [appliedFloors, floorEntries]);

  const scopedFloorEntries = useMemo(() => {
    const selectedFloor = scope === "ALL" ? undefined : floors[scope];

    return selectedFloor
      ? ([[scope, selectedFloor]] as FloorEntry[])
      : filteredFloorEntries;
  }, [filteredFloorEntries, floors, scope]);

  const data = useMemo(() => {
    const values = months.map((_, index) =>
      scopedFloorEntries.reduce(
        (sum, [, floor]) => sum + (floor.values[index] ?? 0),
        0
      )
    );
    const singleFloor = scopedFloorEntries.length === 1;

    return {
      label: singleFloor
        ? scopedFloorEntries[0][1].label
        : appliedFloors.includes("ALL")
        ? "All Floors"
        : `${scopedFloorEntries.length} Selected Floors`,
      values,
      total: values[monthIndex] ?? 0,
      cost: scopedFloorEntries.reduce(
        (sum, [, floor]) =>
          sum + (floor.costValues[monthIndex] ?? 0),
        0
      ),
      area: scopedFloorEntries.reduce(
        (sum, [, floor]) => sum + floor.area,
        0
      ),
      employees: scopedFloorEntries.reduce(
        (sum, [, floor]) => sum + floor.employees,
        0
      ),
      peakDemand: scopedFloorEntries.reduce(
        (sum, [, floor]) =>
          sum + (floor.demandValues[monthIndex] ?? 0),
        0
      ),
      usageType: singleFloor
        ? scopedFloorEntries[0][1].usageType
        : "Mixed",
    };
  }, [appliedFloors, monthIndex, scopedFloorEntries]);

  const peak = Math.max(...data.values);

  const peakIndex =
    data.values.indexOf(peak);

  const emissions =
    data.total * emissionFactor;

  const intensity =
    data.total / data.area;

  const previousMonthValue =
    monthIndex > 0 ? data.values[monthIndex - 1] : undefined;

  const latestChange = previousMonthValue
    ? ((data.total - previousMonthValue) / previousMonthValue) * 100
    : 0;

  const comparisonValues =
    scope !== "ALL" &&
    comparison === "building-average"
      ? buildingAverageValues
      : undefined;

  const carbonValues = data.values.map(
    (value) => value * emissionFactor
  );

  const carbonComparisonValues = comparisonValues?.map(
    (value) => value * emissionFactor
  );

  const electricitySeries: ChartSeries[] =
    appliedFloors.includes("ALL") && scope === "ALL"
      ? [
          {
            id: "all-floors",
            label: "All Floors",
            values: data.values,
            color: floorLineColors[0],
          },
        ]
      : scopedFloorEntries.map(([id, floor], index) => {
          const floorNumber = Number(id.replace(/\D/g, ""));

          return {
            id,
            label: floor.label,
            values: floor.values,
            color:
              floorLineColors[
                Number.isFinite(floorNumber) && floorNumber > 0
                  ? (floorNumber - 1) % floorLineColors.length
                  : index % floorLineColors.length
              ],
          };
        });

  const carbonSeries: ChartSeries[] = electricitySeries.map(
    (item) => ({
      ...item,
      values: item.values.map(
        (value) => value * emissionFactor
      ),
    })
  );

  const flash = (message: string) => {
    setNotice(message);

    window.setTimeout(
      () => setNotice(null),
      2600
    );
  };

  const selectFloor = (
    floor: FloorId
  ) => {
    setScope(floor);

    flash(
      `${floors[floor].label} selected`
    );
  };

  const ask = (prompt: string) => {
    setQuestion("");

    const lower =
      prompt.toLowerCase();

    if (
      lower.includes("most") ||
      lower.includes("highest floor")
    ) {
      setReply(
        "Level 10 currently has the highest annual electricity consumption in the available floor data."
      );

      return;
    }

    if (
      lower.includes("peak") ||
      lower.includes("higher")
    ) {
      setReply(
        `${months[peakIndex]} is the highest-consumption month in the current view at ${peak.toLocaleString()} kWh. Cooling schedules and after-hours equipment use are useful areas to investigate.`
      );

      return;
    }

    if (
      lower.includes("compare")
    ) {
      if (scope === "ALL") {
        setReply(
          "Select an individual floor to compare its monthly electricity profile with the building average."
        );
      } else {
        setReply(
          `${data.label} uses ${intensity.toFixed(
            1
          )} kWh/m² based on the available 2025 data. Use the comparison view to evaluate it against other floors.`
        );
      }

      return;
    }

    setReply(
      "Start by reviewing high-intensity floors, peak-demand periods, HVAC schedules, and equipment operating outside occupied hours."
    );
  };

  const submit = (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (question.trim()) {
      ask(question);
    }
  };

  const openCopilot = () => {
    setCopilotOpen(true);

    window.requestAnimationFrame(
      () =>
        copilotCloseRef.current?.focus()
    );
  };

  const closeCopilot = () => {
    setCopilotOpen(false);

    window.requestAnimationFrame(
      () =>
        copilotButtonRef.current?.focus()
    );
  };

  const closeNavigation = () => {
    setMobileNavOpen(false);

    window.requestAnimationFrame(
      () =>
        menuButtonRef.current?.focus()
    );
  };

  const trapCopilotFocus = (
    event: KeyboardEvent<HTMLElement>
  ) => {
    if (event.key === "Escape") {
      closeCopilot();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button, input, [href], select, [tabindex]:not([tabindex='-1'])"
      )
    ).filter(
      (element) =>
        !element.hasAttribute("disabled")
    );

    const first = focusable[0];
    const last =
      focusable[focusable.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last?.focus();
    }

    if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className={styles.appShell}>

      <Sidebar
        items={sidebarItems}
        activeHref="/"
        mobileOpen={mobileNavOpen}
        userInitials="HW"
        userName="Heng Wen"
        userSubtitle="Energy workspace"
      />

      <main
        className={styles.workspace}
        id="explorer"
      >
        <header
          className={styles.topbar}
        >
          <button
            ref={menuButtonRef}
            className={
              styles.mobileMenu
            }
            onClick={() =>
              setMobileNavOpen(
                !mobileNavOpen
              )
            }
            aria-label="Toggle navigation"
            aria-expanded={
              mobileNavOpen
            }
            aria-controls="primary-navigation"
          >
            <Icon
              name={
                mobileNavOpen
                  ? "close"
                  : "menu"
              }
            />
          </button>

          <div className={styles.pageTitle}>
            <h1>Dashboard</h1>
          </div>

          <div className={styles.headerPickers}>
            <div
              className={styles.monthPicker}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget
                )
              ) {
                setMonthPickerOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMonthPickerOpen(false);
              }
            }}
          >
            <button
              type="button"
              className={styles.monthPickerTrigger}
              aria-haspopup="dialog"
              aria-expanded={monthPickerOpen}
              aria-controls="dashboard-month-picker"
              onClick={() =>
                setMonthPickerOpen((open) => !open)
              }
            >
              <Icon name="calendar" size={17} />
              <span>{months[Number(selectedMonth)]} 2025</span>
              <i aria-hidden="true" />
            </button>

            {monthPickerOpen ? (
              <div
                id="dashboard-month-picker"
                className={styles.monthPickerPopover}
                role="dialog"
                aria-label="Choose a month in 2025"
              >
                <strong className={styles.monthPickerYear}>
                  2025
                </strong>

                <div className={styles.monthGrid}>
                  {monthNames.map((monthName, index) => {
                    const value = String(index);
                    const selected = selectedMonth === value;

                    return (
                      <button
                        type="button"
                        key={monthName}
                        className={
                          selected
                            ? styles.monthSelected
                            : undefined
                        }
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedMonth(value);
                          setMonthPickerOpen(false);
                        }}
                      >
                        {monthName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            </div>

            <div
              ref={floorPickerRef}
              className={styles.floorPicker}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDraftFloors(appliedFloors);
                  setFloorPickerOpen(false);
                }
              }}
            >
              <button
                type="button"
                className={styles.floorPickerTrigger}
                aria-haspopup="dialog"
                aria-expanded={floorPickerOpen}
                aria-controls="dashboard-floor-picker"
                onClick={() => {
                  setDraftFloors(appliedFloors);
                  setFloorPickerOpen((open) => !open);
                }}
              >
                <Icon name="building" size={17} />
                <span>
                  {appliedFloors.includes("ALL")
                    ? "All Floors"
                    : `${appliedFloors.length} Floors`}
                </span>
                <i aria-hidden="true" />
              </button>

              {floorPickerOpen ? (
                <div
                  id="dashboard-floor-picker"
                  className={styles.floorPickerPopover}
                  role="dialog"
                  aria-label="Choose floors"
                >
                  <div className={styles.floorPickerHead}>
                    <strong>Select floors</strong>
                  </div>

                  <div className={styles.floorOptions}>
                    <label className={styles.allFloorsOption}>
                      <input
                        type="checkbox"
                        checked={draftFloors.includes("ALL")}
                        onChange={() => setDraftFloors(["ALL"])}
                      />
                      <span>All Floors</span>
                    </label>

                    {floorOptions.map((floor) => (
                      <label key={floor}>
                        <input
                          type="checkbox"
                          checked={draftFloors.includes(floor)}
                          onChange={() => {
                            setDraftFloors((current) => {
                              const withoutAll = current.filter(
                                (item) => item !== "ALL"
                              );

                              return withoutAll.includes(floor)
                                ? withoutAll.filter(
                                    (item) => item !== floor
                                  )
                                : [...withoutAll, floor];
                            });
                          }}
                        />
                        <span>{floor}</span>
                      </label>
                    ))}
                  </div>

                  <div className={styles.floorPickerFooter}>
                    <span aria-live="polite">
                      {!draftFloors.includes("ALL") &&
                      draftFloors.length === 1
                        ? "Select 1 more floor"
                        : draftFloors.includes("ALL")
                        ? "All floors selected"
                        : `${draftFloors.length} floors selected`}
                    </span>
                    <div>
                      <button
                        type="button"
                        className={styles.floorCancel}
                        onClick={() => {
                          setDraftFloors(appliedFloors);
                          setFloorPickerOpen(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={styles.floorApply}
                        disabled={
                          !draftFloors.includes("ALL") &&
                          draftFloors.length < 2
                        }
                        onClick={() => {
                          setAppliedFloors(draftFloors);
                          setScope("ALL");
                          setFloorPickerOpen(false);
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section
          className={styles.metricsGrid}
          aria-label="Energy summary"
        >
          <StatCard
            icon={<Icon name="bolt" size={24} />}
            label={
              scope === "ALL"
                ? "Total Electricity"
                : "Floor Consumption"
            }
            value={compactEnergy(data.total)}
            deltaText={`${Math.abs(latestChange).toFixed(1)}%`}
            trend={latestChange <= 0 ? "down" : "up"}
            tone={latestChange <= 0 ? "positive" : "negative"}
            comparisonText="vs. previous month"
          />

          <StatCard
            icon={<Icon name="stack" size={24} />}
            label={
              scope === "ALL"
                ? "Electricity Cost"
                : "Floor Cost"
            }
            value={`RM ${(data.cost / 1000).toFixed(1)}K`}
            comparisonText="Based on 2025 billed records"
          />

          <StatCard
            icon={<Icon name="chart" size={24} />}
            label={
              scope === "ALL"
                ? "Peak Demand"
                : "Energy Intensity"
            }
            value={
              scope === "ALL"
                ? `${data.peakDemand.toLocaleString()} kW`
                : `${intensity.toFixed(1)} kWh/m²`
            }
            deltaText={scope === "ALL" ? "10.5%" : undefined}
            trend={scope === "ALL" ? "up" : "neutral"}
            tone={scope === "ALL" ? "negative" : "neutral"}
            comparisonText={
              scope === "ALL"
                ? `${months[peakIndex]} has the highest monthly usage`
                : "Normalized by floor area"
            }
          />

          <StatCard
            icon={
              <Icon
                name={scope === "ALL" ? "leaf" : "building"}
                size={24}
              />
            }
            label={
              scope === "ALL"
                ? "Carbon Emissions"
                : "Peak Demand"
            }
            value={
              scope === "ALL"
                ? `${Math.round(emissions).toLocaleString()} kgCO₂e`
                : `${data.peakDemand} kW`
            }
            comparisonText={
              scope === "ALL"
                ? `Estimated using ${emissionFactor} kgCO₂e/kWh`
                : `${data.employees} employees`
            }
          />
        </section>

        <section
          className={
            styles.analyticsGrid
          }
        >
          <article
            className={`${styles.panel} ${styles.consumptionPanel}`}
          >
            <PanelHead
              title="Monthly Electricity Consumption (kWh)"
              subtitle={`${data.label} · ${monthNames[monthIndex]} 2025 selected`}
            />

            <LineChart
              values={data.values}
              series={electricitySeries}
              activeMonthIndex={monthIndex}
              comparisonValues={
                comparisonValues
              }
              label={`${data.label} monthly electricity consumption in 2025`}
            />
          </article>

          <article
            className={`${styles.panel} ${styles.consumptionPanel} ${styles.carbonPanel}`}
          >
            <PanelHead
              title="Monthly Carbon Emissions (kgCO₂e)"
              subtitle={`${data.label} · ${monthNames[monthIndex]} 2025 selected`}
            />

            <LineChart
              values={carbonValues}
              series={carbonSeries}
              activeMonthIndex={monthIndex}
              comparisonValues={carbonComparisonValues}
              formatTick={(value) =>
                Math.round(value).toLocaleString()
              }
              formatValue={(value) =>
                `${value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kgCO₂e`
              }
              label={`${data.label} estimated monthly carbon emissions in 2025`}
            />
          </article>
        </section>

        <section
          className={
            styles.dynamicSection
          }
        >
          {activeTab ===
          "summary" ? (
            <div
              className={
                styles.summaryGrid
              }
            >
              <article
                className={styles.panel}
              >
                <PanelHead
                  title="Performance Summary"
                  subtitle={
                    scope === "ALL"
                      ? "Building-wide energy indicators"
                      : `${data.label} performance context`
                  }
                />

                <div
                  className={
                    styles.summaryStats
                  }
                >
                  <div>
                    <span>
                      Peak Month
                    </span>
                    <strong>
                      {
                        months[
                          peakIndex
                        ]
                      }{" "}
                      2025
                    </strong>
                  </div>

                  <div>
                    <span>
                      Peak Consumption
                    </span>
                    <strong>
                      {peak.toLocaleString()}{" "}
                      kWh
                    </strong>
                  </div>

                  <div>
                    <span>
                      Energy Intensity
                    </span>
                    <strong>
                      {intensity.toFixed(
                        1
                      )}{" "}
                      kWh/m²
                    </strong>
                  </div>

                  <div>
                    <span>
                      Employees
                    </span>
                    <strong>
                      {data.employees}
                    </strong>
                  </div>
                </div>
              </article>

              <article
                className={styles.panel}
              >
                <PanelHead
                  title="Current Context"
                  subtitle="Selected dashboard scope"
                />

                <div
                  className={
                    styles.detailsList
                  }
                >
                  <div>
                    <span>Building</span>
                    <strong>CGC</strong>
                  </div>

                  <div>
                    <span>Scope</span>
                    <strong>
                      {data.label}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Usage Type
                    </span>
                    <strong>
                      {data.usageType}
                    </strong>
                  </div>

                  <div>
                    <span>Area</span>
                    <strong>
                      {data.area.toLocaleString()}{" "}
                      m²
                    </strong>
                  </div>
                </div>
              </article>
            </div>
          ) : null}

          {activeTab ===
          "breakdown" ? (
            <div className={styles.comparisonBreakdown}>
              <article
                className={`${styles.panel} ${styles.floorComparisonPanel}`}
              >
                <PanelHead
                  title="Floor Comparison Breakdown"
                  subtitle={`${monthNames[monthIndex]} 2025 · ${filteredFloorEntries.length} floors`}
                  action={
                    <label className={styles.sortControl}>
                      <span>Sort by</span>
                      <select
                        value={floorSort}
                        onChange={(event) =>
                          setFloorSort(
                            event.target.value as FloorSort
                          )
                        }
                      >
                        <option value="usage">Electricity usage</option>
                        <option value="carbon">Carbon emissions</option>
                        <option value="cost">Cost</option>
                        <option value="demand">Peak demand</option>
                      </select>
                    </label>
                  }
                />

                <FloorComparisonTable
                  selected={scope}
                  sortBy={floorSort}
                  floorEntries={filteredFloorEntries}
                  emissionFactor={emissionFactor}
                  monthIndex={monthIndex}
                  onSelect={
                    selectFloor
                  }
                />
              </article>
            </div>
          ) : null}

          {activeTab ===
          "comparison" ? (
            <div
              className={
                styles.explorerGrid
              }
            >
              <article
                className={styles.panel}
              >
                <PanelHead
                  title="Selected Floor"
                  subtitle={
                    scope === "ALL"
                      ? "Choose a floor from the ranking"
                      : data.label
                  }
                />

                <div
                  className={
                    styles.comparisonHighlight
                  }
                >
                  {scope === "ALL" ? (
                    <p>
                      Select a floor to
                      compare it with the
                      building average.
                    </p>
                  ) : (
                    <>
                      <span>
                        Energy Intensity
                      </span>

                      <strong>
                        {intensity.toFixed(
                          1
                        )}{" "}
                        kWh/m²
                      </strong>

                      <small>
                        Building average
                        comparison shown in
                        the monthly chart.
                      </small>
                    </>
                  )}
                </div>
              </article>

              <article
                className={styles.panel}
              >
                <PanelHead
                  title="Floor Comparison"
                  subtitle="All available floors"
                />

                <FloorComparisonTable
                  selected={scope}
                  sortBy={floorSort}
                  floorEntries={filteredFloorEntries}
                  emissionFactor={emissionFactor}
                  monthIndex={monthIndex}
                  onSelect={
                    selectFloor
                  }
                />
              </article>
            </div>
          ) : null}

          {activeTab === "demand" ? (
            <div
              className={
                styles.explorerGrid
              }
            >
              <article
                className={styles.panel}
              >
                <PanelHead
                  title="Peak Demand by Floor"
                  subtitle="Maximum recorded electrical demand"
                  unit="kW"
                />

                <FloorRanking
                  selected={scope}
                  metric="demand"
                  floorEntries={filteredFloorEntries}
                  emissionFactor={emissionFactor}
                  monthIndex={monthIndex}
                  onSelect={
                    selectFloor
                  }
                />
              </article>

              <article
                className={styles.panel}
              >
                <PanelHead
                  title="Demand Summary"
                  subtitle="Peak-load context"
                />

                <div
                  className={
                    styles.summaryStats
                  }
                >
                  <div>
                    <span>
                      Selected Peak
                    </span>
                    <strong>
                      {data.peakDemand} kW
                    </strong>
                  </div>

                  <div>
                    <span>
                      Peak Month
                    </span>
                    <strong>
                      {
                        months[
                          peakIndex
                        ]
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Monthly Peak Usage
                    </span>
                    <strong>
                      {peak.toLocaleString()}{" "}
                      kWh
                    </strong>
                  </div>
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === "details" ? (
            <div
              className={
                styles.detailsGrid
              }
            >
              <article
                className={styles.panel}
              >
                <PanelHead
                  title="Floor Details"
                  subtitle={
                    scope === "ALL"
                      ? "Building portfolio summary"
                      : data.label
                  }
                />

                <div
                  className={
                    styles.detailsList
                  }
                >
                  <div>
                    <span>Scope</span>
                    <strong>
                      {data.label}
                    </strong>
                  </div>

                  <div>
                    <span>Area</span>
                    <strong>
                      {data.area.toLocaleString()}{" "}
                      m²
                    </strong>
                  </div>

                  <div>
                    <span>
                      Employees
                    </span>
                    <strong>
                      {data.employees}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Usage Type
                    </span>
                    <strong>
                      {data.usageType}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Annual Cost
                    </span>
                    <strong>
                      {money(
                        data.cost
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Emissions
                    </span>
                    <strong>
                      {Math.round(
                        emissions
                      ).toLocaleString()}{" "}
                      kgCO₂e
                    </strong>
                  </div>
                </div>
              </article>
            </div>
          ) : null}

          {activeTab ===
          "insights" ? (
            <article
              className={`${styles.panel} ${styles.insightsPanel}`}
              id="insights"
            >
              <PanelHead
                title="Energy Insights"
                subtitle="Signals translated into practical next steps"
              />

              <div
                className={
                  styles.insightList
                }
              >
                <Insight
                  icon="alert"
                  tone="danger"
                  title="High-consumption period"
                  copy={`${months[peakIndex]} recorded the highest usage in the current view at ${peak.toLocaleString()} kWh.`}
                  action="Investigate"
                  onClick={() =>
                    openCopilot()
                  }
                />

                <Insight
                  icon="building"
                  tone="warning"
                  title="Floor requires attention"
                  copy="Level 10 has the highest annual electricity consumption in the available floor records."
                  action="View floor"
                  onClick={() =>
                    selectFloor("F10")
                  }
                />

                <Insight
                  icon="trend"
                  tone="success"
                  title="Efficiency opportunity"
                  copy="Review high-intensity floors and equipment operating outside occupied hours."
                  action="Ask Copilot"
                  onClick={
                    openCopilot
                  }
                />
              </div>
            </article>
          ) : null}
        </section>

        <footer
          className={styles.footer}
          id="sustainability"
        >
          <span>
            Source: 2025 energy
            records in the CGC
            workbook.
          </span>

          <span>
            Emissions are estimates;
            confirm the applicable
            emission factor before
            production use.
          </span>
        </footer>
      </main>

      <button
        ref={copilotButtonRef}
        className={
          styles.copilotFloatingButton
        }
        onClick={openCopilot}
        aria-expanded={copilotOpen}
        aria-controls="energy-copilot"
      >
        <Icon
          name="spark"
          size={18}
        />
        Ask Copilot
      </button>

      <aside
        id="energy-copilot"
        className={`${styles.copilotRail} ${
          copilotOpen
            ? styles.copilotOpen
            : ""
        }`}
        aria-label="Energy Copilot"
        onKeyDown={
          trapCopilotFocus
        }
      >
        <div
          className={
            styles.copilotHead
          }
        >
          <span>
            <Icon name="spark" />
          </span>

          <div>
            <strong>
              Energy Copilot
            </strong>
            <small>Beta</small>
          </div>

          <button
            ref={copilotCloseRef}
            onClick={closeCopilot}
            aria-label="Close Energy Copilot"
          >
            <Icon
              name="close"
              size={18}
            />
          </button>
        </div>

        <div
          className={
            styles.copilotContext
          }
        >
          <span>Current context</span>
          <strong>
            {data.label} · 2025
          </strong>
        </div>

        <p
          className={
            styles.copilotIntro
          }
        >
          Ask questions about your
          electricity usage, floor
          performance and energy-saving
          opportunities.
        </p>

        <div
          className={styles.reply}
          aria-live="polite"
        >
          <Icon
            name="spark"
            size={17}
          />

          <p>{reply}</p>
        </div>

        <div
          className={styles.prompts}
        >
          {[
            "Why was usage higher in the peak month?",
            "Which floor consumes the most electricity?",
            "Compare this floor with the building average.",
            "Show energy-saving opportunities.",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() =>
                ask(prompt)
              }
            >
              {prompt}

              <Icon
                name="arrow"
                size={12}
              />
            </button>
          ))}
        </div>

        <form
          className={styles.askForm}
          onSubmit={submit}
        >
          <label htmlFor="copilot-question">
            Ask about your energy data
          </label>

          <div>
            <input
              id="copilot-question"
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value
                )
              }
              placeholder="Ask a question…"
            />

            <button
              type="submit"
              aria-label="Send question"
            >
              <Icon
                name="send"
                size={18}
              />
            </button>
          </div>
        </form>
      </aside>

      {mobileNavOpen ? (
        <button
          className={styles.scrim}
          aria-label="Close navigation"
          onClick={closeNavigation}
        />
      ) : null}

      {copilotOpen ? (
        <button
          className={
            styles.copilotScrim
          }
          aria-label="Close Energy Copilot"
          onClick={closeCopilot}
        />
      ) : null}

      {notice ? (
        <div
          className={styles.toast}
          role="status"
        >
          <span />
          {notice}
        </div>
      ) : null}
    </div>
  );
}
