import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { examEngineService } from '../api/api';
import PremiumBadge from './PremiumBadge';
import {
  FaGraduationCap, FaBars, FaTimes, FaSearch, FaHome, FaBookOpen,
  FaClipboardList, FaSignOutAlt, FaUnlockAlt, FaChartLine,
  FaSun, FaMoon, FaUser, FaTrophy, FaFire, FaBell, FaBolt, FaCrown, FaUsers
} from 'react-icons/fa';

const Navbar = () => {
  const { user, logout, isAdmin, planSlug } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Track scroll for navbar bg
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setIsOpen(false); setUserMenuOpen(false); setNotificationOpen(false); }, [location.pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setNotifications([]);
      return undefined;
    }

    examEngineService.getUpcomingNotifications(48)
      .then((data) => {
        if (!active) return;
        const upcoming = Array.isArray(data) ? data : [];
        const defaults = [
          { message: 'Daily reward window is open', scheduled_start_at: null, tone: 'reward' },
          { message: 'Streak shield available after your next practice set', scheduled_start_at: null, tone: 'streak' },
        ];
        setNotifications([...upcoming.slice(0, 4), ...defaults].slice(0, 5));
      })
      .catch(() => {
        if (!active) return;
        setNotifications([
          { message: 'Resume your last exam from the dashboard', scheduled_start_at: null, tone: 'reminder' },
          { message: 'Premium mock tests refresh every week', scheduled_start_at: null, tone: 'subscription' },
        ]);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
    setUserMenuOpen(false);
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: <FaHome /> },
    { name: 'Pricing', path: '/pricing', icon: <FaCrown /> },
    { name: 'Exams', path: '/exams', icon: <FaTrophy /> },
    { name: 'Subjects', path: '/subjects', icon: <FaBookOpen /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <FaTrophy /> },
    { name: 'Search', path: '/search', icon: <FaSearch /> },
  ];

  const userLinks = user
    ? [
        { name: 'Analytics', path: '/analytics', icon: <FaChartLine /> },
        { name: 'Wallet', path: '/wallet', icon: <FaBolt /> },
        { name: 'Referrals', path: '/referrals', icon: <FaUsers /> },
      ]
    : [];

  const authLinks = user
    ? [navLinks[0], { name: 'Dashboard', path: '/dashboard', icon: <FaChartLine /> }, ...navLinks.slice(1), ...userLinks]
    : navLinks;

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const navbarBg = scrolled
    ? isDark
      ? 'rgba(3, 7, 18, 0.92)'
      : 'rgba(248, 250, 252, 0.92)'
    : 'transparent';

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: navbarBg,
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? `1px solid var(--border-subtle)` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 68,
        }}>
          {/* Logo */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                padding: '9px 10px',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              }}
            >
              <FaGraduationCap style={{ color: 'white', fontSize: 20 }} />
            </motion.div>
            <div>
              <span style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, var(--text-primary), #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Exam<span style={{ color: '#6366f1', WebkitTextFillColor: '#6366f1' }}>SIDE</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: 'none', gap: 4 }} className="desktop-nav">
            {authLinks.map(link => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.path === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: isActive ? '#818cf8' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                })}
              >
                <span style={{ fontSize: 11 }}>{link.icon}</span>
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* Desktop Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <div ref={notificationRef} style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNotificationOpen((prev) => !prev)}
                  style={{
                    position: 'relative',
                    padding: '8px',
                    borderRadius: 12,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                  }}
                  aria-label="Open notifications"
                >
                  <FaBell />
                  {notifications.length ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #f43f5e, #f59e0b)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 0 0 3px rgba(3,7,18,0.85)',
                      }}
                    >
                      {notifications.length}
                    </span>
                  ) : null}
                </motion.button>

                <AnimatePresence>
                  {notificationOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 12px)',
                        right: 0,
                        width: 320,
                        maxWidth: 'calc(100vw - 32px)',
                        background: isDark ? 'rgba(10,15,30,0.97)' : 'rgba(255,255,255,0.97)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 18,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                        zIndex: 220,
                      }}
                    >
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Notification Center</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Upcoming exams, rewards, and platform reminders
                        </div>
                      </div>
                      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {notifications.map((item, index) => {
                          const tone = item.live_mode_enabled ? '#f59e0b' : item.tone === 'reward' ? '#10b981' : item.tone === 'subscription' ? '#8b5cf6' : '#6366f1';
                          const Icon = item.live_mode_enabled ? FaBolt : item.tone === 'subscription' ? FaCrown : item.tone === 'reward' ? FaTrophy : FaFire;
                          return (
                            <div
                              key={`${item.message}-${index}`}
                              style={{
                                display: 'flex',
                                gap: 12,
                                padding: '12px 12px',
                                borderRadius: 14,
                                border: '1px solid var(--border-subtle)',
                                background: 'rgba(255,255,255,0.03)',
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 12,
                                  background: `${tone}20`,
                                  border: `1px solid ${tone}40`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: tone,
                                  flexShrink: 0,
                                }}
                              >
                                <Icon style={{ fontSize: 13 }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-primary)', fontWeight: 600 }}>
                                  {item.message}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                  {item.scheduled_start_at
                                    ? new Date(item.scheduled_start_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : 'Student productivity update'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              style={{
                padding: '8px',
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                transition: 'all 0.2s ease',
              }}
              aria-label="Toggle theme"
            >
              {isDark ? <FaSun style={{ color: '#fbbf24' }} /> : <FaMoon style={{ color: '#6366f1' }} />}
            </motion.button>

            {/* User section */}
            {user ? (
              <div ref={userMenuRef} style={{ position: 'relative' }}>
                {/* Admin badge */}
                {isAdmin() && (
                  <Link
                    to="/admin"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: 'white',
                      boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                      marginRight: 4,
                    }}
                  >
                    <FaUnlockAlt style={{ fontSize: 10 }} />
                    Admin
                  </Link>
                )}

                {/* Avatar button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: '2px solid rgba(99,102,241,0.4)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  {getInitials(user.name)}
                </motion.button>

                {/* Dropdown */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 12px)',
                        right: 0,
                        minWidth: 220,
                        background: isDark ? 'rgba(10,15,30,0.95)' : 'rgba(255,255,255,0.97)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 16,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                        zIndex: 200,
                      }}
                    >
                      {/* User info */}
                      <div style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'rgba(99,102,241,0.06)',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {user.name}
                          <PremiumBadge plan={planSlug} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {user.email}
                        </div>
                        <span style={{
                          display: 'inline-block',
                          marginTop: 6,
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          background: isAdmin() ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                          color: isAdmin() ? '#fbbf24' : '#818cf8',
                          border: `1px solid ${isAdmin() ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {user.role}
                        </span>
                      </div>

                      {/* Menu items */}
                      <div style={{ padding: 8 }}>
                        <Link
                          to="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          <FaChartLine style={{ fontSize: 12, color: '#6366f1' }} />
                          Dashboard
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          <FaUser style={{ fontSize: 12, color: '#818cf8' }} />
                          Profile & Settings
                        </Link>

                        {isAdmin() && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text-secondary)',
                              textDecoration: 'none',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                          >
                            <FaUnlockAlt style={{ fontSize: 12, color: '#fbbf24' }} />
                            Admin Panel
                          </Link>
                        )}

                        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />

                        <button
                          onClick={handleLogout}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#fb7185',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <FaSignOutAlt style={{ fontSize: 12 }} />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    background: 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.borderColor = 'var(--border-accent)';
                    e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  onClick={() => {}}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    color: 'white',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(!isOpen)}
              style={{
                display: 'none',
                padding: 8,
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="mobile-menu-btn"
            >
              {isOpen ? <FaTimes /> : <FaBars />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              overflow: 'hidden',
              background: isDark ? 'rgba(3,7,18,0.97)' : 'rgba(248,250,252,0.97)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px 20px' }}>
              {/* Mobile nav links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {authLinks.map(link => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    end={link.path === '/'}
                    onClick={() => setIsOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: 'none',
                      background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: isActive ? '#818cf8' : 'var(--text-secondary)',
                      border: `1px solid ${isActive ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                    })}
                  >
                    <span style={{ fontSize: 14 }}>{link.icon}</span>
                    {link.name}
                  </NavLink>
                ))}

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />

                {/* Theme toggle in mobile */}
                <button
                  onClick={toggleTheme}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {isDark ? <FaSun style={{ color: '#fbbf24' }} /> : <FaMoon style={{ color: '#6366f1' }} />}
                  {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </button>

                {user ? (
                  <>
                    {isAdmin() && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px',
                          borderRadius: 12,
                          fontSize: 14,
                          fontWeight: 700,
                          textDecoration: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: 'white',
                        }}
                      >
                        <FaUnlockAlt />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '12px',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fb7185',
                        background: 'rgba(244,63,94,0.08)',
                        border: '1px solid rgba(244,63,94,0.2)',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <FaSignOutAlt />
                      Sign Out — {user.name}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '13px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: 'white',
                      boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                    }}
                  >
                    Get Started Free
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
