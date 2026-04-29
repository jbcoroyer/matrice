"use client";

import { Info, LucideIcon } from "lucide-react";

type NumberFieldProps = {
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  step?: number;
  tooltip?: string;
};

export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip">
      <Info size={11} />
      <span className="tooltip-popup">{text}</span>
    </span>
  );
}

export function NumberField({ label, value, onChange, suffix, hint, step = 1, tooltip }: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-top">
        <span className="field-label">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
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

export function TextField({ label, value, onChange, placeholder, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-top">
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      <div className="input-wrap">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input"
          style={{ paddingRight: "14px" }}
        />
      </div>
    </label>
  );
}

export function DateField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-top">
        <span className="field-label">{label}</span>
      </span>
      <div className="input-wrap">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          style={{ paddingRight: "14px" }}
        />
      </div>
    </label>
  );
}

export function ToggleField({ label, options, value, onChange }: {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      {label && (
        <div className="field-top">
          <span className="field-label">{label}</span>
        </div>
      )}
      <div className="toggle-group">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`toggle-btn ${value === o.value ? "toggle-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="field">
      <span className="field-top">
        <span className="field-label">{label}</span>
      </span>
      <div className="input-wrap">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          style={{ paddingRight: "14px", cursor: "pointer" }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
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

export function StatRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
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
