const PLAN_STYLES = {
  free: 'from-slate-500 to-slate-600',
  pro: 'from-blue-500 to-cyan-500',
  premium: 'from-purple-500 to-fuchsia-500',
  ultimate: 'from-amber-400 to-orange-500',
};

export default function PremiumBadge({ plan = 'free', size = 'sm' }) {
  const slug = (plan || 'free').toLowerCase();
  const gradient = PLAN_STYLES[slug] || PLAN_STYLES.free;
  const sizeClass = size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`premium-badge inline-flex items-center rounded-full bg-gradient-to-r ${gradient} font-bold uppercase tracking-wide text-white ${sizeClass}`}>
      {slug}
    </span>
  );
}
