import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, MapPin, FileText, Users, Lock, ArrowRight,
  Phone, Heart, Truck, User, Shield, Activity, Clock,
  CheckCircle, Star, MessageSquare, Bell, BarChart3,
  Download, Play, HeartPulse, ChevronDown, Menu, X,
  Mic, Eye, Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/Medifind_New_Logo-removebg-preview.png';
import heroMockup from '../assets/medifind_bento_hero_1776705879322.png';

const P = 'Poppins, sans-serif';

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
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

const float = {
  animate: {
    y: [0, -15, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
  }
};

const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-100px" }}
    variants={fadeInUp}
    transition={{ delay: delay / 1000 }}
  >
    {children}
  </motion.div>
);

/* ── Contact Form ─────────────────────────────────────────────── */
const ContactForm = () => {
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
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 800);
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
  <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
    <Badge icon={badgeIcon} label={badge} bg={badgeBg} color={badgeColor} />
    <h2 style={{ fontSize: '2rem', fontWeight: 700, color: light ? 'white' : '#0F172A', marginBottom: '0.75rem', fontFamily: P, lineHeight: 1.25 }}>{title}</h2>
    {sub && <p style={{ fontSize: '0.95rem', color: light ? 'rgba(255,255,255,0.75)' : '#64748B', maxWidth: '520px', margin: '0 auto', lineHeight: 1.75, fontFamily: P, fontWeight: 400 }}>{sub}</p>}
  </div>
);

/* ── Main Landing Page ─────────────────────────────────────────── */
const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: Zap,          title: 'Instant SOS',               desc: 'One-tap emergency alert reaches all nearby verified responders within seconds.',                                                color: '#FF6B6B', bg: '#FFF5F5' },
    { icon: MapPin,       title: 'Live GPS Tracking',          desc: 'Real-time responder location on an interactive map so you always know when help arrives.',                                      color: '#0C637E', bg: '#EBF8FF' },
    { icon: FileText,     title: 'Medical Profile Sharing',    desc: 'Blood type, allergies, medications — instantly delivered to incoming responders.',                                              color: '#2496A7', bg: '#E0F7FA' },
    { icon: Heart,        title: 'Caregiver Alerts',           desc: 'Family members receive live push notifications and a map view the moment an SOS is triggered.',                                color: '#F59E0B', bg: '#FFFBEB' },
    { icon: Mic,          title: 'Silent SOS for Deaf Users',  desc: 'Icon-driven, voice-free emergency interface built specifically for Deaf and Mute patients.',                                   color: '#8B5CF6', bg: '#F5F3FF' },
    { icon: Lock,         title: 'End-to-End Encryption',      desc: 'All communications and medical data are encrypted at rest and in transit.',                                                    color: '#10B981', bg: '#ECFDF5' },
  ];

  const steps = [
    { num: '01', icon: Zap,         title: 'Trigger SOS',          desc: 'One tap sends your GPS coordinates and medical snapshot to our dispatch network.',     color: '#FF6B6B' },
    { num: '02', icon: Bell,        title: 'Responders Notified',   desc: 'Nearest verified responders are alerted with your location and condition summary.',    color: '#F59E0B' },
    { num: '03', icon: MapPin,      title: 'Live Tracking',         desc: 'You and your caregivers watch the responder navigate to you on a live map.',           color: '#2496A7' },
    { num: '04', icon: CheckCircle, title: 'Resolution & Report',   desc: 'Responder confirms arrival, logs the outcome. Your caregiver gets notified.',         color: '#10B981' },
  ];

  const roles = [
    {
      icon: User,      title: 'For Patients',      gradient: 'linear-gradient(135deg,#0C637E,#2496A7)',
      headline: 'Help is One Tap Away',
      desc: "No calls. No delays. Whether you speak or not, MediFind's inclusive SOS works for everyone — including Deaf and Mute users through our Silent Request feature.",
      points: ['One-tap SOS with instant GPS sharing', 'Silent Request for Deaf & Mute users', 'Medical profile auto-shared with responder', 'Live ETA tracking on map'],
    },
    {
      icon: Heart,     title: 'For Caregivers',    gradient: 'linear-gradient(135deg,#F59E0B,#EF6C00)',
      headline: 'Stay Connected to the People You Love',
      desc: 'Receive instant alerts the moment your patient triggers SOS. Track the responder live and stay informed at every step — without being physically there.',
      points: ['Instant push notification on SOS trigger', 'Live responder tracking on map', 'Real-time emergency status updates', 'Emergency history & outcome reports'],
    },
    {
      icon: Truck,     title: 'For Responders',    gradient: 'linear-gradient(135deg,#2496A7,#2891C2)',
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
    { value: 4,     suffix: ' min', prefix: '< ', label: 'Avg Response Time', icon: Clock    },
    { value: 99.9,  suffix: '%',    prefix: '',   label: 'System Uptime',     icon: Activity },
    { value: 10000, suffix: '+',    prefix: '',   label: 'Registered Users',  icon: Users    },
    { value: 500,   suffix: '+',    prefix: '',   label: 'Verified Responders', icon: Shield },
  ];

  const faqs = [
    { q: 'How are emergency responders verified?',     a: 'Every responder submits professional credentials — CNIC, license number, and employee ID — which are manually audited by our admin team before they can receive any SOS signals.' },
    { q: 'Does MediFind work for Deaf or Mute users?', a: 'Yes. Our "Silent Request" interface uses an icon-driven emergency protocol designed for non-verbal communication, with pre-written phrases and haptic feedback.' },
    { q: 'Where is my medical data stored?',           a: 'Your data is stored in localized encrypted databases. It is only shared temporarily during an active emergency event, then re-encrypted immediately after.' },
    { q: 'What happens if my GPS or internet is off?', a: 'MediFind caches your last known GPS location and queues the SOS signal for immediate transmission when connectivity restores. An offline banner keeps you informed.' },
    { q: 'Can I add family members as caregivers?',    a: 'Yes. Invite caregivers directly from the app. Once accepted, they receive real-time push notifications and a live map view every time you trigger an SOS.' },
  ];

  // shared horizontal padding
  const PX = '0 5%';

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
        <div style={{ padding: PX, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '120px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={logo} alt="MediFind" style={{ height: '110px', objectFit: 'contain' }} />
          </Link>
          <div style={{ display: 'flex', gap: '2.25rem', alignItems: 'center' }}>
            {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Solutions', '#solutions'], ['Contact', '#contact']].map(([label, href]) => (
              <a key={href} href={href} style={{ fontWeight: 500, color: '#475569', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P }}
                onMouseEnter={e => e.target.style.color = '#0C637E'}
                onMouseLeave={e => e.target.style.color = '#475569'}>
                {label}
              </a>
            ))}
            <Link to="/login" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'linear-gradient(135deg,#0C637E,#2496A7)', color: 'white', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: P }}>
              Admin Portal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ paddingTop: '110px', paddingBottom: '80px', background: 'linear-gradient(150deg,#F0F9FC 0%,#E8F5FA 55%,#F8FAFC 100%)' }}>
        <div style={{ padding: PX, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>

          {/* Left */}
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
              <motion.button variants={fadeInUp} whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(12,99,126,0.35)' }} whileTap={{ scale: 0.95 }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'linear-gradient(135deg,#0C637E,#2496A7)', color: 'white', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontFamily: P }}>
                <Download size={15} /> Download App
              </motion.button>
              <motion.button variants={fadeInUp} whileHover={{ scale: 1.05, background: '#F1F5F9' }} whileTap={{ scale: 0.95 }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'white', color: '#0C637E', fontWeight: 600, fontSize: '0.875rem', border: '1.5px solid #E2E8F0', cursor: 'pointer', fontFamily: P }}>
                <Play size={14} /> Explore Demo
              </motion.button>
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

          {/* Right */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-40px', borderRadius: '60px', background: 'radial-gradient(ellipse at center,rgba(12,99,126,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <motion.img src={heroMockup} alt="MediFind App" loading="lazy" animate="animate" variants={float}
              style={{ width: '100%', borderRadius: '28px', boxShadow: '0 28px 70px rgba(12,99,126,0.16)', position: 'relative', zIndex: 1 }} />
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }} style={{ position: 'absolute', bottom: '2rem', left: '-1.5rem', background: 'white', borderRadius: '14px', padding: '0.9rem 1.1rem', boxShadow: '0 10px 36px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.7rem', zIndex: 2 }}>
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

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg,#04364E 0%,#0C637E 50%,#2496A7 100%)', padding: '3rem 0' }}>
        <div style={{ padding: PX, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', textAlign: 'center' }}>
          {stats.map((s, i) => (
            <FadeIn key={s.label} delay={i * 100}>
              <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'white', marginBottom: '0.4rem', fontFamily: P }}>
                  <Counter end={s.value} suffix={s.suffix} prefix={s.prefix} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: P }}>{s.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: '6rem 0', background: '#F8FAFC' }}>
        <div style={{ padding: PX }}>
          <FadeIn>
            <SectionHead
              badge="Core Features" badgeIcon={Zap} badgeBg="#E2F0F3" badgeColor="#0C637E"
              title="Built for Every Emergency"
              sub="Every feature is designed around one goal: getting the right help to the right person in the shortest time possible."
            />
          </FadeIn>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
            {features.map((f, i) => (
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
      <section id="how-it-works" style={{ padding: '6rem 0', background: 'white' }}>
        <div style={{ padding: PX }}>
          <FadeIn>
            <SectionHead
              badge="How It Works" badgeIcon={Activity} badgeBg="#FFF5F5" badgeColor="#FF6B6B"
              title="From SOS to Safety in 4 Steps"
              sub="A seamless emergency response pipeline designed to minimize every second of delay."
            />
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '2.4rem', left: 'calc(12.5% + 26px)', right: 'calc(12.5% + 26px)', height: '2px', background: 'linear-gradient(90deg,#FF6B6B,#F59E0B,#2496A7,#10B981)', borderRadius: '2px', zIndex: 0 }} />
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

      {/* ── Role Sections ──────────────────────────────────────── */}
      <section id="solutions" style={{ padding: '6rem 0', background: '#F8FAFC' }}>
        <div style={{ padding: PX }}>
          <FadeIn>
            <SectionHead
              badge="Built for Every Role" badgeIcon={Users} badgeBg="#EEF2FF" badgeColor="#6366F1"
              title="One Platform. Four Roles."
            />
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {roles.map((r, i) => (
              <FadeIn key={r.title} delay={i * 80}>
                <div style={{ display: 'grid', gridTemplateColumns: i % 2 === 0 ? '1fr 1.5fr' : '1.5fr 1fr', gap: '0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
                  {/* Gradient side */}
                  <div style={{ order: i % 2 === 0 ? 0 : 1, background: r.gradient, padding: '2.5rem 2.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '13px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                      <r.icon size={24} color="white" />
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontFamily: P }}>{r.title}</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.9rem', lineHeight: 1.25, fontFamily: P }}>{r.headline}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.875rem', lineHeight: 1.75, fontFamily: P, fontWeight: 400 }}>{r.desc}</p>
                  </div>
                  {/* Points side */}
                  <div style={{ order: i % 2 === 0 ? 1 : 0, background: 'white', padding: '2.5rem 2.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      {r.points.map((p) => (
                        <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                            <CheckCircle size={12} color="#10B981" />
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, lineHeight: 1.55, fontFamily: P }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deaf & Mute Highlight ──────────────────────────────── */}
      <section style={{ padding: '5.5rem 0', background: 'linear-gradient(135deg,#0C637E 0%,#2891C2 100%)' }}>
        <div style={{ padding: PX, textAlign: 'center' }}>
          <FadeIn>
            <div style={{ width: '68px', height: '68px', borderRadius: '18px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem' }}>
              <Mic size={30} color="white" />
            </div>
            <SectionHead
              badge="Inclusive Design" badgeBg="rgba(255,255,255,0.15)" badgeColor="white"
              title="The First Emergency App Designed for Silence."
              sub="MediFind's Silent Request system lets Deaf and Mute patients trigger a full emergency response using pre-written phrases and icon-driven communication — no speaking, no calling, no barriers."
              light
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', maxWidth: '680px', margin: '0 auto' }}>
              {[
                { icon: Smartphone,    label: 'One-Tap SOS',        sub: 'No voice required' },
                { icon: MessageSquare, label: 'Pre-Written Phrases', sub: 'Customizable shortcuts' },
                { icon: Eye,           label: 'Visual Alerts',       sub: 'Screen flash + vibration' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '14px', padding: '1.4rem 1rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <item.icon size={22} color="white" style={{ marginBottom: '0.6rem' }} />
                  <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem', marginBottom: '0.2rem', fontFamily: P }}>{item.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontFamily: P, fontWeight: 400 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 0', background: 'white' }}>
        <div style={{ padding: PX, maxWidth: '820px', margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontFamily: P }}>Frequently Asked Questions</h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', fontFamily: P, fontWeight: 400 }}>Everything you need to know about MediFind.</p>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 55}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', background: openFaq === i ? '#F8FAFC' : 'white' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', padding: '1.1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: P }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0F172A', paddingRight: '1rem', fontFamily: P }}>{faq.q}</span>
                    <ChevronDown size={17} color="#94A3B8" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 1.4rem 1.1rem', fontSize: '0.855rem', color: '#64748B', lineHeight: 1.75, fontFamily: P, fontWeight: 400 }}>{faq.a}</div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: '6rem 0', background: '#F8FAFC' }}>
        <div style={{ padding: PX, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'start' }}>
          <FadeIn>
            <div>
              <Badge icon={MessageSquare} label="Get In Touch" />
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.9rem', fontFamily: P }}>Let's Connect</h2>
              <p style={{ color: '#64748B', marginBottom: '2.25rem', lineHeight: 1.8, fontSize: '0.9rem', fontFamily: P, fontWeight: 400 }}>
                Whether you're a hospital, NGO, or individual — we'd love to hear from you. Our team responds within 24 hours.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {[
                  { icon: Phone,         label: 'Phone',    value: '+92 300 000 0000' },
                  { icon: MessageSquare, label: 'Email',    value: 'support@medifind.pk' },
                  { icon: MapPin,        label: 'Based in', value: 'Pakistan 🇵🇰' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: '#E2F0F3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={17} color="#0C637E" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: P }}>{item.label}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1E293B', fontFamily: P }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={140}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '2.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
              <ContactForm />
            </div>
          </FadeIn>
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
              <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'white', color: '#0C637E', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontFamily: P }}>
                <Download size={15} /> Download Free
              </button>
              <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: '10px', background: 'rgba(255,255,255,0.14)', color: 'white', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)', fontFamily: P }}>
                Admin Portal <ArrowRight size={14} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ background: '#0F172A', color: 'rgba(255,255,255,0.55)', padding: '4rem 0 2rem', fontFamily: P }}>
        <div style={{ padding: PX }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <img src={logo} alt="MediFind" style={{ height: '90px', objectFit: 'contain', filter: 'brightness(1.15) drop-shadow(0 0 8px rgba(36,150,167,0.45))' }} loading="lazy" />
              </div>
              <p style={{ fontSize: '0.83rem', lineHeight: 1.75, maxWidth: '230px', fontFamily: P, fontWeight: 400 }}>Pakistan's first inclusive emergency response platform. Built to save every life.</p>
            </div>
            {[
              { heading: 'Platform', links: ['Features', 'How It Works', 'Pricing', 'For Organizations'] },
              { heading: 'Support',  links: ['Documentation', 'FAQ', 'Contact Us', 'Privacy Policy']     },
              { heading: 'Company', links: ['About', 'Team', 'Blog', 'Careers']                          },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontWeight: 600, color: 'white', marginBottom: '1rem', fontSize: '0.83rem', fontFamily: P }}>{col.heading}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: P, fontWeight: 400 }}
                      onMouseEnter={e => e.target.style.color = '#2496A7'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ fontSize: '0.78rem', fontFamily: P, fontWeight: 400 }}>© 2026 MediFind. All rights reserved. Made with ❤️ in Pakistan.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
