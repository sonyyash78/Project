import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaGraduationCap, FaGithub, FaTwitter, FaLinkedin,
  FaEnvelope, FaTelegram, FaHeart
} from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const linkGroups = [
    {
      heading: 'Platform',
      links: [
        { label: 'Explore Exams', href: '/exams' },
        { label: 'Browse Subjects', href: '/subjects' },
        { label: 'Search Questions', href: '/search' },
        { label: 'Leaderboard', href: '/dashboard' },
      ],
    },
    {
      heading: 'Account',
      links: [
        { label: 'Sign In', href: '/login' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin Panel', href: '/admin' },
      ],
    },
    {
      heading: 'Exams',
      links: [
        { label: 'JEE / NEET', href: '/exams' },
        { label: 'UPSC / SSC', href: '/exams' },
        { label: 'RRB / Banking', href: '/exams' },
        { label: 'CAT / Management', href: '/exams' },
      ],
    },
  ];

  return (
    <footer
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '60px 24px 24px',
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Top grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 40,
          paddingBottom: 48,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
              <div style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                padding: '9px 10px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}>
                <FaGraduationCap style={{ color: 'white', fontSize: 18 }} />
              </div>
              <span style={{
                fontSize: 18,
                fontWeight: 900,
                background: 'linear-gradient(135deg, var(--text-primary), #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Exam<span style={{ color: '#6366f1', WebkitTextFillColor: '#6366f1' }}>SIDE</span>
              </span>
            </Link>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 240, marginBottom: 20 }}>
              India's premier exam preparation platform with past year papers, mock tests, and smart analytics.
            </p>

            {/* Social links */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: <FaGithub />, href: '#', label: 'GitHub' },
                { icon: <FaTwitter />, href: '#', label: 'Twitter' },
                { icon: <FaTelegram />, href: '#', label: 'Telegram' },
                { icon: <FaEnvelope />, href: 'mailto:info@examside.com', label: 'Email' },
              ].map(s => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={s.label}
                  style={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.15)';
                    e.currentTarget.style.color = '#818cf8';
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {linkGroups.map(group => (
            <div key={group.heading}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 16,
              }}>
                {group.heading}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          paddingTop: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            © {currentYear} ExamSIDE. Built with <FaHeart style={{ color: '#f43f5e', fontSize: 10 }} /> for students.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms of Service', 'Contact'].map(label => (
              <a
                key={label}
                href="#"
                style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s ease' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
