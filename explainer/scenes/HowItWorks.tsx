import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AnimatedSceneProps } from '@explainer/src/kit/types';
import { easeOut, fadeIn, lerp, pop } from '@explainer/src/kit/anim';
import { useTheme } from '@explainer/src/kit/theme';
import { spansFor } from '@explainer/src/timeline';
import { Pieces } from './Pieces';

/**
 * The forecast, one stage per sentence:
 *   s0 "PAWN is one HTML file."                                              → the product card
 *   s1 "Set your traffic, split it into routing tiers, and give each tier a model."
 *                                                                            → TRAFFIC (requests count up), then TIERS (shares fill)
 *   s2 "Every tier is priced under that model's own cache and batch rules, from a live catalog of every priced model on OpenRouter."
 *                                                                            → PRICING (the rules tick), then CATALOG (newest rows)
 *   s3 "Nothing leaves your browser."                                        → footer
 * Figures are the app's bundled starting scenario and the catalog snapshot the demo page serves.
 */
const NODE_W = 370;
const NODE_H = 340;
const NODE_Y = 386;
const GAP = 66;
const X0 = (1920 - (4 * NODE_W + 3 * GAP)) / 2;
const nodeX = (i: number) => X0 + i * (NODE_W + GAP);

const TIERS = [
  { piece: '♟', name: 'Pawns', share: 65 },
  { piece: '♞', name: 'Knights', share: 25 },
  { piece: '♜', name: 'Rooks', share: 8 },
  { piece: '♛', name: 'Queen', share: 2 },
];
const RULES = ['cache hits 70%', 'batch share 30%', 'reasoning × on output', 'escalation 10% → T2'];
const CATALOG = [
  { name: 'Claude Haiku 5.5', price: '0.10 / 0.50' },
  { name: 'GPT-6.1 Sol', price: '2.00 / 10.00' },
  { name: 'Gemini 4 Argon', price: '2.00 / 10.00' },
];

const Pill: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span style={{ fontSize: 16, fontWeight: 700, color, background: `${color}22`, border: `1px solid ${color}66`, borderRadius: 999, padding: '4px 12px', whiteSpace: 'nowrap' }}>{text}</span>
);

export const HowItWorks: React.FC<AnimatedSceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spans = spansFor(scene, fps);
  const s0 = spans[0];
  const s1 = spans[1] ?? s0;
  const s2 = spans[2] ?? s1;
  const s3 = spans[3] ?? s2;
  const dur = (s: { start: number; end: number }) => s.end - s.start;

  const starts = [s1.start, s1.start + Math.round(dur(s1) * 0.45), s2.start, s2.start + Math.round(dur(s2) * 0.5)];
  const p = starts.map((t) => pop(frame, fps, t, { damping: 15 }));
  const pTop = pop(frame, fps, s0.start, { damping: 16 });

  const NODES = [
    { label: 'TRAFFIC', title: 'Set your volume', color: theme.blue },
    { label: 'TIERS', title: 'Split by difficulty', color: theme.accent },
    { label: 'PRICING', title: "Each model's own rules", color: theme.warm },
    { label: 'CATALOG', title: 'Live, from OpenRouter', color: theme.red },
  ];

  const count = Math.round(630000 * easeOut((frame - starts[0] - 6) / Math.max(10, dur(s1) * 0.35)));
  const tFoot = s3.start + 2;

  return (
    <AbsoluteFill>
      {/* Product card */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 112, display: 'flex', justifyContent: 'center', opacity: Math.min(1, pTop * 1.5), transform: `translateY(${lerp(-30, 0, pTop)}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '20px 32px', borderRadius: 18, background: theme.panel, border: `1px solid ${theme.line}`, boxShadow: '0 24px 60px rgba(0,0,0,.4)' }}>
          <Pieces size={44} color={theme.accent} glow={`${theme.accent}66`} />
          <div>
            <div style={{ fontFamily: theme.display, fontSize: 44, fontWeight: 700, color: theme.ink, letterSpacing: -0.5, lineHeight: 1 }}>PAWN</div>
            <div style={{ fontSize: 17, color: theme.muted, marginTop: 4 }}>LLM Cost Forecaster</div>
          </div>
          <div style={{ width: 1, height: 54, background: theme.line, margin: '0 4px' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            {['one HTML file', 'no server', 'no API key'].map((t, i) => (
              <span key={t} style={{ opacity: fadeIn(frame, s0.start + 10 + i * 5, 8) }}>
                <Pill text={t} color={theme.blue} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Connectors with travelling dots */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2].map((i) => {
          const x1 = nodeX(i) + NODE_W + 8;
          const x2 = nodeX(i + 1) - 8;
          const y = NODE_Y + NODE_H / 2;
          const on = p[i + 1];
          const t0 = starts[i + 1];
          return (
            <g key={i} opacity={Math.min(1, on * 1.4)}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke={theme.line} strokeWidth={3} strokeDasharray="5 7" />
              <path d={`M ${x2 - 12} ${y - 8} L ${x2} ${y} L ${x2 - 12} ${y + 8}`} stroke={theme.muted} strokeWidth={3} fill="none" strokeLinecap="round" />
              {frame >= t0 &&
                [0, 1, 2].map((k) => {
                  const u = ((frame - t0) / 26 + k / 3) % 1;
                  return <circle key={k} cx={lerp(x1, x2 - 14, u)} cy={y} r={5} fill={NODES[i + 1].color} opacity={0.3 + 0.7 * Math.sin(u * Math.PI)} />;
                })}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {NODES.map((n, i) => {
        const pi = p[i];
        return (
          <div
            key={n.label}
            style={{
              position: 'absolute',
              left: nodeX(i),
              top: NODE_Y,
              width: NODE_W,
              height: NODE_H,
              borderRadius: 20,
              background: theme.panel,
              border: `1px solid ${theme.line}`,
              borderTop: `4px solid ${n.color}`,
              boxShadow: '0 26px 60px rgba(0,0,0,.4)',
              padding: '20px 22px',
              opacity: Math.min(1, pi * 1.5),
              transform: `translateY(${lerp(36, 0, pi)}px) scale(${lerp(0.92, 1, pi)})`,
            }}
          >
            <div style={{ fontFamily: theme.mono, fontSize: 15, letterSpacing: 3, color: n.color, fontWeight: 700 }}>{n.label}</div>
            <div style={{ fontFamily: theme.display, fontSize: 26, fontWeight: 700, color: theme.ink, marginTop: 6, letterSpacing: -0.3 }}>{n.title}</div>
            <div style={{ marginTop: 18 }}>
              {i === 0 && (
                <>
                  {[
                    ['2,500', 'active users'],
                    ['12', 'requests / user / day'],
                    ['21', 'working days'],
                  ].map(([v, l], k) => {
                    const pk = pop(frame, fps, starts[0] + 4 + k * 6, { damping: 14, stiffness: 160 });
                    return (
                      <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0', borderBottom: `1px solid ${theme.line}`, opacity: Math.min(1, pk * 1.5), transform: `translateX(${lerp(-24, 0, pk)}px)` }}>
                        <span style={{ fontFamily: theme.mono, fontSize: 24, fontWeight: 700, color: theme.ink, width: 86 }}>{v}</span>
                        <span style={{ fontSize: 16, color: theme.muted }}>{l}</span>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 16, fontSize: 15, color: theme.muted }}>requests / month</div>
                  <div style={{ fontFamily: theme.mono, fontSize: 36, fontWeight: 700, color: n.color, letterSpacing: -1 }}>{Math.max(0, count).toLocaleString('en-US')}</div>
                </>
              )}
              {i === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TIERS.map((t, k) => {
                    const pk = pop(frame, fps, starts[1] + 4 + k * 6, { damping: 14, stiffness: 160 });
                    const fill = easeOut((frame - starts[1] - 8 - k * 6) / 16);
                    return (
                      <div key={t.name} style={{ opacity: Math.min(1, pk * 1.5), transform: `translateX(${lerp(-24, 0, pk)}px)` }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 18, color: theme.ink }}>
                          <span style={{ fontSize: 22, color: theme.accent }}>{t.piece}</span>
                          <span style={{ fontWeight: 700 }}>{t.name}</span>
                          <span style={{ marginLeft: 'auto', fontFamily: theme.mono, color: theme.muted }}>{t.share}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: theme.panel2, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(2, t.share) * fill}%`, background: k % 2 ? theme.warm : theme.accent, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 14, color: theme.muted, marginTop: 4, opacity: fadeIn(frame, starts[1] + 30, 10) }}>T1 → T4 is the escalation path</div>
                </div>
              )}
              {i === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ fontSize: 16, color: theme.ink, fontWeight: 700, padding: '6px 10px', borderRadius: 8, background: theme.panel2, border: `1px solid ${theme.line}` }}>
                    ♟ Pawns · Claude Haiku 4.5
                  </div>
                  {RULES.map((rule, k) => {
                    const pk = pop(frame, fps, starts[2] + 6 + k * 6, { damping: 14, stiffness: 160 });
                    return (
                      <div key={rule} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, color: theme.ink, opacity: Math.min(1, pk * 1.5), transform: `translateX(${lerp(-20, 0, pk)}px)` }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: n.color, color: '#04212e', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800 }}>✓</span>
                        {rule}
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8, opacity: fadeIn(frame, starts[2] + 34, 10) }}>
                    <span style={{ fontFamily: theme.mono, fontSize: 30, fontWeight: 700, color: n.color }}>$962</span>
                    <span style={{ fontSize: 15, color: theme.muted }}>/ mo for this tier</span>
                  </div>
                </div>
              )}
              {i === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: theme.mono, fontSize: 36, fontWeight: 700, color: n.color, letterSpacing: -1 }}>379</span>
                    <span style={{ fontSize: 16, color: theme.muted }}>priced text models</span>
                  </div>
                  {CATALOG.map((m, k) => {
                    const pk = pop(frame, fps, starts[3] + 6 + k * 7, { damping: 14, stiffness: 160 });
                    return (
                      <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: `1px solid ${theme.line}`, fontSize: 16, color: theme.ink, opacity: Math.min(1, pk * 1.5), transform: `translateX(${lerp(24, 0, pk)}px)` }}>
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: theme.mono, fontSize: 14, color: theme.muted, whiteSpace: 'nowrap' }}>{m.price}</span>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 14, color: theme.muted, marginTop: 2, opacity: fadeIn(frame, starts[3] + 30, 10) }}>newest first · refreshed hourly · no key</div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ position: 'absolute', left: nodeX(0), width: 4 * NODE_W + 3 * GAP, top: NODE_Y + NODE_H + 48, textAlign: 'center', fontFamily: theme.mono, fontSize: 18, color: theme.muted, opacity: fadeIn(frame, tFoot, 12) }}>
        one HTML file · no server · no account · scenario and rates stay in your browser
      </div>
    </AbsoluteFill>
  );
};
