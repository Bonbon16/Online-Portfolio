'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import Image from 'next/image';
import { animate, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, Maximize2, X } from 'lucide-react';
import type { Certificate } from '@/data/certificates';

const pad = (n: number) => String(n).padStart(2, '0');
/** The list is rendered three times; the middle copy is "home" and the outer copies are buffers for looping. */
const COPIES = 3;

function CertImage({ src, alt, sizes, className = 'cert-img' }: { src: string; alt: string; sizes: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="cert-fallback"><FileText size={24} /><span>PREVIEW UNAVAILABLE</span></span>;
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} draggable={false} onError={() => setFailed(true)} />;
}

export default function CertCarousel({ items }: { items: Certificate[] }) {
  const n = items.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeRef = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollAnim = useRef<{ stop: () => void } | null>(null);
  const scrollTarget = useRef<number | null>(null);
  const reduce = useReducedMotion();

  /** Distance between two neighbouring cards (sub-pixel exact, so eased scrolling lands on snap points), and one copy's width. */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return null;
    const cards = track.children as HTMLCollectionOf<HTMLElement>;
    const step = cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    return { track, step, setWidth: step * n };
  }, [n]);

  /** If the view has drifted into a buffer copy, jump (invisibly) to the same card in the middle copy. */
  const recenter = useCallback(() => {
    const m = measure();
    if (!m || m.step <= 0) return;
    const { track, step, setWidth } = m;
    let x = track.scrollLeft;
    if (x < setWidth - step / 2) x += setWidth;
    else if (x >= 2 * setWidth - step / 2) x -= setWidth;
    else return;
    track.scrollLeft = x;
  }, [measure]);

  // Start on the middle copy and keep alignment when card widths change (resize / breakpoints).
  useEffect(() => {
    const m = measure();
    if (!m) return;
    m.track.scrollLeft = m.setWidth;
    const ro = new ResizeObserver(() => {
      const r = measure();
      if (r) r.track.scrollLeft = (n + activeRef.current) * r.step;
    });
    ro.observe(m.track);
    return () => { ro.disconnect(); clearTimeout(settleTimer.current); };
  }, [measure, n]);

  function onScroll() {
    const m = measure();
    if (!m || m.step <= 0) return;
    const index = ((Math.round(m.track.scrollLeft / m.step) % n) + n) % n;
    if (index !== activeRef.current) { activeRef.current = index; setActive(index); }
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (drag.current.down) return;
      m.track.classList.remove('is-dragging');
      recenter();
    }, 140);
  }

  /**
   * Arrow navigation with our own easing (the browser's built-in smooth scroll can't be eased).
   * Rapid clicks chain onto the pending target; if that target would leave the middle copy, both the current
   * position and the target jump by one copy width first (identical content, so the jump is invisible).
   */
  function go(dir: 1 | -1) {
    const m = measure();
    if (!m) return;
    const { track, step, setWidth } = m;
    if (reduce) { recenter(); track.scrollBy({ left: dir * step }); return; }
    scrollAnim.current?.stop();
    let from = track.scrollLeft;
    let to = (scrollTarget.current ?? Math.round(from / step) * step) + dir * step;
    if (to > 2 * setWidth - step / 2) { from -= setWidth; to -= setWidth; }
    else if (to < setWidth - step / 2) { from += setWidth; to += setWidth; }
    track.scrollLeft = from;
    scrollTarget.current = to;
    track.classList.add('is-animating');
    scrollAnim.current = animate(from, to, {
      duration: 0.55, ease: [0.22, 1, 0.36, 1],
      onUpdate: v => { track.scrollLeft = v; },
      onComplete: () => { scrollAnim.current = null; scrollTarget.current = null; track.classList.remove('is-animating'); },
    });
  }

  /** Lightbox close with a short exit animation (instant for reduced motion). */
  function requestClose() {
    if (open === null || closing) return;
    if (reduce) { setOpen(null); return; }
    setClosing(true);
    closeTimer.current = setTimeout(() => { setClosing(false); setOpen(null); }, 220);
  }
  useEffect(() => () => { clearTimeout(closeTimer.current); scrollAnim.current?.stop(); }, []);

  // Mouse drag (touch and pens already scroll natively).
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !trackRef.current) return;
    drag.current = { down: true, startX: e.clientX, startScroll: trackRef.current.scrollLeft, moved: false };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const track = trackRef.current;
    if (!d.down || !track) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 5) { d.moved = true; track.classList.add('is-dragging'); }
    if (d.moved) track.scrollLeft = d.startScroll - dx;
  }
  function endDrag() {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const m = measure();
    if (!m || !d.moved) return;
    m.track.scrollTo({ left: Math.round(m.track.scrollLeft / m.step) * m.step, behavior: 'smooth' });
  }

  function onCardClick(i: number) {
    if (drag.current.moved) { drag.current.moved = false; return; }
    setOpen(i);
  }

  function onTrackKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  }

  // Lightbox: native <dialog> gives us focus trapping, Esc to close and focus restore.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) { dialog.showModal(); document.documentElement.classList.add('modal-open'); }
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  function onDialogKey(e: KeyboardEvent) {
    if (open === null) return;
    if (e.key === 'ArrowRight') setOpen((open + 1) % n);
    if (e.key === 'ArrowLeft') setOpen((open - 1 + n) % n);
  }

  const current = open !== null ? items[open] : null;

  return <div className="cert-carousel">
    <div className="journey-title cert-head" data-ri="0">
      <span>02 / CERTIFICATIONS</span>
      <div className="cert-controls">
        <span className="cert-counter" aria-live="polite">{pad(active + 1)} / {pad(n)}</span>
        <button type="button" className="cert-arrow" onClick={() => go(-1)} aria-label="Previous certificate"><ArrowLeft size={16} /></button>
        <button type="button" className="cert-arrow" onClick={() => go(1)} aria-label="Next certificate"><ArrowRight size={16} /></button>
      </div>
    </div>

    <div
      ref={trackRef}
      className="cert-track"
      role="region"
      aria-roledescription="carousel"
      aria-label="Certificates. Use left and right arrow keys to browse."
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onKeyDown={onTrackKey}
      onDragStart={e => e.preventDefault()}
    >
      {Array.from({ length: COPIES }, (_, copy) => items.map((cert, i) => {
        const clone = copy !== 1;
        return <button
          type="button"
          key={`${copy}-${cert.file}`}
          className="cert-card hud"
          onClick={() => onCardClick(i)}
          aria-hidden={clone || undefined}
          tabIndex={clone ? -1 : 0}
          data-ri={clone ? undefined : i + 1 /* staggered entrance for the real (non-clone) cards */}
          aria-label={clone ? undefined : `View ${cert.title} certificate, ${cert.issuer}, ${cert.date}`}
        >
          <span className="cert-stage">
            <CertImage src={cert.preview} alt="" sizes="(max-width: 600px) 85vw, (max-width: 900px) 45vw, 380px" />
            <span className="cert-zoom" aria-hidden="true"><Maximize2 size={13} /> VIEW</span>
          </span>
          <span className="cert-body">
            <span className="cert-row"><span className="cert-num">0x{pad(i + 1)}</span><span>{cert.date}</span></span>
            <strong>{cert.title}</strong>
            <small>{cert.issuer}</small>
            {cert.credentialId && <code className="cert-id">ID: {cert.credentialId}</code>}
          </span>
        </button>;
      }))}
    </div>
    <p className="cert-hint" aria-hidden="true" data-ri={n + 1}><span>&lt;</span> DRAG OR SWIPE TO BROWSE · CLICK TO ENLARGE <span>&gt;</span></p>

    <dialog
      ref={dialogRef}
      className={`lightbox-dialog${closing ? ' is-closing' : ''}`}
      aria-label={current ? `${current.title} certificate` : 'Certificate'}
      onCancel={e => { e.preventDefault(); requestClose(); }}
      onClose={() => { setOpen(null); document.documentElement.classList.remove('modal-open'); }}
      onClick={e => { if (e.target === e.currentTarget) requestClose(); }}
      onKeyDown={onDialogKey}
    >
      {current && open !== null && <div className="lightbox hud">
        <div className="window-bar">
          <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="window-file">{current.file.split('/').pop()}</span>
          <span className="lightbox-count">{pad(open + 1)} / {pad(n)}</span>
          <button type="button" className="lightbox-close" onClick={requestClose} aria-label="Close certificate preview" autoFocus><X size={16} /></button>
        </div>
        <div className="lightbox-stage">
          <CertImage key={current.full} src={current.full} alt={`${current.title} certificate issued by ${current.issuer}`} sizes="(max-width: 1100px) 95vw, 1100px" className="lightbox-img" />
          <button type="button" className="lightbox-nav prev" onClick={() => setOpen((open - 1 + n) % n)} aria-label="Previous certificate"><ArrowLeft size={18} /></button>
          <button type="button" className="lightbox-nav next" onClick={() => setOpen((open + 1) % n)} aria-label="Next certificate"><ArrowRight size={18} /></button>
        </div>
        <div className="lightbox-meta">
          <div>
            <strong>{current.title}</strong>
            <small>{current.issuer} · {current.date}</small>
            {current.credentialId && <code className="cert-id full">ID: {current.credentialId}</code>}
          </div>
          <a className="button secondary" href={current.file} target="_blank" rel="noreferrer">Open original PDF <ArrowUpRight size={15} /></a>
        </div>
      </div>}
    </dialog>
  </div>;
}
