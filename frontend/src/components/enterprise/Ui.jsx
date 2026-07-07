import React from 'react';
import { motion } from 'framer-motion';

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

export const AmbientPage = ({ children, blobs = [] }) => (
  <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
    {blobs.map((blob) => (
      <div
        key={blob.key}
        className={`bg-blob ${blob.className}`}
        style={blob.style}
      />
    ))}
    <div className="grid-pattern absolute inset-0 opacity-35" />
    <div className="relative z-10 mx-auto w-full max-w-7xl">{children}</div>
  </div>
);

export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    className="mb-8 flex flex-col gap-5 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between"
  >
    <div className="max-w-3xl">
      {eyebrow ? (
        <div className="badge badge-cyan mb-3">{eyebrow}</div>
      ) : null}
      <h1 className="section-title text-[var(--text-primary)]">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
  </motion.div>
);

export const GlassPanel = ({
  children,
  className = '',
  motionProps = {},
}) => (
  <motion.div
    {...fadeUp}
    {...motionProps}
    className={`glass-card-static relative overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

export const SectionTitle = ({ title, subtitle, action }) => (
  <div className="mb-5 flex items-start justify-between gap-4">
    <div>
      <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-xs leading-6 text-[var(--text-muted)] sm:text-sm">
          {subtitle}
        </p>
      ) : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const MetricCard = ({
  icon,
  label,
  value,
  hint,
  accent = 'from-indigo-500/20 to-cyan-400/5',
  iconClassName = 'text-indigo-300',
}) => (
  <GlassPanel className={`rounded-[28px] p-5 sm:p-6`}>
    <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${accent} opacity-70`} />
    <div className="relative flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {label}
        </div>
        <div className="mt-3 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {value}
        </div>
        {hint ? (
          <div className="mt-2 text-xs text-[var(--text-secondary)]">{hint}</div>
        ) : null}
      </div>
      <div className={`rounded-2xl border border-white/10 bg-white/5 p-3 text-lg ${iconClassName}`}>
        {icon}
      </div>
    </div>
  </GlassPanel>
);

export const ProgressBar = ({ label, value, total = 100, color = '#6366f1', meta }) => {
  const safe = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="truncate font-medium text-[var(--text-secondary)]">{label}</div>
        <div className="shrink-0 font-semibold text-[var(--text-primary)]">
          {meta ?? `${Math.round(safe)}%`}
        </div>
      </div>
      <div className="progress-bar h-2.5">
        <div
          className="progress-fill"
          style={{
            width: `${safe}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>
    </div>
  );
};

export const EmptyState = ({ title, description, icon }) => (
  <div className="rounded-[24px] border border-white/8 bg-white/[0.02] px-6 py-10 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl text-[var(--text-muted)]">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
      {description}
    </p>
  </div>
);

export const TinyTrend = ({ points = [], stroke = '#6366f1', fill = 'rgba(99,102,241,0.14)' }) => {
  if (!points.length) {
    return <div className="h-16 rounded-2xl border border-white/8 bg-white/[0.02]" />;
  }

  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 220;
  const height = 64;
  const coords = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * width;
    const y = height - ((point - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const area = [`0,${height}`, ...coords, `${width},${height}`].join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
      <polygon points={area} fill={fill} />
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const SegmentedRing = ({ value = 0, label, sublabel, color = '#10b981' }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 108 108">
          <circle cx="54" cy="54" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
          <circle
            cx="54"
            cy="54"
            r={radius}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-black text-[var(--text-primary)]">{Math.round(value)}%</div>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{sublabel}</div>
      </div>
    </div>
  );
};

export const StatList = ({ items = [] }) => (
  <div className="space-y-3">
    {items.map((item) => (
      <div
        key={item.label}
        className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
      >
        <div className="text-sm text-[var(--text-secondary)]">{item.label}</div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{item.value}</div>
      </div>
    ))}
  </div>
);
