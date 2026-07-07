import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaSearch, FaArrowRight } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div className="bg-blob blob-indigo" style={{ top: '20%', left: '15%', opacity: 0.12 }} />
      <div className="bg-blob blob-purple" style={{ bottom: '20%', right: '15%', opacity: 0.1 }} />
      <div className="grid-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />

      <div style={{ textAlign: 'center', maxWidth: 500, position: 'relative', zIndex: 1 }}>
        {/* 404 number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          <div style={{
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            marginBottom: 8,
            textShadow: 'none',
          }}>
            404
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 36, maxWidth: 360, margin: '0 auto 36px' }}>
            The page or question bank you're looking for has been moved, deleted, or simply doesn't exist.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', color: 'white',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                }}
              >
                <FaHome style={{ fontSize: 12 }} /> Go Home
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/search"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', color: 'var(--text-primary)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <FaSearch style={{ fontSize: 12 }} /> Search Content
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
