import React from 'react';
import { motion } from 'framer-motion';

// ── Shimmer base ──────────────────────────────────────────────────
const Shimmer = ({ style = {}, className = '' }) => (
  <div
    className={className}
    style={{
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.8s ease-in-out infinite',
      borderRadius: 8,
      ...style,
    }}
  />
);

// ── Card Skeleton ─────────────────────────────────────────────────
export const CardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      padding: 24,
      overflow: 'hidden',
    }}
  >
    <Shimmer style={{ height: 160, marginBottom: 16, borderRadius: 12 }} />
    <Shimmer style={{ height: 20, width: '70%', marginBottom: 10 }} />
    <Shimmer style={{ height: 14, width: '45%', marginBottom: 16 }} />
    <div style={{ display: 'flex', gap: 8 }}>
      <Shimmer style={{ height: 34, flex: 1 }} />
      <Shimmer style={{ height: 34, flex: 1 }} />
    </div>
    <style>{`
      @keyframes shimmer {
        0% { background-position: -800px 0; }
        100% { background-position: 800px 0; }
      }
    `}</style>
  </motion.div>
);

// ── Question Skeleton ─────────────────────────────────────────────
export const QuestionSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      padding: 28,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
      <Shimmer style={{ height: 16, width: 80 }} />
      <Shimmer style={{ height: 16, width: 60 }} />
    </div>
    <Shimmer style={{ height: 24, marginBottom: 8 }} />
    <Shimmer style={{ height: 24, width: '80%', marginBottom: 24 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map(i => (
        <Shimmer key={i} style={{ height: 52, borderRadius: 12 }} />
      ))}
    </div>
  </motion.div>
);

// ── Table Skeleton ────────────────────────────────────────────────
export const TableSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      padding: 24,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
      <Shimmer style={{ height: 28, width: '25%' }} />
      <Shimmer style={{ height: 36, width: '15%' }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
          <Shimmer style={{ height: 16, width: '35%' }} />
          <Shimmer style={{ height: 16, width: '15%', marginLeft: 'auto' }} />
          <Shimmer style={{ height: 16, width: 60 }} />
        </div>
      ))}
    </div>
  </motion.div>
);

// ── Stat Card Skeleton ────────────────────────────────────────────
export const StatCardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      padding: 24,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Shimmer style={{ height: 12, width: 80 }} />
      <Shimmer style={{ height: 36, width: 36, borderRadius: 10 }} />
    </div>
    <Shimmer style={{ height: 32, width: '60%', marginBottom: 8 }} />
    <Shimmer style={{ height: 10, width: 50 }} />
  </motion.div>
);

// ── List Item Skeleton ────────────────────────────────────────────
export const ListItemSkeleton = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
  }}>
    <Shimmer style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <Shimmer style={{ height: 14, width: '60%', marginBottom: 6 }} />
      <Shimmer style={{ height: 10, width: '40%' }} />
    </div>
    <Shimmer style={{ height: 14, width: 50 }} />
  </div>
);

// ── Dashboard Skeleton ────────────────────────────────────────────
export const DashboardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {/* Stat cards row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
    </div>

    {/* Content row */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TableSkeleton />
        <TableSkeleton />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CardSkeleton />
      </div>
    </div>
  </div>
);
