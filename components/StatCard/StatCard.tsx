import { ReactNode } from "react";
import styles from "./StatCard.module.css";

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  deltaText?: string;
  comparisonText: string;
  trend?: "up" | "down" | "neutral";
  tone?: "positive" | "negative" | "neutral";
};

export default function StatCard({
  icon,
  label,
  value,
  deltaText,
  comparisonText,
  trend = "up",
  tone = trend === "down" ? "negative" : "positive",
}: StatCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3>{label}</h3>

        <span className={styles.icon}>
          {icon}
        </span>
      </div>

      <div className={styles.valueRow}>
        <strong>{value}</strong>

        {deltaText ? (
          <span className={`${styles.badge} ${styles[tone]}`}>
            {trend !== "neutral" ? (
              <svg
                className={trend === "down" ? styles.arrowDown : undefined}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path d="M6 2 10 7H2Z" fill="currentColor" />
              </svg>
            ) : null}
            {deltaText}
          </span>
        ) : null}
      </div>

      <p className={styles.meta}>
        {comparisonText}
      </p>
    </article>
  );
}
