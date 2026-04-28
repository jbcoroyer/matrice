"use client";

import { LucideIcon } from "lucide-react";

type NumberFieldProps = {
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  step?: number;
};

export function NumberField({ label, value, onChange, suffix, hint, step = 1 }: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-top">
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      <div className="input-wrap">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="input"
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </label>
  );
}

export function PercentField(props: Omit<NumberFieldProps, "onChange" | "value"> & { value: number; onChange: (value: number) => void }) {
  return <NumberField {...props} value={(props.value * 100).toFixed(2)} onChange={(v) => props.onChange(v / 100)} suffix="%" step={0.1} />;
}

export function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      {title && (
        <header className="card-header">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`kpi ${highlight ? "kpi-highlight" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

export function StatRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`stat-row ${strong ? "stat-strong" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button className={`tab-btn ${active ? "tab-active" : ""}`} onClick={onClick}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
