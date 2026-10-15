import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AnimatedSceneProps } from '@explainer/src/kit/types';
import { easeOut, fadeIn, lerp, pop } from '@explainer/src/kit/anim';
import { useTheme } from '@explainer/src/kit/theme';
import { spansFor } from '@explainer/src/timeline';

/**
 * Cold open on a pricing sheet that is already out of date, one beat per sentence:
 *   s0 "Every LLM bill starts as a guess."                        → the sheet pops in; its total tumbles through digits
 *   s1 "Prices change, new models land every month, and the spreadsheet you priced in June is already stale."
 *                                                                 → prices flip (old struck through), one row drops out of the
 *                                                                   catalog, new models pile up beside the sheet, a STALE stamp lands
 *   s2 "You need a forecast that keeps up."                       → headline
 * The rows are the app's bundled starting tiers; the new models are from the catalog snapshot the demo page serves.
 */
const SHEET = { x: 170, y: 140, w: 960, h: 590 };
const ROWS = [
  { model: 'Claude Haiku 4.5', prov: 'Anthropic', inP: '1.00', outP: '5.00', monthly: '$962', newIn: '0.80' },
  { model: 'Claude Sonnet 4.6', prov: 'Anthropic', inP: '3.00', outP: '15.00', monthly: '$3,582', newOut: '10.00' },
  { model: 'GPT-5.5', prov: 'OpenAI', inP: '5.00', outP: '30.00', monthly: '$4,422' },
  { model: 'Mistral Large 3', prov: 'Mistral', inP: '0.50', outP: '1.50', monthly: '—', gone: true },
  { model: 'Claude Fable 5', prov: 'Anthropic', inP: '10.00', outP: '50.00', monthly: '$5,168' },
];
const NEW = [
  { name: 'Claude Haiku 5.5', prov: 'Anthropic', price: '$0.10 / $0.50' },
  { name: 'GPT-6.1 Sol', prov: 'OpenAI', price: '$2.00 / $10.00' },
  { name: 'Gemini 4 Argon', prov: 'Google', price: '$2.00 / $10.00' },
];
const TOTAL = '$14,134';

const Words: React.FC<{ text: string; start: number; per: number; size: number; colors: string[]; font: string }> = ({ text, start, per, size, colors, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={{ fontFamily: font, fontSize: size, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
      {text.split(' ').map((w, i) => {
        const p = pop(frame, fps, start + i * per, { damping: 13, stiffness: 160 });
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', color: colors[i] ?? colors[0], opacity: Math.min(1, p * 1.6), transform: `translateY(${lerp(34, 0, p)}px) scale(${lerp(0.9, 1, p)})` }}>
            {w}
          </span>
        );
      })}
    </span>
  );
};

/** A price cell that, from `at`, strikes the old figure and pops the new one in magenta. */
const Price: React.FC<{ old: string; next?: string; at: number; ink: string; muted: string; red: string; mono: string }> = ({ old, next, at, ink, muted, red, mono }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!next) return <span style={{ fontFamily: mono, color: ink }}>{old}</span>;
  const p = pop(frame, fps, at, { damping: 12, stiffness: 180 });
  return (
    <span style={{ fontFamily: mono, whiteSpace: 'nowrap' }}>
      <span style={{ color: p > 0.05 ? muted : ink, textDecoration: p > 0.05 ? 'line-through' : 'none', opacity: p > 0.05 ? 0.7 : 1 }}>{old}</span>
      <span style={{ display: 'inline-block', marginLeft: 12, color: red, fontWeight: 700, opacity: Math.min(1, p * 1.6), transform: `translateY(${lerp(-12, 0, p)}px) scale(${lerp(0.8, 1, p)})` }}>{next}</span>
    </span>
  );
};

export const ColdOpen: React.FC<AnimatedSceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spans = spansFor(scene, fps);
  const s0 = spans[0];
  const s1 = spans[1] ?? s0;
  const s2 = spans[2] ?? s1;
  const d1 = s1.end - s1.start;

  const pSheet = pop(frame, fps, s0.start + 3, { damping: 15 });
  const settled = frame >= s0.end - 6;
  const tumble = TOTAL.replace(/\d/g, (d, i) => (settled ? d : String((frame * 7 + i * 13) % 10)));

  const tFlip = s1.start + Math.round(d1 * 0.06);
  const tGone = s1.start + Math.round(d1 * 0.22);
  const tNew = s1.start + Math.round(d1 * 0.36);
  const tStale = s1.start + Math.round(d1 * 0.74);
  const gone = easeOut((frame - tGone) / 12);
  const pStamp = pop(frame, fps, tStale, { damping: 9, stiffness: 220 });
  const headStart = s2.start + Math.round((s2.end - s2.start) * 0.12);

  const cell = (w: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ width: w, padding: '0 14px', ...extra });

  return (
    <AbsoluteFill>
      {/* The sheet */}
      <div
        style={{
          position: 'absolute',
          left: SHEET.x,
          top: SHEET.y,
          width: SHEET.w,
          height: SHEET.h,
          borderRadius: 20,
          background: '#ffffff',
          color: '#3a3d3f',
          boxShadow: '0 30px 70px rgba(0,0,0,.5)',
          overflow: 'hidden',
          fontFamily: theme.font,
          opacity: Math.min(1, pSheet * 1.5),
          transform: `translateY(${lerp(40, 0, pSheet)}px) scale(${lerp(0.95, 1, pSheet)})`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 26px', background: '#003043', color: '#fff' }}>
          <span style={{ fontFamily: theme.mono, fontSize: 15, letterSpacing: 3, color: '#66c3e6' }}>LLM-COSTS-Q3.XLSX</span>
          <span style={{ marginLeft: 'auto', fontSize: 17, padding: '5px 14px', borderRadius: 999, background: pStamp > 0.1 ? theme.red : 'rgba(255,255,255,.12)', color: '#fff', fontWeight: 700, transition: 'none' }}>
            priced June 11
          </span>
        </div>
        <div style={{ display: 'flex', padding: '14px 12px 8px', fontSize: 14, letterSpacing: 1.2, textTransform: 'uppercase', color: '#6e7679', fontWeight: 700, borderBottom: '2px solid #003043', margin: '0 14px' }}>
          <span style={cell(330)}>Model</span>
          <span style={cell(190)}>In $/1M</span>
          <span style={cell(220)}>Out $/1M</span>
          <span style={cell(180, { textAlign: 'right' })}>Monthly</span>
        </div>
        {ROWS.map((row, i) => {
          const isGone = row.gone ? gone : 0;
          return (
            <div key={row.model} style={{ display: 'flex', alignItems: 'center', margin: '0 14px', padding: '13px 12px', fontSize: 24, borderBottom: '1px solid #d9dee1', background: i % 2 ? '#f8fafb' : '#fff', opacity: 1 - 0.55 * isGone }}>
              <span style={cell(330)}>
                <span style={{ fontWeight: 700, color: '#003043', textDecoration: isGone > 0.5 ? 'line-through' : 'none' }}>{row.model}</span>
                <span style={{ display: 'block', fontSize: 14, color: '#6e7679' }}>{row.prov}</span>
              </span>
              <span style={cell(190)}>
                <Price old={row.inP} next={row.newIn} at={tFlip} ink="#3a3d3f" muted="#9aa3a7" red={theme.red} mono={theme.mono} />
              </span>
              <span style={cell(220)}>
                <Price old={row.outP} next={row.newOut} at={tFlip + 6} ink="#3a3d3f" muted="#9aa3a7" red={theme.red} mono={theme.mono} />
              </span>
              <span style={cell(180, { textAlign: 'right', fontFamily: theme.mono, fontWeight: 700, color: '#003043', position: 'relative' })}>
                {row.monthly}
                {row.gone && (
                  <span style={{ position: 'absolute', right: 14, top: -14, fontSize: 12, fontWeight: 700, letterSpacing: 1, color: theme.red, border: `1px dashed ${theme.red}`, borderRadius: 999, padding: '2px 8px', background: '#fff', opacity: isGone }}>
                    NOT IN CATALOG
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'baseline', margin: '0 14px', padding: '16px 12px 0' }}>
          <span style={{ fontSize: 18, letterSpacing: 1.2, textTransform: 'uppercase', color: '#6e7679', fontWeight: 700 }}>Monthly total</span>
          <span style={{ marginLeft: 'auto', fontFamily: theme.mono, fontSize: 44, fontWeight: 700, color: settled ? '#003043' : theme.red, letterSpacing: -1 }}>{tumble}</span>
          <span style={{ marginLeft: 10, fontSize: 20, color: '#6e7679' }}>/ mo</span>
        </div>

        {/* STALE stamp */}
        <div
          style={{
            position: 'absolute',
            right: 60,
            bottom: 90,
            padding: '10px 30px',
            border: `6px solid ${theme.red}`,
            borderRadius: 14,
            color: theme.red,
            fontFamily: theme.display,
            fontSize: 74,
            fontWeight: 800,
            letterSpacing: 6,
            opacity: Math.min(1, pStamp * 1.5) * 0.92,
            transform: `rotate(-14deg) scale(${lerp(2.2, 1, pStamp)})`,
            mixBlendMode: 'multiply',
          }}
        >
          STALE
        </div>
      </div>

      {/* New arrivals beside the sheet */}
      <div style={{ position: 'absolute', left: SHEET.x + SHEET.w + 50, top: SHEET.y + 30, width: 520 }}>
        <div style={{ fontFamily: theme.mono, fontSize: 16, letterSpacing: 3, color: theme.muted, opacity: fadeIn(frame, tNew, 8) }}>ADDED TO OPENROUTER SINCE</div>
        {NEW.map((m, i) => {
          const p = pop(frame, fps, tNew + 6 + i * 9, { damping: 13, stiffness: 150 });
          return (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, padding: '18px 22px', borderRadius: 16, background: theme.panel, border: `1px solid ${theme.line}`, boxShadow: '0 20px 50px rgba(0,0,0,.4)', opacity: Math.min(1, p * 1.5), transform: `translateX(${lerp(60, 0, p)}px)` }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: '#04212e', background: theme.warm, borderRadius: 999, padding: '4px 10px' }}>NEW</span>
              <span>
                <span style={{ display: 'block', fontSize: 26, fontWeight: 700, color: theme.ink, fontFamily: theme.display }}>{m.name}</span>
                <span style={{ fontSize: 16, color: theme.muted }}>{m.prov}</span>
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: theme.mono, fontSize: 20, color: theme.blue, whiteSpace: 'nowrap' }}>{m.price}</span>
            </div>
          );
        })}
      </div>

      {/* Headline */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center' }}>
        <Words text="A forecast that keeps up." start={headStart} per={6} size={96} colors={[theme.ink, theme.ink, theme.ink, theme.warm, theme.warm]} font={theme.display} />
      </div>
    </AbsoluteFill>
  );
};
