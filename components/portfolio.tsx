'use client';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useAnimate, useInView, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { ArrowDown, ArrowDownRight, ArrowUpRight, Check, Link, Moon, Sun, Terminal } from 'lucide-react';
import { projects, type Project } from '@/data/projects';
import { certificates } from '@/data/certificates';
import CertCarousel from '@/components/cert-carousel';

const nav = [['About', 'about'], ['Projects', 'projects'], ['Experience', 'experience'], ['Contact', 'contact']];
const roles = ['front-end developer', 'computer science student', 'UI/UX tinkerer', 'problem solver'];
const stack = ['Java', 'Python', 'JavaScript', 'C++', 'Kotlin', 'PHP', 'HTML', 'CSS', 'React', 'Git', 'Figma', 'Firebase', 'Supabase', 'Render', 'Apify', 'SAP S/4HANA'];
const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
const pad = (n: number) => String(n).padStart(2, '0');
/** Inline CSS custom property for an entrance delay (ms), read by the hero/boot keyframes in globals.css. */
const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

const EASE_OUT = [0.22, 1, 0.36, 1] as const; // matches --ease-out in globals.css
/** Seconds after a section divider enters at which that section's content may start rising (divider + heading go first). */
const CONTENT_START = 0.45;
/** Gap between staggered cards / layered card parts, in seconds (scaled by scroll speed). */
const STAGGER = 0.09;
let lastSectionEnter = -Infinity;

/* ── Boot state ────────────────────────────────────────────────────────────
   The inline script in layout.tsx adds `is-booted` to <html> when the boot overlay finishes (or immediately on
   repeat visits / reduced motion). Components subscribe so hero decode effects start after the overlay is gone. */
function subscribeBoot(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => mo.disconnect();
}
const useBooted = () => useSyncExternalStore(subscribeBoot, () => document.documentElement.classList.contains('is-booted'), () => false);

/* ── Scroll-speed-aware timing ──────────────────────────────────────────────
   The faster the visitor scrolls, the shorter the entry sequence, so fast scrolling never waits on animation. */
let scrollV = 0; // smoothed scroll speed, px per ms
let lastY = 0, lastT = -Infinity;
function trackScrollSpeed() {
  const t = performance.now(), y = window.scrollY, dt = t - lastT, dy = Math.abs(y - lastY);
  // First event after a pause has no previous timestamp to measure against: judge it by the jump size instead
  // (assume ~50ms between events), so a big first flick still counts as fast.
  scrollV = dt > 0 && dt < 200 ? scrollV * 0.5 + (dy / dt) * 0.5 : dy / 50;
  lastY = y; lastT = t;
}
/** Time multiplier: 1 = full sequence (reading-speed scroll, ≤0.6px/ms) … 0.25 = compressed (fast flick / nav jump, ≥2.4px/ms). */
function speedFactor() {
  if (performance.now() - lastT > 250) return 1; // not actively scrolling
  return Math.min(1, Math.max(0.25, 1 - (scrollV - 0.6) / 2.4));
}

/**
 * Soft upward fade + slight scale for section content. Waits for its section's divider → heading sequence
 * (scaled to scroll speed); content reached later animates straight away.
 * - `index` staggers sibling Reveals (cards) so they arrive one after another.
 * - Descendants marked `data-ri="<order>"` animate individually in that order (layered cards, timeline items,
 *   carousel cards) instead of the whole block at once.
 */
function Reveal({ children, className = '', index = 0 }: { children: ReactNode; className?: string; index?: number }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { once: true, amount: 0.1 });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = scope.current;
    if (!inView || !el) return;
    const items = [...el.querySelectorAll<HTMLElement>('[data-ri]')]
      .filter(n => n.closest('.reveal') === el)
      .sort((a, b) => Number(a.dataset.ri) - Number(b.dataset.ri));
    if (reduce) {
      animate(el, { opacity: 1 }, { duration: 0 });
      items.forEach(n => animate(n, { opacity: 1 }, { duration: 0 }));
      return;
    }
    const divider = el.closest('section')?.querySelector<HTMLElement>('.section-divider');
    const dividerPending = !!divider && !divider.classList.contains('is-entered');
    // Use the speed the section entered with, so content stays in step with its divider/heading.
    const f = dividerPending || !divider ? speedFactor() : Number(divider.dataset.seq ?? 1);
    const start = CONTENT_START * f;
    const since = (performance.now() - lastSectionEnter) / 1000;
    const delay = (dividerPending ? start : Math.max(0, start - since)) + index * STAGGER * f;
    const duration = 0.6 * Math.max(Math.min(f, speedFactor()), 0.45);
    const from = { opacity: 0, y: 16, scale: 0.985 };
    if (items.length) {
      animate(el, { opacity: 1 }, { duration: 0, delay });
      items.forEach((n, k) => animate(n, { opacity: [from.opacity, 1], y: [from.y, 0], scale: [from.scale, 1] }, { duration, ease: EASE_OUT, delay: delay + k * STAGGER * f }));
    } else {
      animate(el, { opacity: [from.opacity, 1], y: [from.y, 0], scale: [from.scale, 1] }, { duration, ease: EASE_OUT, delay });
    }
  }, [inView, reduce, animate, scope, index]);
  return <div ref={scope} className={`reveal ${className}`}>{children}</div>;
}

/** Each section entry nudges the background grid a little further and briefly lifts the ambient glow. */
let gridStep = 0;
function pulseBackground() {
  const root = document.documentElement;
  gridStep += 1;
  root.style.setProperty('--grid-shift', `${gridStep * 11}px`);
  root.classList.add('section-pulse');
  return setTimeout(() => root.classList.remove('section-pulse'), 650);
}

/**
 * Text that "decodes" in place from random glyphs (no sideways motion).
 * Runs once when visible and `start` is true, after `delay` ms; bump `replay` to run it again (e.g. on hover).
 */
function Scramble({ text, className = '', start = true, delay = 0, replay = 0 }: { text: string; className?: string; start?: boolean; delay?: number; replay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (!start || !inView || reduce) return;
    let frame = 0, raf = 0;
    const tick = () => {
      frame++;
      const revealed = Math.floor(frame / 2);
      setOut(text.split('').map((c, i) => (i < revealed || c === ' ' ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(''));
      if (revealed < text.length) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); setOut(text); };
  }, [start, inView, reduce, text, delay, replay]);
  return <span ref={ref} className={className}><span className="sr-only">{text}</span><span aria-hidden="true">{out}</span></span>;
}

function Typewriter({ words }: { words: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [len, setLen] = useState(words[0].length);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (reduce) return;
    const word = words[index];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && len === word.length) t = setTimeout(() => setDeleting(true), 1900);
    else if (deleting && len === 0) t = setTimeout(() => { setDeleting(false); setIndex((index + 1) % words.length); }, 300);
    else t = setTimeout(() => setLen(len + (deleting ? -1 : 1)), deleting ? 35 : 70);
    return () => clearTimeout(t);
  }, [len, deleting, index, words, reduce]);
  return <span className="typewriter"><span className="sr-only">{words.join(', ')}</span><span aria-hidden="true">{words[index].slice(0, len)}<span className="caret" /></span></span>;
}

function useManilaClock() {
  const [now, setNow] = useState('--:--:--');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const update = () => setNow(fmt.format(new Date()));
    const first = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  return now;
}

/** Quick terminal boot sequence shown before the hero. Pure CSS timing; `is-booted` (set in layout.tsx) dismisses it. */
function BootScreen() {
  const lines = ['mounting interface', 'loading projects', 'verifying certificates', 'establishing link'];
  return <div className="boot" aria-hidden="true">
    <div className="boot-inner">
      <div className="boot-brand">&lt;vm<span>/</span>&gt; <small>portfolio.sys — v2026</small></div>
      <ol className="boot-log">
        {lines.map((l, i) => <li key={l} style={{ '--i': i } as CSSProperties}><span className="boot-text">&gt; {l}</span><span className="boot-ok">[ ok ]</span></li>)}
      </ol>
      <div className="boot-bar"><span /></div>
    </div>
  </div>;
}

/** Nav link whose label decodes once after boot and again on hover/focus. */
function NavLink({ label, id, i, active, booted }: { label: string; id: string; i: number; active: boolean; booted: boolean }) {
  const [replay, setReplay] = useState(0);
  return <a href={`#${id}`} className={active ? 'active' : ''} aria-current={active ? 'true' : undefined}
    onMouseEnter={() => setReplay(r => r + 1)} onFocus={() => setReplay(r => r + 1)}>
    <span>{pad(i + 1)}.</span><Scramble text={label} start={booted} delay={250 + i * 70} replay={replay} />
  </a>;
}

const SECTION_COUNT = 4;

/**
 * Terminal-style marker that opens every major section: [01] // LABEL ───── 01 / 04
 * On first entry it plays once: divider fades in → heading rises → content rises (CSS, keyed off .is-entered).
 */
function SectionDivider({ number, label }: { number: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const entered = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const reduce = useReducedMotion();
  // Capture scroll speed at the moment of entry, before paint, so the CSS transitions start with the right timing.
  // --seq lives on the divider's parent so the sibling heading inherits it; data-seq is read by Reveal.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!entered || !el) return;
    const f = speedFactor().toFixed(2);
    el.dataset.seq = f;
    el.parentElement?.style.setProperty('--seq', f);
  }, [entered]);
  useEffect(() => {
    if (!entered) return;
    lastSectionEnter = performance.now();
    if (reduce) return;
    const t = pulseBackground();
    return () => { clearTimeout(t); document.documentElement.classList.remove('section-pulse'); };
  }, [entered, reduce]);
  return <div ref={ref} className={`section-divider${entered ? ' is-entered' : ''}`}>
    <span className="sd-label"><span className="eyebrow-num">[{number}]</span>{`// ${label}`}</span>
    <span className="sd-track" aria-hidden="true"><span className="sd-line" /></span>
    <span className="sd-count" aria-hidden="true">{number} / {pad(SECTION_COUNT)}</span>
  </div>;
}

function SectionHeading({ number, label, title, description }: { number: string; label: string; title: string; description?: string }) {
  return <>
    <SectionDivider number={number} label={label} />
    <div className="section-heading">
      <div aria-hidden="true" />
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
    </div>
  </>;
}

/** Project card. `data-ri` orders its layered entrance: image → tags → title → description → button. */
function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const detailsId = `project-${project.number}-details`;
  const slug = project.name.toLowerCase().replace(/\s+/g, '-');
  return <article className="project-card hud">
    <div className="window-bar">
      <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="window-file"><Scramble text={`~/projects/${slug}`} delay={200} /></span>
      <span className="window-id">{project.number} / {pad(projects.length)}</span>
    </div>
    <div className="project-visual" data-ri="0">
      {project.image
        ? <>
          <Image src={project.image} alt={`${project.name} project poster`} fill sizes="(max-width: 600px) 100vw, 50vw" className="project-image" style={{ objectPosition: project.imagePosition ?? 'center' }} />
          {project.imageFull && <a className="visual-open" href={project.imageFull} target="_blank" rel="noreferrer">VIEW FULL POSTER <ArrowUpRight size={13} /></a>}
        </>
        : <>
          <span className="visual-top"><span>{project.type}</span><ArrowUpRight size={18} /></span>
          <span className="visual-mark glitch" data-text={project.name.charAt(0)} aria-hidden="true">{project.name.charAt(0)}</span>
          <span className="visual-bottom"><span>BUILD_{project.number}</span><span className="blink">● RENDERING PREVIEW…</span></span>
          <span className="visual-scan" aria-hidden="true" />
        </>}
    </div>
    <div className="project-info">
      <div className="project-title" data-ri="2">
        <div><span className="small-label"><Scramble text={`${project.type} / ${project.role}`} delay={350} /></span><h3>{project.name}</h3></div>
      </div>
      <p data-ri="3">{project.description}</p>
      <div className="tags" data-ri="1">{project.stack.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div>
      <button className="project-toggle" data-ri="4" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={detailsId}>
        <span><span className="prompt">$</span> {open ? 'close --details' : 'open --details'}</span> <ArrowDownRight size={17} />
      </button>
      <div id={detailsId} className="project-details" hidden={!open}>
        <span className="small-label">MY CONTRIBUTION</span><p>{project.contribution}</p>
        <ul>{project.highlights.map(item => <li key={item}>{item}</li>)}</ul>
        <p><strong>Full stack:</strong> {project.stack.join(' · ')}</p>
        <div className="project-links">
          {project.live ? <a href={project.live} target="_blank" rel="noreferrer">Live demo ↗</a> : <span>Live demo · coming soon</span>}
          {project.github ? <a href={project.github} target="_blank" rel="noreferrer">GitHub ↗</a> : <span>GitHub · coming soon</span>}
        </div>
      </div>
    </div>
  </article>;
}

function ContactForm() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setStatus('');
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setStatus('Thank you! Your message has been sent.');
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="contact-form hud">
    <div className="window-bar"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span className="window-file"><Scramble text="new_message.txt" delay={200} /></span><span className="window-id"><Terminal size={13} /></span></div>
    <div className="form-body">
      <div className="form-row">
        <label><span>&gt; name</span><input name="name" placeholder="Jane Smith" maxLength={100} required /></label>
        <label><span>&gt; email</span><input name="email" type="email" placeholder="jane@example.com" maxLength={254} required /></label>
      </div>
      <label><span>&gt; message</span><textarea name="message" rows={5} placeholder="Tell me a little about what you have in mind..." maxLength={5000} required /></label>
      <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button className="button primary" disabled={busy}>{busy ? 'Transmitting…' : 'Send message'} <ArrowUpRight size={17} /></button>
      <p role="status" className="form-status">{status}</p>
    </div>
  </form>;
}

export default function Portfolio() {
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState('top');
  const clock = useManilaClock();
  const booted = useBooted();
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDark(document.documentElement.classList.contains('dark')));
    // Active section tracking (hero included, so the indicator clears at the top of the page).
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); }), { rootMargin: '-25% 0px -65% 0px' });
    ['top', ...nav.map(([, id]) => id)].forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    const root = document.documentElement;
    const move = (e: PointerEvent) => { root.style.setProperty('--mx', `${e.clientX}px`); root.style.setProperty('--my', `${e.clientY}px`); };
    // Subtle parallax on the existing decorative layers only. The grid offset wraps at its 44px cell size,
    // so it can move forever without a visible jump; the glow drifts a little and then stops.
    const parallaxOn = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;
    const onScroll = () => {
      trackScrollSpeed();
      if (!parallaxOn || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        root.style.setProperty('--py', `${-((y * 0.12) % 44)}px`);
        root.style.setProperty('--gy', `${-Math.min(y * 0.05, 120)}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('scroll', onScroll); };
  }, []);

  // Sliding active-section indicator under the nav links (positioned from the active link's box).
  useLayoutEffect(() => {
    const navEl = navRef.current, pill = pillRef.current;
    if (!navEl || !pill) return;
    const place = () => {
      const link = navEl.querySelector<HTMLElement>(`a[href="#${active}"]`);
      if (!link) { pill.style.opacity = '0'; return; }
      pill.style.opacity = '1';
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.height = `${link.offsetHeight}px`;
      pill.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(navEl);
    return () => ro.disconnect();
  }, [active]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { }
  }

  return <>
    <BootScreen />
    <div className="bg-grid" aria-hidden="true" />
    <div className="bg-glow" aria-hidden="true" />
    <div className="scanlines" aria-hidden="true" />
    <a className="skip-link" href="#main">Skip to content</a>

    <header className="header boot-fade">
      <div className="header-inner">
        <a className="brand" href="#top" aria-label="Vhon Mercado, home">
          <span className="brand-box">&lt;vm<span>/</span>&gt;</span>
          <span className="brand-name">VHON MERCADO <small>{'// PORTFOLIO'}</small></span>
        </a>
        <nav aria-label="Main navigation" ref={navRef}>
          <span className="nav-pill" ref={pillRef} aria-hidden="true" />
          {nav.map(([label, id], i) => <NavLink key={id} label={label} id={id} i={i} active={active === id} booted={booted} />)}
        </nav>
        <div className="header-actions">
          <span className="header-clock" aria-label="Local time in Manila">MNL {clock}</span>
          <button onClick={toggleTheme} className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          <a className="header-contact" href="#contact">Let’s talk <ArrowUpRight size={15} /></a>
        </div>
      </div>
    </header>

    <main id="main">
      {/* Hero entrance (after boot): badge → intro → headline word by word → role → subtitle → info card → buttons → footer row. */}
      <section id="top" className="hero wrap">
        <div className="hero-grid">
          <div className="hero-main">
            <div className="availability hero-in" style={d(0)}><span className="pulse" /> STATUS: OPEN TO INTERNSHIP OPPORTUNITIES</div>
            <p className="hero-intro hero-in" style={d(90)}><span className="prompt">&gt;</span> whoami <span className="line" /> <Scramble text="VHON ERIC MERCADO" start={booted} delay={200} /></p>
            <h1>
              <span className="word" style={d(170)}>Thoughtful</span>{' '}
              <span className="word" style={d(250)}>interfaces.</span><br />
              <em className="glitch" data-text="Useful software."><span className="word" style={d(350)}>Useful</span>{' '}<span className="word" style={d(430)}>software.</span></em>
            </h1>
            <p className="hero-role hero-in" style={d(580)}><span className="prompt">$</span> role --current: <Typewriter words={roles} /></p>
            <p className="hero-copy hero-in" style={d(660)}>Computer science student and aspiring front-end developer, combining thoughtful design with practical problem-solving.</p>
            <div className="hero-actions hero-in" style={d(820)}>
              <a className="button primary" href="#projects">View my work <ArrowDownRight size={18} /></a>
              <a className="button secondary" href="/resume.pdf" download>Download résumé <ArrowDown size={17} /></a>
            </div>
          </div>
          <aside className="sys-panel hud hero-in" style={d(740)} aria-label="Profile summary">
            <div className="window-bar"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span className="window-file">sys.profile</span><span className="window-id blink">● LIVE</span></div>
            <dl>
              {[['status', 'ONLINE'], ['user', 'vhon_eric_mercado'], ['degree', 'BS Computer Science'], ['school', 'FEU Tech, Manila'], ['coords', '14.5995°N 120.9842°E']].map(([k, v], i) =>
                <div key={k}><dt>{k}</dt><dd className={k === 'status' ? 'ok' : undefined}><Scramble text={v} start={booted} delay={850 + i * 60} /></dd></div>)}
              <div><dt>local_time</dt><dd>{clock} PHT</dd></div>
            </dl>
            <div className="sys-modules">
              {['DESIGN', 'DEVELOP', 'LEARN'].map(m => <span key={m}>{m}</span>)}
            </div>
            <div className="sys-progress">
              <div><span>degree.progress</span><span>2027</span></div>
              <div className="bar"><span /></div>
            </div>
          </aside>
        </div>
        <div className="hero-bottom hero-in" style={d(920)}>
          <div className="hero-location"><span className="pulse" /> BASED IN MANILA, PHILIPPINES</div>
          <a href="#about">SCROLL TO EXPLORE <ArrowDown size={14} /></a>
          <div className="hero-index">PORTFOLIO <span>{'//'}</span> 2026</div>
        </div>
      </section>

      <div className="ticker hero-in" style={d(1000)} aria-hidden="true">
        <div className="ticker-track">{[...stack, ...stack].map((s, i) => <span key={i}>{s}<i>✦</i></span>)}</div>
      </div>

      <section id="about" className="section wrap">
        <SectionHeading number="01" label="ABOUT_ME" title={'Curious by nature.\nDeveloper by practice.'} />
        <div className="about-layout">
          <Reveal className="about-photo" index={0}>
            <figure className="photo-frame hud">
              <div className="window-bar"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span className="window-file"><Scramble text="vhon_mercado.png" delay={250} /></span><span className="window-id blink">● REC</span></div>
              <div className="photo-stage">
                <Image src="/profile.png" alt="Portrait of Vhon Eric Mercado" fill sizes="(max-width: 600px) 80vw, 320px" className="photo-img" priority={false} />
                <span className="visual-scan" aria-hidden="true" />
                <span className="photo-corner tl" aria-hidden="true">ID.0x01</span>
                <span className="photo-corner tr" aria-hidden="true">[ VERIFIED ]</span>
              </div>
              <figcaption><span>VHON_E_MERCADO</span><span>CS // SWE</span></figcaption>
            </figure>
          </Reveal>
          <div className="about-grid">
            <Reveal index={1}>
              <div className="about-lead">
                <p>I’m Vhon, a computer science student with a growing interest in building software that feels intuitive and works well.</p>
                <p>From shaping user flows in Figma to testing a deployed thesis system with real users, I enjoy the details that make an experience clearer and more reliable.</p>
                <a className="text-link" href="#contact">More about working together <ArrowUpRight size={17} /></a>
              </div>
            </Reveal>
            <Reveal className="skills-panel hud" index={2}>
              <div className="panel-head"><span><Scramble text="THE_TOOLKIT.json" delay={300} /></span><span>✳</span></div>
              <h3>Skills & tools<span>_</span></h3>
              <div className="skill-group"><span>DEVELOPMENT</span><div className="chips">{['Java', 'Python', 'JavaScript', 'C++', 'Kotlin', 'PHP', 'HTML', 'CSS', 'React'].map(s => <span key={s}>{s}</span>)}</div></div>
              <div className="skill-group"><span>TOOLS & PLATFORMS</span><div className="chips">{['Git', 'GitHub', 'VS Code', 'Figma', 'Firebase', 'Supabase', 'Render', 'Apify', 'SAP S/4HANA'].map(s => <span key={s}>{s}</span>)}</div></div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="projects" className="section projects-section">
        <div className="wrap">
          <SectionHeading number="02" label="SELECTED_WORK" title="A few things I’ve built." description="A closer look at the problems, tools, and contributions behind my academic projects." />
          <div className="projects-grid">{projects.map((project, i) => <Reveal key={project.name} index={i * 2}><ProjectCard project={project} /></Reveal>)}</div>
          <p className="project-note"><span>&gt;</span> SELECT A PROJECT TO EXPLORE THE WORK BEHIND EACH IDEA<span className="caret" /></p>
        </div>
      </section>

      <section id="experience" className="section wrap">
        <SectionHeading number="03" label="THE_JOURNEY" title="Learning, in progress." description="The foundations behind the work." />
        <Reveal className="edu-block">
          <div className="journey-title" data-ri="0"><span>01 / EDUCATION</span><ArrowDownRight size={18} /></div>
          <div className="timeline">
            <div className="timeline-item current" data-ri="1"><span>2023 — PRESENT</span><h3>BS Computer Science</h3><p>Software Engineering specialization<br />FEU Institute of Technology, Manila</p><small>Expected graduation: October 2027</small></div>
            <div className="timeline-item" data-ri="2"><span>2021 — 2023</span><h3>Senior High School</h3><p>STI College Sta. Cruz</p></div>
          </div>
        </Reveal>
        <Reveal className="cert-block"><CertCarousel items={certificates} /></Reveal>
      </section>

      <section id="contact" className="contact-section">
        <div className="wrap">
          <SectionHeading number="04" label="GET_IN_TOUCH" title={'Let’s make something\nmeaningful.'} description="Have an opportunity or a project in mind? I’d be glad to hear from you." />
          <div className="contact-grid">
            <Reveal index={0}>
              <div className="contact-copy">
                <span className="small-label"><Scramble text="SAY HELLO" delay={300} /></span>
                <a className="email-link" href="mailto:bonvhoneric@gmail.com">bonvhoneric@gmail.com <ArrowUpRight size={20} /></a>
                <p>Or find me here</p>
                <div className="socials">
                  <a href="https://www.linkedin.com/in/vhon-eric-mercado-a4001b38b" target="_blank" rel="noreferrer"><Link size={16} /> LinkedIn <ArrowUpRight size={14} /></a>
                  <span><Link size={16} /> GitHub · coming soon</span>
                </div>
                <div className="contact-note"><Check size={15} /> Open to software and front-end development internships</div>
              </div>
            </Reveal>
            <Reveal index={1}><ContactForm /></Reveal>
          </div>
        </div>
      </section>
    </main>

    <footer className="footer">
      <div className="wrap footer-inner">
        <a href="#top" className="footer-brand">&lt;vm<span>/</span>&gt;</a>
        <p>© {new Date().getFullYear()} Vhon Eric Mercado <span>{'//'}</span> Designed with intention.</p>
        <a href="#top">BACK TO TOP ↑</a>
      </div>
    </footer>
  </>;
}
