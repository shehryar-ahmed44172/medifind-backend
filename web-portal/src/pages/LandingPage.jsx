import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, MapPin, FileText, Users, Lock, ArrowRight,
  Heart, User, Shield, Activity, Clock,
  CheckCircle, Bell, BarChart3,
  Download, Play, HeartPulse, Mic,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '../context/AlertContext';
import logo from '../assets/Medifind_New_Logo-removebg-preview.png';
import heroMockup from '../assets/medifind_bento_hero_1776705879322.png';

const P = 'Poppins, sans-serif';

/* ─── Update this constant when the app goes live on Play Store ─── */
const PLAY_STORE_URL = '#'; // TODO: replace with real Play Store link

/* ── Animated Counter ─────────────────────────────────────────── */
const Counter = ({ end, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let s = 0;
        const step = end / 80;
        const timer = setInterval(() => {
          s += step;
          if (s >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(s));
        }, 20);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

/* ── Animation Variants ────────────────────────────────────────── */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};
const float = {
  animate: { y: [0, -15, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }
};
const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial="hidden" whileInView="visible"
    viewport={{ once: true, margin: '-100px' }}
    variants={fadeInUp} transition={{ delay: delay / 1000 }}
  >{children}</motion.div>
);

/* ── Contact Form (kept for potential future use) ─────────────── */
const ContactForm = () => {
  const { showAlert } = useAlert();
  const [form, setForm] = useState({ name: '', email: '', role: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required';
    if (!form.message.trim()) e.message = 'Required';
    return e;
  };
  const handleSubmit = (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false); setSubmitted(true);
      showAlert('Message sent successfully! Our team will contact you soon.', 'success');
    }, 800);
  };
  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '3rem 2rem', fontFamily: P }}>
      <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'linear-gradient(135deg,#0C637E,#2891C2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
        <CheckCircle size={30} color="white" />
      </div>
      <h3 style={{ fontSize: '1.35rem', color: '#0C637E', fontWeight: 700, marginBottom: '0.6rem', fontFamily: P }}>Message Received!</h3>
      <p style={{ color: '#64748B', fontSize: '0.9rem', fontFamily: P }}>We'll get back to you within 24 hours.</p>
    </div>
  );
  const fieldStyle = (name) => ({
    width: '100%', padding: '0.8rem 1rem', borderRadius: '10px',
    border: `1.5px solid ${errors[name] ? '#EF4444' : '#E2E8F0'}`,
    background: '#F8FAFC', fontSize: '0.875rem', outline: 'none',
    fontFamily: P, color: '#1E293B', transition: 'border-color 0.2s',
    boxSizing: 'border-box', fontWeight: 400,
  });
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: P }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name *" style={fieldStyle('name')} />
          {errors.name && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: '4px', fontWeight: 500 }}>{errors.name}</p>}
        </div>
        <div>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email Address *" type="email" style={fieldStyle('email')} />
          {errors.email && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: '4px', fontWeight: 500 }}>{errors.email}</p>}
        </div>
      </div>
      <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
        style={{ ...fieldStyle('role'), color: form.role ? '#1E293B' : '#94A3B8' }}>
        <option value="">I am a... (select role)</option>
        <option value="patient">Patient / Individual</option>
        <option value="responder">Emergency Responder</option>
        <option value="caregiver">Caregiver / Family</option>
        <option value="organization">Healthcare Organization</option>
      </select>
      <div>
        <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
          placeholder="Your message *" rows={4}
          style={{ ...fieldStyle('message'), resize: 'vertical', minHeight: '110px' }} />
        {errors.message && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: '4px', fontWeight: 500 }}>{errors.message}</p>}
      </div>
      <button type="submit" disabled={loading}
        style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', background: 'linear-gradient(135deg,#0C637E,#2496A7)', color: 'white', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, fontFamily: P, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', letterSpacing: '0.01em' }}>
        {loading ? 'Sending...' : <><span>Send Message</span><ArrowRight size={15} /></>}
      </button>
    </form>
  );
};

/* ── Badge Pill ───────────────────────────────────────────────── */
const Badge = ({ icon: Icon, label, bg = '#E2F0F3', color = '#0C637E' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', background: bg, borderRadius: '100px', marginBottom: '1.25rem' }}>
    {Icon && <Icon size={12} color={color} />}
    <span style={{ fontSize: '0.7rem', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: P }}>{label}</span>
  </div>
);

/* ── Section Heading ──────────────────────────────────────────── */
const SectionHead = ({ badge, badgeBg, badgeColor, badgeIcon, title, sub, light = false }) => (
  <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
    <Badge icon={badgeIcon} label={badge} bg={badgeBg} color={badgeColor} />
    <h2 style={{ fontSize: '2rem', fontWeight: 700, color: light ? 'white' : '#0F172A', marginBottom: '0.75rem', fontFamily: P, lineHeight: 1.25 }}>{title}</h2>
    {sub && <p style={{ fontSize: '0.95rem', color: light ? 'rgba(255,255,255,0.75)' : '#64748B', maxWidth: '520px', margin: '0 auto', lineHeight: 1.75, fontFamily: P, fontWeight: 400 }}>{sub}</p>}
  </div>
);

/* ── Play Store Badge Button ──────────────────────────────────── */
const StoreButton = ({ store, available, href, roleColor }) => {
  const isAndroid = store === 'android';
  return (
    <a
      href={available ? href : undefined}
      target={available ? '_blank' : undefined}
      rel="noopener noreferrer"
      aria-label={isAndroid ? 'Download on Google Play' : 'Download on App Store (Coming Soon)'}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.85rem',
        padding: '0.85rem 1.25rem', borderRadius: '14px',
        background: available ? 'white' : 'rgba(255,255,255,0.12)',
        textDecoration: 'none', cursor: available ? 'pointer' : 'default',
        border: available ? 'none' : '1px solid rgba(255,255,255,0.2)',
        opacity: available ? 1 : 0.65,
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { if (available) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Icon */}
      <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isAndroid ? (
          /* Play Store triangle icon */
          <svg viewBox="0 0 24 24" width="28" height="28">
            <defs>
              <linearGradient id="pg1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BCD4" />
                <stop offset="100%" stopColor="#00E676" />
              </linearGradient>
            </defs>
            <path d="M3 20.5v-17c0-.83 1.008-1.28 1.6-.67l14 8.5c.53.32.53 1.02 0 1.34L4.6 21.17C4.008 21.78 3 21.33 3 20.5z" fill="url(#pg1)" />
          </svg>
        ) : (
          /* Apple logo */
          <svg viewBox="0 0 24 24" width="26" height="26" fill={available ? '#1E293B' : 'white'}>
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        )}
      </div>
      {/* Text */}
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: available ? '#64748B' : 'rgba(255,255,255,0.6)', fontFamily: P }}>
          {available ? (isAndroid ? 'GET IT ON' : 'DOWNLOAD ON THE') : 'COMING SOON'}
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: available ? '#0F172A' : 'white', fontFamily: P, lineHeight: 1.2 }}>
          {isAndroid ? 'Google Play' : 'App Store'}
        </div>
      </div>
      {/* Coming Soon ribbon */}
      {!available && (
        <div style={{ position: 'absolute', top: '8px', right: '-18px', background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '0.55rem', fontWeight: 700, padding: '2px 20px', transform: 'rotate(35deg)', letterSpacing: '0.08em', fontFamily: P }}>
          SOON
        </div>
      )}
    </a>
  );
};

/* ── Ecosystem Phone Screen Placeholder ───────────────────────
   Renders a simplified CSS-drawn app screen inside the phone
   mockup for each mobile role. Replaced by a real <img> once
   Flutter screenshots are exported and imported at the top.
   Props:
     type   — "primary" | "secondary"
     color  — role accent hex  (e.g. "#0C637E")
     gradient — CSS gradient string
     role   — "Patient" | "Caregiver" | "Responder"
─────────────────────────────────────────────────────────────── */
const EcosystemScreenPlaceholder = ({ type, color, gradient, role }) => {
  /* Shared micro-layout helpers */
  const bar = (w = '60%', h = 6, bg = '#E2E8F0', r = 3) => (
    <div style={{ width: w, height: h, borderRadius: r, background: bg, flexShrink: 0 }} />
  );
  const avatar = (letter, bg, fg, size = 24) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.4, fontWeight: 700, color: fg, fontFamily: P }}>{letter}</span>
    </div>
  );
  const statusDot = (c) => (
    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
  );

  /* ── PATIENT ─────────────────────────────────────────── */
  if (role === 'Patient') {
    if (type === 'primary') {
      /* Home / SOS screen */
      return (
        <div style={{ width: '100%', height: '100%', background: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: P }}>
          {/* Status bar */}
          <div style={{ height: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, gap: 4 }}>
            {[1, 0.7, 0.4].map((o, i) => <div key={i} style={{ width: 3, height: 7 + (i * 2), borderRadius: 1, background: `rgba(255,255,255,${o})` }} />)}
          </div>
          {/* Header */}
          <div style={{ background: color, padding: '8px 10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginBottom: 2 }}>MEDIFIND</div>
              <div style={{ fontSize: 9, color: 'white', fontWeight: 700 }}>Good morning, Ali 👋</div>
            </div>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
            </div>
          </div>
          {/* Body */}
          <div style={{ flex: 1, padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {/* SOS button */}
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              {/* Outer pulse ring */}
              <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #EF444430', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 58, height: 58, borderRadius: '50%', border: '2px solid #EF444450', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#EF4444,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(239,68,68,0.5)' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>SOS</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 7, color: '#94A3B8', fontWeight: 500 }}>Hold to trigger emergency</div>
            </div>
            {/* Quick info cards */}
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {[
                { label: 'Blood Type', value: 'A+', bg: '#FEF2F2', c: '#EF4444' },
                { label: 'Caregiver', value: 'Linked', bg: '#ECFDF5', c: '#10B981' },
              ].map(card => (
                <div key={card.label} style={{ background: card.bg, borderRadius: 8, padding: '5px 6px' }}>
                  <div style={{ fontSize: 6, color: '#94A3B8', marginBottom: 2 }}>{card.label}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: card.c }}>{card.value}</div>
                </div>
              ))}
            </div>
            {/* Bottom nav */}
            <div style={{ width: '100%', marginTop: 'auto', borderTop: '1px solid #F1F5F9', paddingTop: 6, display: 'flex', justifyContent: 'space-around' }}>
              {['⚡', '📋', '👥', '👤'].map((icon, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 11 }}>{icon}</div>
                  <div style={{ width: i === 0 ? 16 : 0, height: 2, borderRadius: 1, background: color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      /* Secondary — Live tracking screen */
      return (
        <div style={{ width: '100%', height: '100%', background: '#E8F4F8', display: 'flex', flexDirection: 'column', fontFamily: P, position: 'relative' }}>
          {/* Map placeholder */}
          <div style={{ flex: 1, background: `linear-gradient(135deg, ${color}10, ${color}05)`, position: 'relative', overflow: 'hidden' }}>
            {/* Road lines */}
            <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.6)', transform: 'rotate(-8deg)' }} />
            <div style={{ position: 'absolute', top: '55%', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.6)', transform: 'rotate(5deg)' }} />
            {/* Responder pin */}
            <div style={{ position: 'absolute', top: '22%', left: '35%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50% 50% 50% 0', background: '#10B981', transform: 'rotate(-45deg)', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
              <div style={{ fontSize: 6, color: '#10B981', fontWeight: 700, marginTop: 2, background: 'white', padding: '1px 4px', borderRadius: 3 }}>Resp.</div>
            </div>
            {/* Patient pin */}
            <div style={{ position: 'absolute', top: '48%', left: '58%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
              <div style={{ fontSize: 6, color: color, fontWeight: 700, marginTop: 2, background: 'white', padding: '1px 4px', borderRadius: 3 }}>You</div>
            </div>
            {/* Route line */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 43 30 Q 55 45 62 56" stroke={color} strokeWidth="1.5" fill="none" strokeDasharray="3,2" opacity="0.6" />
            </svg>
          </div>
          {/* Bottom card */}
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: '12px 12px 0 0', marginTop: -10, boxShadow: '0 -4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11 }}>🚑</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#0F172A' }}>Responder On the Way</div>
                <div style={{ fontSize: 7, color: '#10B981', fontWeight: 600 }}>ETA: 3 min 42 sec</div>
              </div>
            </div>
            {bar('100%', 4, `${color}20`)}
            <div style={{ width: '45%', height: 4, borderRadius: 3, background: color, marginTop: -4 }} />
          </div>
        </div>
      );
    }
  }

  /* ── CAREGIVER ───────────────────────────────────────── */
  if (role === 'Caregiver') {
    if (type === 'primary') {
      /* My Patients list */
      return (
        <div style={{ width: '100%', height: '100%', background: '#EBF5FB', display: 'flex', flexDirection: 'column', fontFamily: P }}>
          <div style={{ height: 14, background: color, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
            <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>MEDIFIND — CAREGIVER</div>
          </div>
          <div style={{ background: color, padding: '8px 10px 14px' }}>
            <div style={{ fontSize: 9, color: 'white', fontWeight: 700, marginBottom: 2 }}>My Patients</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.65)' }}>3 linked · all monitored</div>
          </div>
          <div style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { name: 'Ali Hassan', status: 'Safe', dot: '#10B981', bg: '#ECFDF5', alert: false },
              { name: 'Sara Malik', status: 'SOS Active!', dot: '#EF4444', bg: '#FEF2F2', alert: true },
              { name: 'Ahmed K.', status: 'Safe', dot: '#10B981', bg: '#ECFDF5', alert: false },
            ].map((p, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 10, padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 7, border: `1.5px solid ${p.alert ? '#EF444430' : '#F1F5F9'}`, boxShadow: p.alert ? '0 2px 10px rgba(239,68,68,0.12)' : 'none' }}>
                {avatar(p.name[0], p.alert ? '#FEF2F2' : '#E2F0F3', p.alert ? '#EF4444' : color, 24)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 7.5, fontWeight: 700, color: '#0F172A' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                    {statusDot(p.dot)}
                    <span style={{ fontSize: 6.5, color: p.dot, fontWeight: 600 }}>{p.status}</span>
                  </div>
                </div>
                {p.alert && (
                  <div style={{ background: '#EF4444', borderRadius: 6, padding: '2px 5px' }}>
                    <span style={{ fontSize: 6, color: 'white', fontWeight: 700 }}>LIVE</span>
                  </div>
                )}
              </div>
            ))}
            {/* Bottom nav */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid #F1F5F9', paddingTop: 6, display: 'flex', justifyContent: 'space-around' }}>
              {['👥', '🗺️', '📋', '👤'].map((icon, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 11 }}>{icon}</div>
                  <div style={{ width: i === 0 ? 16 : 0, height: 2, borderRadius: 1, background: color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      /* Secondary — Emergency monitor map */
      return (
        <div style={{ width: '100%', height: '100%', background: '#EBF5FB', display: 'flex', flexDirection: 'column', fontFamily: P }}>
          {/* Alert banner */}
          <div style={{ background: '#EF4444', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 7, color: 'white', fontWeight: 700 }}>⚠ EMERGENCY · Sara Malik triggered SOS</span>
          </div>
          {/* Map */}
          <div style={{ flex: 1, background: `linear-gradient(135deg, ${color}08, #F59E0B08)`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '20%', left: '30%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50% 50% 50% 0', background: '#EF4444', transform: 'rotate(-45deg)', border: '2px solid white', boxShadow: '0 2px 6px rgba(239,68,68,0.5)' }} />
              <div style={{ fontSize: 6, color: '#EF4444', fontWeight: 700, marginTop: 2, background: 'white', padding: '1px 4px', borderRadius: 3 }}>Sara</div>
            </div>
            <div style={{ position: 'absolute', top: '45%', left: '55%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981', border: '2px solid white', boxShadow: '0 2px 6px rgba(16,185,129,0.5)' }} />
              <div style={{ fontSize: 6, color: '#10B981', fontWeight: 700, marginTop: 2, background: 'white', padding: '1px 4px', borderRadius: 3 }}>Resp.</div>
            </div>
          </div>
          {/* Bottom info */}
          <div style={{ background: 'white', padding: '7px 9px', borderTop: '1px solid #BFDBF7' }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#1A5276', marginBottom: 3 }}>Responder assigned — ETA 5 min</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {bar('50%', 4, '#FDE68A')}
              {bar('30%', 4, '#FCA5A5')}
            </div>
          </div>
        </div>
      );
    }
  }

  /* ── RESPONDER ───────────────────────────────────────── */
  if (role === 'Responder') {
    if (type === 'primary') {
      /* Responder dashboard */
      return (
        <div style={{ width: '100%', height: '100%', background: '#F0F9FB', display: 'flex', flexDirection: 'column', fontFamily: P }}>
          <div style={{ height: 14, background: color, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
            <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>MEDIFIND — RESPONDER</div>
          </div>
          <div style={{ background: color, padding: '8px 10px 14px' }}>
            <div style={{ fontSize: 9, color: 'white', fontWeight: 700 }}>Welcome, Dr. Usman</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>Lahore · Verified Paramedic</div>
          </div>
          <div style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {/* Availability toggle */}
            <div style={{ background: 'white', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #D1FAE5' }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#0F172A' }}>Availability</div>
                <div style={{ fontSize: 7, color: '#10B981', fontWeight: 600 }}>● Currently Available</div>
              </div>
              {/* Toggle pill */}
              <div style={{ width: 32, height: 18, borderRadius: 9, background: '#10B981', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white' }} />
              </div>
            </div>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
              {[
                { label: 'Responses', value: '47', color: color },
                { label: 'Avg Time', value: '3.8m', color: '#F59E0B' },
                { label: 'Rating', value: '4.9★', color: '#EF4444' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: 8, padding: '6px 5px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 5.5, color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Nearby emergencies */}
            <div style={{ background: 'white', borderRadius: 10, padding: '7px 9px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: '#0F172A', marginBottom: 5 }}>Nearby Emergencies</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10 }}>🚨</span>
                </div>
                <div>
                  <div style={{ fontSize: 7, fontWeight: 700, color: '#EF4444' }}>1 Active SOS nearby</div>
                  <div style={{ fontSize: 6, color: '#94A3B8' }}>1.2 km · Gulberg, Lahore</div>
                </div>
              </div>
            </div>
            {/* Bottom nav */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid #F1F5F9', paddingTop: 5, display: 'flex', justifyContent: 'space-around' }}>
              {['🏠', '🗺️', '📋', '👤'].map((icon, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 11 }}>{icon}</div>
                  <div style={{ width: i === 0 ? 16 : 0, height: 2, borderRadius: 1, background: color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      /* Secondary — Incoming emergency request */
      return (
        <div style={{ width: '100%', height: '100%', background: '#F0F9FB', display: 'flex', flexDirection: 'column', fontFamily: P, position: 'relative' }}>
          {/* Dimmed background */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />
          {/* Request card */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '18px 18px 0 0', padding: '12px 12px 14px', zIndex: 2 }}>
            {/* Alert header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14 }}>🚨</span>
              </div>
              <div>
                <div style={{ fontSize: 8.5, fontWeight: 800, color: '#EF4444' }}>INCOMING EMERGENCY</div>
                <div style={{ fontSize: 7, color: '#64748B' }}>You have 30 seconds to respond</div>
              </div>
            </div>
            {/* Patient info */}
            <div style={{ background: '#F8FAFC', borderRadius: 9, padding: '7px 8px', marginBottom: 7 }}>
              {[
                { label: 'Patient', value: 'Ali Hassan' },
                { label: 'Blood Type', value: 'A+' },
                { label: 'Distance', value: '1.2 km away' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 6.5, color: '#94A3B8', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: 6.5, color: '#0F172A', fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>
            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: '#EF4444' }}>✕ Reject</div>
              </div>
              <div style={{ background: '#10B981', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: 'white' }}>✓ Accept</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  /* Fallback — should never reach here */
  return <div style={{ width: '100%', height: '100%', background: '#F1F5F9' }} />;
};

/* ══════════════════════════════════════════════════════════════
   Main Landing Page
══════════════════════════════════════════════════════════════ */
const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  /* scroll-based effects */
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* active nav section tracking via IntersectionObserver */
  useEffect(() => {
    const sectionIds = ['features', 'how-it-works', 'solutions'];
    const observers = sectionIds.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.25 }
      );
      obs.observe(el);
      return obs;
    }).filter(Boolean);
    return () => observers.forEach(obs => obs.disconnect());
  }, []);

  /* ── Static data ─────────────────────────────────────────── */
  const features = [
    { icon: Zap, title: 'Instant SOS', desc: 'One-tap emergency alert reaches all nearby verified responders within seconds.', color: '#DC2626', bg: '#FEF2F2' },
    { icon: MapPin, title: 'Live GPS Tracking', desc: 'Real-time responder location on an interactive map so you always know when help arrives.', color: '#0C637E', bg: '#E2F0F3' },
    { icon: FileText, title: 'Medical Profile Sharing', desc: 'Blood type, allergies, medications — instantly delivered to incoming responders.', color: '#2496A7', bg: '#E0F4F7' },
    { icon: Heart, title: 'Caregiver Alerts', desc: 'Family members receive live push notifications and a map view the moment an SOS is triggered.', color: '#2891C2', bg: '#EBF5FB' },
    { icon: Mic, title: 'Silent SOS for Deaf Users', desc: 'Icon-driven, voice-free emergency interface built specifically for Deaf and Mute patients.', color: '#03293C', bg: '#E2F0F3' },
    { icon: Lock, title: 'End-to-End Encryption', desc: 'All communications and medical data are encrypted at rest and in transit.', color: '#0E6E82', bg: '#D9EDF1' },
  ];

  const steps = [
    { num: '01', icon: Zap, title: 'Trigger SOS', desc: 'One tap sends your GPS coordinates and medical snapshot to our dispatch network.', color: '#DC2626' },
    { num: '02', icon: Bell, title: 'Responders Notified', desc: 'Nearest verified responders are alerted with your location and condition summary.', color: '#0C637E' },
    { num: '03', icon: MapPin, title: 'Live Tracking', desc: 'You and your caregivers watch the responder navigate to you on a live map.', color: '#2496A7' },
    { num: '04', icon: CheckCircle, title: 'Resolution & Report', desc: 'Responder confirms arrival, logs the outcome. Your caregiver gets notified.', color: '#2891C2' },
  ];

  const roles = [
    {
      icon: User, title: 'For Patients', gradient: 'linear-gradient(135deg,#0C637E,#2496A7)',
      headline: 'Help is One Tap Away',
      desc: "No calls. No delays. Whether you speak or not, MediFind's inclusive SOS works for everyone — including Deaf and Mute users through our Silent Request feature.",
      points: ['One-tap SOS with instant GPS sharing', 'Silent Request for Deaf & Mute users', 'Medical profile auto-shared with responder', 'Live ETA tracking on map'],
    },
    {
      icon: Heart, title: 'For Caregivers', gradient: 'linear-gradient(135deg,#1A6FA5,#2891C2)',
      headline: 'Stay Connected to the People You Love',
      desc: 'Receive instant alerts the moment your patient triggers SOS. Track the responder live and stay informed at every step — without being physically there.',
      points: ['Instant push notification on SOS trigger', 'Live responder tracking on map', 'Real-time emergency status updates', 'Emergency history & outcome reports'],
    },
    {
      icon: HeartPulse, title: 'For Responders', gradient: 'linear-gradient(135deg,#2496A7,#2891C2)',
      headline: 'Precision Emergency Dispatch',
      desc: 'Receive verified SOS signals with full patient context before you arrive. Smart routing means you are always the right person in the right place.',
      points: ['Smart dispatch with patient data preview', 'Voice-guided GPS navigation', 'Digital credential management', 'Emergency history & outcome logging'],
    },
    {
      icon: BarChart3, title: 'For Administrators', gradient: 'linear-gradient(135deg,#04364E,#0C637E)',
      headline: 'Total System Visibility',
      desc: 'Monitor every active emergency, verify responder credentials, and analyze performance — all from a single secure web dashboard.',
      points: ['Real-time emergency monitoring dashboard', 'Responder credential verification queue', 'User directory & subscription management', 'Immutable audit logs & analytics'],
    },
  ];

  const stats = [
    { value: 4, suffix: ' min', prefix: '< ', label: 'Avg Response Time', icon: Clock },
    { value: 99.9, suffix: '%', prefix: '', label: 'System Uptime', icon: Activity },
    { value: 10000, suffix: '+', prefix: '', label: 'Registered Users', icon: Users },
    { value: 500, suffix: '+', prefix: '', label: 'Verified Responders', icon: Shield },
  ];



  const PX = '0 5%';

  const navLinks = [
    ['Features', '#features'],
    ['How It Works', '#how-it-works'],
    ['For Each Role', '#solutions'],
  ];


  return (
    <div style={{ background: '#FFFFFF', overflowX: 'hidden', fontFamily: P }}>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid #E2E8F0' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ padding: PX, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={logo} alt="MediFind" style={{ height: '42px', objectFit: 'contain', display: 'block' }} />
          </Link>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {navLinks.map(([label, href]) => {
              const sectionId = href.replace('#', '');
              const isActive = activeSection === sectionId;
              return (
                <a key={href} href={href}
                  style={{
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#0C637E' : '#475569',
                    fontSize: '0.875rem', textDecoration: 'none',
                    transition: 'color 0.2s', fontFamily: P,
                    position: 'relative', paddingBottom: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#0C637E'}
                  onMouseLeave={e => e.currentTarget.style.color = isActive ? '#0C637E' : '#475569'}
                >
                  {label}
                  {/* Active underline indicator */}
                  {isActive && (
                    <span style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: '2px', borderRadius: '2px',
                      background: 'linear-gradient(90deg,#0C637E,#2891C2)',
                    }} />
                  )}
                </a>
              );
            })}
            <Link to="/login" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'linear-gradient(135deg,#0C637E,#2496A7)', color: 'white', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: P }}>
              Admin Portal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ paddingTop: '88px', paddingBottom: '56px', background: 'linear-gradient(150deg,#F0F9FC 0%,#E8F5FA 55%,#F8FAFC 100%)' }}>
        <div style={{ padding: PX, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
          <div>
            <Badge icon={HeartPulse} label="Emergency Response Platform" />
            <h1 style={{ fontSize: '3.2rem', lineHeight: 1.15, fontWeight: 700, marginBottom: '1.35rem', color: '#0F172A', fontFamily: P }}>
              Empowering<br />
              <span style={{ background: 'linear-gradient(135deg,#0C637E,#2891C2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Accessibility
              </span><br />
              in Emergencies.
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748B', marginBottom: '2rem', lineHeight: 1.8, maxWidth: '460px', fontFamily: P, fontWeight: 400 }}>
              The only emergency platform with built-in support for{' '}
              <strong style={{ color: '#0C637E', fontWeight: 600 }}>Deaf & Mute users</strong>{' '}
              — connecting Patients, Responders, and Caregivers in real time.
            </p>
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '2.75rem' }}>
              <motion.a
                href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                variants={fadeInUp}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(12,99,126,0.35)' }}
                whileTap={{ scale: 0.95 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'linear-gradient(135deg,#0C637E,#2496A7)', color: 'white', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', cursor: 'pointer', fontFamily: P }}
              >
                <Download size={15} /> Download App
              </motion.a>
              <motion.a
                href="#get-started"
                variants={fadeInUp}
                whileHover={{ scale: 1.05, background: '#F1F5F9' }}
                whileTap={{ scale: 0.95 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'white', color: '#0C637E', fontWeight: 600, fontSize: '0.875rem', border: '1.5px solid #E2E8F0', cursor: 'pointer', fontFamily: P, textDecoration: 'none' }}
              >
                <Play size={14} /> How to Get Started
              </motion.a>
            </motion.div>
            <div style={{ display: 'flex', gap: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid #E2E8F0' }}>
              {[['< 4 min', 'Response Time'], ['10K+', 'Active Users'], ['99.9%', 'Uptime']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0C637E', marginBottom: '2px', fontFamily: P }}>{val}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: P }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-40px', borderRadius: '60px', background: 'radial-gradient(ellipse at center,rgba(12,99,126,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <motion.img src={heroMockup} alt="MediFind App" loading="lazy" animate="animate" variants={float}
              style={{ width: '100%', borderRadius: '28px', boxShadow: '0 28px 70px rgba(12,99,126,0.16)', position: 'relative', zIndex: 1 }} />
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}
              style={{ position: 'absolute', bottom: '2rem', left: '-1.5rem', background: 'white', borderRadius: '14px', padding: '0.9rem 1.1rem', boxShadow: '0 10px 36px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.7rem', zIndex: 2 }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="#10B981" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A', fontFamily: P }}>Responder Verified</div>
                <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 500, fontFamily: P }}>● ETA 3 min 42 sec</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust Stats Bar (moved here from mid-page per QA) ─────── */}
      <section style={{ background: 'linear-gradient(135deg,#03293C 0%,#0C637E 55%,#2496A7 100%)', padding: '2.25rem 0' }}>
        <div style={{ padding: PX, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', textAlign: 'center' }}>
          {stats.map((s, i) => (
            <FadeIn key={s.label} delay={i * 80}>
              <div style={{ padding: '0.5rem 1rem', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem', fontFamily: P }}>
                  <Counter end={s.value} suffix={s.suffix} prefix={s.prefix} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: P }}>{s.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* About section removed — content folded into hero */}
      {false && <section id="about" style={{ display: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(12,99,126,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(36,150,167,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ padding: PX, position: 'relative', zIndex: 1 }}>
          <SectionHead badge="The MediFind Identity" badgeBg="rgba(255,255,255,0.05)" badgeColor="white"
            title="Our Core Branding Pillars"
            sub="MediFind is more than an app; it is a promise of safety and inclusivity for every individual in crisis."
            light />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', marginTop: '2rem' }}>
            {[
              { icon: Mic, title: 'Universal Inclusivity', color: '#8B5CF6', desc: 'We are the first emergency platform built for silence. Our mission is to ensure that being Deaf or Mute is never a barrier to being saved.', tag: 'The Silent SOS' },
              { icon: Users, title: 'The Human Network', color: '#0C637E', desc: 'We bridge the gap between Patient, Caregiver, and Responder, creating a unified ecosystem of trust and real-time coordination.', tag: 'Bonded Safety' },
              { icon: Shield, title: 'Verified Precision', color: '#10B981', desc: 'Trust is our foundation. We verify every responder and encrypt every medical report to ensure professional-grade care.', tag: 'Security & Integrity' },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 150}>
                <motion.div whileHover={{ y: -15, background: 'rgba(255,255,255,0.05)' }}
                  style={{ background: 'rgba(255,255,255,0.03)', padding: '3.5rem 2.5rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', height: '100%', textAlign: 'center', transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: `1px solid ${p.color}40`, boxShadow: `0 10px 30px ${p.color}15` }}>
                    <p.icon size={32} color={p.color} />
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: p.color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>{p.tag}</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '1.25rem', fontFamily: P }}>{p.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, fontFamily: P }}>{p.desc}</p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={500}>
            <div style={{ marginTop: '5rem', padding: '3rem', borderRadius: '32px', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <h4 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Our Vision for 2026</h4>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', maxWidth: '600px', margin: '0 auto' }}>
                To become the global standard for inclusive emergency response, ensuring no one is left behind because of a communication barrier.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>}

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: '4.5rem 0', background: '#F8FAFC' }}>
        <div style={{ padding: PX }}>
          <FadeIn>
            <SectionHead badge="Core Features" badgeIcon={Zap} badgeBg="#E2F0F3" badgeColor="#0C637E"
              title="Built for Every Emergency"
              sub="Every feature is designed around one goal: getting the right help to the right person in the shortest time possible." />
          </FadeIn>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeInUp}
                whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(12,99,126,0.12)' }}
                style={{ background: 'white', borderRadius: '18px', padding: '1.75rem', border: '1px solid #E2E8F0', transition: 'box-shadow 0.3s ease', cursor: 'default', height: '100%' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.1rem' }}>
                  <f.icon size={20} color={f.color} />
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.5rem', fontFamily: P }}>{f.title}</h3>
                <p style={{ fontSize: '0.855rem', color: '#64748B', lineHeight: 1.7, fontFamily: P, fontWeight: 400 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '4.5rem 0', background: 'white' }}>
        <div style={{ padding: PX }}>
          <FadeIn>
            <SectionHead badge="How It Works" badgeIcon={Activity} badgeBg="#E2F0F3" badgeColor="#0C637E"
              title="From SOS to Safety in 4 Steps"
              sub="A seamless emergency response pipeline designed to minimize every second of delay." />
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '2.4rem', left: 'calc(12.5% + 26px)', right: 'calc(12.5% + 26px)', height: '2px', background: 'linear-gradient(90deg,#DC2626,#0C637E,#2496A7,#2891C2)', borderRadius: '2px', zIndex: 0 }} />
            {steps.map((s, i) => (
              <FadeIn key={s.title} delay={i * 110}>
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'white', border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.35rem', boxShadow: `0 0 0 5px ${s.color}18` }}>
                    <s.icon size={20} color={s.color} />
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontFamily: P }}>{s.num}</div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.5rem', fontFamily: P }}>{s.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.65, fontFamily: P, fontWeight: 400 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Is It For (Solutions) ─────────────────────────── */}
      <section id="solutions" style={{ padding: '4.5rem 0', background: '#F8FAFC' }}>
        <div style={{ padding: PX }}>
          <FadeIn>
            <SectionHead badge="Built for Every Role" badgeIcon={Users} badgeBg="#E2F0F3" badgeColor="#0C637E"
              title="One Platform. Four Roles."
              sub="Whether you're a patient, caregiver, responder, or administrator — MediFind is built with your exact needs in mind." />
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1.5rem' }}>
            {roles.map((r, i) => (
              <FadeIn key={r.title} delay={i * 80}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 24px 48px rgba(3,41,60,0.12)' }}
                  style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #E2E8F0', transition: 'box-shadow 0.3s ease' }}
                >
                  {/* Colour header strip */}
                  <div style={{ background: r.gradient, padding: '1.75rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.875rem' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <r.icon size={22} color="white" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: P }}>{r.title}</div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', lineHeight: 1.3, fontFamily: P, margin: 0 }}>{r.headline}</h3>
                      </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.845rem', lineHeight: 1.7, fontFamily: P, fontWeight: 400, margin: 0 }}>{r.desc}</p>
                  </div>
                  {/* Feature points */}
                  <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {r.points.map((pt) => (
                      <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                        <CheckCircle size={15} color="#0C637E" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.845rem', color: '#334155', fontWeight: 500, lineHeight: 1.5, fontFamily: P }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 0', background: 'linear-gradient(135deg,#04364E 0%,#0C637E 60%,#2496A7 100%)' }}>
        <div style={{ padding: PX, textAlign: 'center' }}>
          <FadeIn>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', lineHeight: 1.3, fontFamily: P }}>
              Be Ready Before the Emergency.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', marginBottom: '2.25rem', lineHeight: 1.8, fontFamily: P, fontWeight: 400, maxWidth: '520px', margin: '0 auto 2.25rem' }}>
              Download MediFind today and give yourself and your family a fighting chance when every second matters.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.a
                href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
                whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'white', color: '#0C637E', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', cursor: 'pointer', fontFamily: P }}
              >
                <Download size={15} /> Download Free
              </motion.a>
              <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', fontFamily: P }}>
                Admin Portal <ArrowRight size={14} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ background: '#0B1628', color: 'rgba(255,255,255,0.55)', fontFamily: P }}>
        {/* Brand-color top accent bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #03293C, #0C637E, #2496A7, #2891C2)' }} />

        <div style={{ padding: PX, paddingTop: '4rem' }}>
          {/* Main 3-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr 1fr', gap: '4rem', marginBottom: '3.5rem', alignItems: 'flex-start' }}>

            {/* ── Brand Column ── */}
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <img src={logo} alt="MediFind" style={{ height: '100px', objectFit: 'contain', display: 'block', filter: 'brightness(1.15) drop-shadow(0 0 8px rgba(36,150,167,0.45))', margin: '-15px 0' }} loading="lazy" />
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.85, maxWidth: '270px', fontFamily: P, fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginBottom: '1.75rem' }}>
                Pakistan's first inclusive emergency response platform. Built to save every life.
              </p>
              <motion.a
                href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'rgba(36,150,167,0.12)', color: '#2496A7', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none', border: '1px solid rgba(36,150,167,0.28)', cursor: 'pointer', fontFamily: P, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(36,150,167,0.22)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = 'rgba(36,150,167,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(36,150,167,0.12)'; e.currentTarget.style.color = '#2496A7'; e.currentTarget.style.borderColor = 'rgba(36,150,167,0.28)'; }}
              >
                <Download size={13} /> Download Free App
              </motion.a>
            </div>

            {/* ── Platform Column ── */}
            <div>
              <div style={{ fontWeight: 700, color: '#2496A7', marginBottom: '1.4rem', fontSize: '0.75rem', fontFamily: P, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Platform</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Get Started', '#get-started']].map(([label, href]) => (
                  <a key={href} href={href}
                    style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P, fontWeight: 400 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#2496A7'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                  >
                    {label}
                  </a>
                ))}
                <Link to="/login"
                  style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P, fontWeight: 400 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#2496A7'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >Admin Portal</Link>
              </div>
            </div>

            {/* ── Legal & Company Column ── */}
            <div>
              <div style={{ fontWeight: 700, color: '#2496A7', marginBottom: '1.4rem', fontSize: '0.75rem', fontFamily: P, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Legal</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                <Link to="/terms"
                  style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P, fontWeight: 400 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#2496A7'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >Terms &amp; Conditions</Link>
                <Link to="/privacy"
                  style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P, fontWeight: 400 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#2496A7'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >Privacy Policy</Link>
                <a href="#contact"
                  style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P, fontWeight: 400 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#2496A7'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >Contact Us</a>
                <a href="#about"
                  style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P, fontWeight: 400 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#2496A7'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >About MediFind</a>
              </div>
            </div>

          </div>

          {/* ── Bottom Bar ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.5rem', paddingBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.78rem', fontFamily: P, fontWeight: 400, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              © 2026 MediFind Emergency Response Platform. All rights reserved. Made with ❤️ in Pakistan.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link to="/terms"
                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >Terms</Link>
              <Link to="/privacy"
                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >Privacy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Back to Top Button ─────────────────────────────────── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ duration: 0.25 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            title="Back to top"
            style={{
              position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 999,
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'linear-gradient(135deg,#0C637E,#2496A7)',
              color: 'white', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(12,99,126,0.4)',
            }}
            whileHover={{ scale: 1.12, boxShadow: '0 10px 28px rgba(12,99,126,0.55)' }}
            whileTap={{ scale: 0.92 }}
          >
            <ChevronUp size={22} />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;
