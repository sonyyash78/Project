import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaBell,
  FaBookOpen,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaCrown,
  FaFire,
  FaGlobeAsia,
  FaHistory,
  FaLock,
  FaMoon,
  FaRegBookmark,
  FaShieldAlt,
  FaStar,
  FaSun,
  FaTrophy,
  FaUser,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authService, examEngineService, progressService, subscriptionService, paymentService, invoiceService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AmbientPage, EmptyState, GlassPanel, MetricCard, PageHeader, ProgressBar, SectionTitle } from '../components/enterprise/Ui';

const tabs = [
  { id: 'overview', label: 'Overview', icon: <FaUser /> },
  { id: 'bookmarks', label: 'Bookmarks', icon: <FaRegBookmark /> },
  { id: 'activity', label: 'Activity', icon: <FaHistory /> },
  { id: 'security', label: 'Security', icon: <FaLock /> },
  { id: 'subscription', label: 'Subscription', icon: <FaCrown /> },
];

const achievementBadges = [
  { title: '7-Day Streak', tone: 'from-rose-500/20 to-orange-400/5' },
  { title: 'Mock Specialist', tone: 'from-indigo-500/20 to-cyan-400/5' },
  { title: 'Precision Solver', tone: 'from-emerald-500/20 to-cyan-400/5' },
];

const Profile = () => {
  const { user, updateUser, logout, subscription, refreshSubscription } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [profileForm, setProfileForm] = useState({
    name: '',
    language: 'en',
    timezone: 'Asia/Kolkata',
    notification_enabled: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setProfileForm({
      name: user.name || '',
      language: user.language || 'en',
      timezone: user.timezone || 'Asia/Kolkata',
      notification_enabled: user.notification_enabled !== false,
    });
  }, [navigate, user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [dash, analyticsBundle, marks, activityLog, sessionList] = await Promise.all([
          progressService.getDashboard().catch(() => null),
          examEngineService.getAnalyticsDashboard().catch(() => null),
          progressService.getBookmarks().catch(() => []),
          authService.getActivity(20, 0).catch(() => []),
          authService.getSessions().catch(() => []),
        ]);
        setDashboard(dash);
        setAnalytics(analyticsBundle);
        setBookmarks(Array.isArray(marks) ? marks : []);
        setActivity(Array.isArray(activityLog) ? activityLog : []);
        setSessions(Array.isArray(sessionList) ? sessionList : []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load your profile workspace.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const [subLoading, setSubLoading] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!userId || activeTab !== 'subscription') return;
    let cancelled = false;
    const loadSub = async () => {
      setSubLoading(true);
      try {
        const [payData, invData] = await Promise.all([
          paymentService.getHistory(1, 10).catch(() => ({ items: [] })),
          invoiceService.list(1, 10).catch(() => ({ invoices: [] })),
        ]);
        if (!cancelled) {
          setPayments(payData?.items || payData?.payments || []);
          setInvoices(invData?.invoices || invData?.items || []);
        }
      } catch {
        /* individual catches above already handle errors */
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    };
    loadSub();
    return () => { cancelled = true; };
  }, [userId, activeTab]);

  const xp = useMemo(() => {
    if (!dashboard) return 120;
    return Math.max(140, Math.round((dashboard.total_tests_attempted || 0) * 80 + (dashboard.overall_accuracy || 0) * 4));
  }, [dashboard]);

  const coins = useMemo(() => {
    if (!dashboard) return 65;
    return Math.max(65, Math.round((dashboard.average_score || 0) * 2 + (dashboard.total_bookmarks || 0) * 6));
  }, [dashboard]);

  const saveProfile = async () => {
    try {
      const updated = await authService.updateProfile(profileForm);
      updateUser(updated);
      toast.success('Profile preferences updated.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not update profile.');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    try {
      await authService.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not change password.');
    }
  };

  if (!user) return null;

  return (
    <AmbientPage
      blobs={[
        { key: 'profile-indigo', className: 'blob-indigo', style: { top: '4%', left: '-8%', opacity: 0.12 } },
        { key: 'profile-cyan', className: 'blob-cyan', style: { right: '-8%', bottom: '8%', opacity: 0.12 } },
      ]}
    >
      <PageHeader
        eyebrow="Student Profile"
        title="Your identity, rewards, security controls, and study history"
        description="A single premium workspace for account preferences, streaks, achievements, bookmarks, sessions, and subscription UI states."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-36 rounded-[28px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<FaFire />} label="Streak" value={`${dashboard?.streak || 0} days`} hint="Keep a test attempt alive every day" accent="from-rose-500/20 to-orange-400/5" iconClassName="text-rose-300" />
            <MetricCard icon={<FaTrophy />} label="XP" value={xp.toLocaleString()} hint="Built from recent attempt volume and accuracy" accent="from-indigo-500/20 to-cyan-400/5" />
            <MetricCard icon={<FaCoins />} label="Coins" value={coins.toLocaleString()} hint="Reward economy for challenge completions" accent="from-amber-500/20 to-orange-400/5" iconClassName="text-amber-300" />
            <MetricCard icon={<FaBookOpen />} label="Bookmarks" value={`${bookmarks.length}`} hint="Saved questions ready for later revision" accent="from-emerald-500/20 to-cyan-400/5" iconClassName="text-emerald-300" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[300px_1fr]">
            <GlassPanel className="rounded-[30px] p-5">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-indigo-400/20 bg-gradient-to-br from-indigo-600 to-cyan-500 text-3xl font-black text-white">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="mt-4 text-xl font-black text-[var(--text-primary)]">{user.name}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{user.email}</div>
                {(user.is_verified || user.role === 'admin') ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <FaCheckCircle className="text-[10px]" /> Verified account
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      Verification pending
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await authService.resendVerification(user.email);
                          toast.success('Verification email sent! Check your inbox.');
                        } catch {
                          toast.error('Could not send verification email.');
                        }
                      }}
                      className="text-[11px] text-indigo-300 underline hover:text-indigo-200 transition"
                    >
                      Resend verification email
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white'
                        : 'border border-white/8 bg-white/[0.03] text-[var(--text-secondary)] hover:border-indigo-400/20 hover:bg-indigo-400/10'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </GlassPanel>

            <div className="space-y-6">
              {activeTab === 'overview' ? (
                <>
                  <GlassPanel className="rounded-[30px] p-6">
                    <SectionTitle title="Achievements & badges" subtitle="A premium profile section for progress signaling." />
                    <div className="grid gap-4 sm:grid-cols-3">
                      {achievementBadges.map((badge) => (
                        <div key={badge.title} className={`rounded-[24px] border border-white/8 bg-gradient-to-br ${badge.tone} p-5`}>
                          <div className="mb-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-indigo-300">
                            <FaStar />
                          </div>
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{badge.title}</div>
                          <div className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
                            Visual milestone placeholder for achievement and badge inventory.
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassPanel>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <GlassPanel className="rounded-[30px] p-6">
                      <SectionTitle title="Strong chapters" subtitle="These chapters are currently carrying your score." />
                      <div className="space-y-4">
                        {(dashboard?.strong_chapters || []).length ? (
                          dashboard.strong_chapters.map((chapter) => (
                            <ProgressBar key={chapter.chapter_id} label={chapter.name} value={chapter.accuracy} color="#34d399" meta={`${Math.round(chapter.accuracy)}%`} />
                          ))
                        ) : (
                          <EmptyState icon={<FaCheckCircle />} title="Strong list building" description="Complete more attempts to populate chapter-level strengths." />
                        )}
                      </div>
                    </GlassPanel>

                    <GlassPanel className="rounded-[30px] p-6">
                      <SectionTitle title="Time and activity" subtitle="Where your study energy is being spent." />
                      <div className="space-y-4">
                        <ProgressBar
                          label="Average accuracy"
                          value={dashboard?.overall_accuracy || 0}
                          color="#22d3ee"
                          meta={`${Math.round(dashboard?.overall_accuracy || 0)}%`}
                        />
                        <ProgressBar
                          label="Average speed"
                          value={Math.min(100, ((analytics?.statistics?.average_speed || 0) / 2) * 100)}
                          color="#6366f1"
                          meta={`${(analytics?.statistics?.average_speed || 0).toFixed(2)} q/min`}
                        />
                        <ProgressBar
                          label="Daily goal"
                          value={Math.min(100, ((dashboard?.total_tests_attempted || 0) / 5) * 100)}
                          color="#f59e0b"
                          meta={`${dashboard?.total_tests_attempted || 0} attempts`}
                        />
                      </div>
                    </GlassPanel>
                  </div>
                </>
              ) : null}

              {activeTab === 'bookmarks' ? (
                <GlassPanel className="rounded-[30px] p-6">
                  <SectionTitle title="Bookmarks" subtitle="Saved revision material from your practice and mocks." />
                  <div className="space-y-3">
                    {bookmarks.length ? (
                      bookmarks.map((bookmark) => (
                        <div key={bookmark.bookmark_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{bookmark.question}</div>
                          <div className="mt-2 text-xs text-[var(--text-muted)]">
                            Saved on {new Date(bookmark.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState icon={<FaRegBookmark />} title="No bookmarks yet" description="Bookmark difficult questions from the exam interface and they will appear here." />
                    )}
                  </div>
                </GlassPanel>
              ) : null}

              {activeTab === 'activity' ? (
                <div className="space-y-6">
                  <GlassPanel className="rounded-[30px] p-6">
                    <SectionTitle title="Recent activity" subtitle="Cross-device account activity from the auth backend." />
                    <div className="space-y-3">
                      {activity.length ? (
                        activity.map((item) => (
                          <div key={item.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="text-sm font-semibold capitalize text-[var(--text-primary)]">{item.action.replace(/_/g, ' ')}</div>
                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              {[item.device, item.browser, item.ip_address].filter(Boolean).join(' • ')}
                            </div>
                            <div className="mt-2 text-xs text-[var(--text-secondary)]">
                              {new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState icon={<FaHistory />} title="No account activity yet" description="Your sign-ins, profile changes, and related events will appear here." />
                      )}
                    </div>
                  </GlassPanel>

                  <GlassPanel className="rounded-[30px] p-6">
                    <SectionTitle title="Session overview" subtitle="Currently active devices and browsers." />
                    <div className="space-y-3">
                      {sessions.length ? (
                        sessions.map((session) => (
                          <div key={session.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold text-[var(--text-primary)]">{session.device_name || 'Unknown device'}</div>
                                <div className="mt-1 text-xs text-[var(--text-muted)]">
                                  {[session.browser, session.os, session.ip_address].filter(Boolean).join(' • ')}
                                </div>
                              </div>
                              {session.is_current ? <div className="badge badge-indigo">Current</div> : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState icon={<FaShieldAlt />} title="No active sessions listed" description="Once multi-device sessions are recorded, they will appear here." />
                      )}
                    </div>
                  </GlassPanel>
                </div>
              ) : null}

              {activeTab === 'security' ? (
                <div className="space-y-6">
                  <GlassPanel className="rounded-[30px] p-6">
                    <SectionTitle title="Profile preferences" subtitle="Theme, language, timezone, and notification settings." />
                    <div className="space-y-4">
                      <label className="block text-sm text-[var(--text-secondary)]">
                        Display name
                        <input
                          value={profileForm.name}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                          className="input-field mt-2 rounded-[20px]"
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm text-[var(--text-secondary)]">
                          Language
                          <select
                            value={profileForm.language}
                            onChange={(event) => setProfileForm((prev) => ({ ...prev, language: event.target.value }))}
                            className="input-field mt-2 rounded-[20px]"
                          >
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="bn">Bengali</option>
                            <option value="ta">Tamil</option>
                          </select>
                        </label>
                        <label className="block text-sm text-[var(--text-secondary)]">
                          Timezone
                          <select
                            value={profileForm.timezone}
                            onChange={(event) => setProfileForm((prev) => ({ ...prev, timezone: event.target.value }))}
                            className="input-field mt-2 rounded-[20px]"
                          >
                            <option value="Asia/Kolkata">Asia/Kolkata</option>
                            <option value="Asia/Dubai">Asia/Dubai</option>
                            <option value="Europe/London">Europe/London</option>
                            <option value="America/New_York">America/New_York</option>
                          </select>
                        </label>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <button onClick={toggleTheme} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left text-sm text-[var(--text-secondary)]">
                          {isDark ? <FaSun className="mr-2 inline text-amber-300" /> : <FaMoon className="mr-2 inline text-indigo-300" />}
                          Switch to {isDark ? 'light' : 'dark'} theme
                        </button>
                        <button
                          onClick={() => setProfileForm((prev) => ({ ...prev, notification_enabled: !prev.notification_enabled }))}
                          className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left text-sm text-[var(--text-secondary)]"
                        >
                          <FaBell className="mr-2 inline text-cyan-300" />
                          Notifications: {profileForm.notification_enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                      <button onClick={saveProfile} className="btn-primary">
                        Save preferences
                      </button>
                    </div>
                  </GlassPanel>

                  <GlassPanel className="rounded-[30px] p-6">
                    <SectionTitle title="Change password" subtitle="Update credentials without leaving the profile workspace." />
                    <form onSubmit={changePassword} className="space-y-4">
                      <input
                        type="password"
                        value={passwordForm.oldPassword}
                        onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                        className="input-field rounded-[20px]"
                        placeholder="Current password"
                      />
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                        className="input-field rounded-[20px]"
                        placeholder="New password"
                      />
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                        className="input-field rounded-[20px]"
                        placeholder="Confirm new password"
                      />
                      <button type="submit" className="btn-primary">
                        Update password
                      </button>
                    </form>
                  </GlassPanel>
                </div>
              ) : null}

              {activeTab === 'subscription' ? (
                subLoading ? (
                  <div className="space-y-4">
                    {[1,2].map(i => <div key={i} className="skeleton h-40 rounded-[28px]" />)}
                  </div>
                ) :
                <div className="space-y-6">
                  <GlassPanel className="rounded-[30px] p-6">
                    <SectionTitle title="Subscription" subtitle="Current plan, billing, and renewal." />
                    <div className="rounded-[28px] border border-fuchsia-400/20 bg-gradient-to-br from-indigo-500/16 via-fuchsia-500/12 to-cyan-400/10 p-6">
                      <div className="badge badge-amber mb-4">
                        <FaCrown /> {(subscription?.plan_name || user.subscription_plan || 'free').toUpperCase()} plan
                      </div>
                      <div className="text-2xl font-black text-[var(--text-primary)]">
                        {subscription?.billing_cycle ? `${subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1)} billing` : 'Free membership'}
                      </div>
                      {subscription?.end_date && (
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">
                          Active until {new Date(subscription.end_date).toLocaleDateString()}
                          {subscription.days_remaining != null && subscription.days_remaining < 9999 && ` (${subscription.days_remaining} days remaining)`}
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button onClick={() => navigate('/pricing')} className="btn-primary text-sm">Upgrade</button>
                        {subscription?.plan_slug && subscription.plan_slug !== 'free' && (
                          <button
                            onClick={async () => {
                              try {
                                await subscriptionService.cancel();
                                toast.success('Subscription cancelled at end of period.');
                                refreshSubscription?.();
                              } catch (e) {
                                toast.error(e.response?.data?.detail || 'Cancel failed.');
                              }
                            }}
                            className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200"
                          >
                            Cancel Subscription
                          </button>
                        )}
                        <button onClick={() => navigate('/invoices')} className="btn-secondary text-sm">View Invoices</button>
                      </div>
                    </div>
                  </GlassPanel>

                  <GlassPanel className="rounded-[30px] p-6">
                    <SectionTitle title="Payment history" subtitle="Recent transactions." />
                    <div className="space-y-3">
                      {payments.map((p) => (
                        <div key={p.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-[var(--text-primary)]">{(p.plan_slug || 'Plan').toUpperCase()} — ₹{p.amount?.toFixed(2)}</div>
                              <div className="mt-1 text-xs text-[var(--text-muted)]">{p.created_at?.split('T')[0]}</div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === 'completed' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {!payments.length && <p className="text-sm text-[var(--text-muted)]">No payments yet.</p>}
                    </div>
                  </GlassPanel>
                </div>
                ) : null}
            </div>
          </div>
        </>
      )}
    </AmbientPage>
  );
};

export default Profile;
