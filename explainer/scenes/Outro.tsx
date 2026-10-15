import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AnimatedSceneProps } from '@explainer/src/kit/types';
import { easeOut, fadeIn, lerp, pop } from '@explainer/src/kit/anim';
import { useTheme } from '@explainer/src/kit/theme';
import { spansFor } from '@explainer/src/timeline';
import { Pieces } from './Pieces';

/**
 * Three promise cards, then the lockup:
 *   s0 "One HTML file."                                                        → card 1
 *   s1 "No server, no account, no API key."                                   → card 2
 *   s2 "Your scenarios stay in your browser, and the rate card stays current." → card 3
 *   s3 "PAWN: the LLM Cost Forecaster."                                        → pieces, name, tagline
 * The app has no public repository yet, so there is no URL card; `spec.repoUrl` is shown only when set.
 */
export const Outro: React.FC<AnimatedSceneProps> = ({ scene, spec }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spans = spansFor(scene, fps);
  const s0 = spans[0];
  const s1 = spans[1] ?? s0;
  const s2 = spans[2] ?? s1;
  const s3 = spans[3] ?? s2;
  const pMark = pop(frame, fps, s3.start, { damping: 15, stiffness: 100 });

  const CARDS = [
    { glyph: '⌂', color: theme.blue, title: 'One HTML file', body: 'Open index.html. No install, no build step, no runtime dependencies.', at: s0.start + 2 },
    { glyph: '◌', color: theme.accent, title: 'No server, no key', body: 'Only public model metadata is downloaded. Your scenario never leaves the page.', at: s1.start + 2 },
    { glyph: '🔒', color: theme.warm, title: 'Stays in your browser', body: 'Scenario, pins and overrides come back on reload. Save JSON for a backup.', at: s2.start + 2 },
  ];

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 170, right: 170, top: 110, display: 'flex', gap: 30 }}>
        {CARDS.map((c) => {
          const p = pop(frame, fps, c.at, { damping: 16 });
          return (
            <div key={c.title} style={{ flex: 1, padding: '26px 30px 30px', borderRadius: 20, background: theme.panel, border: `1px solid ${theme.line}`, borderTop: `5px solid ${c.color}`, boxShadow: '0 26px 60px rgba(0,0,0,.4)', opacity: Math.min(1, p * 1.5), transform: `translateY(${lerp(36, 0, p)}px)` }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: c.color, color: '#04212e', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 700 }}>{c.glyph}</div>
              <div style={{ fontFamily: theme.display, fontSize: 34, fontWeight: 700, color: theme.ink, marginTop: 20, letterSpacing: -0.5, lineHeight: 1.1 }}>{c.title}</div>
              <div style={{ fontSize: 21, color: theme.muted, marginTop: 12, lineHeight: 1.42 }}>{c.body}</div>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: Math.min(1, pMark * 1.5), transform: `translateY(${lerp(30, 0, pMark)}px)` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 34 }}>
          <Pieces size={92} color={theme.accent} glow={`${theme.accent}77`} />
          <div style={{ fontFamily: theme.display, fontSize: 124, fontWeight: 700, letterSpacing: 2, color: theme.ink, lineHeight: 1 }}>PAWN</div>
        </div>
        <div style={{ margin: '18px auto 0', display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[theme.accent, theme.warm, theme.red].map((c, i) => (
            <div key={c} style={{ height: 5, width: lerp(0, 90, easeOut((frame - s3.start - 8 - i * 4) / 18)), borderRadius: 3, background: c }} />
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 32, color: theme.ink, fontWeight: 600, opacity: fadeIn(frame, s3.start + 10, 12) }}>The LLM Cost Forecaster</div>
        <div style={{ marginTop: 10, fontFamily: theme.mono, fontSize: 19, color: theme.muted, opacity: fadeIn(frame, s3.start + 18, 12) }}>
          tiered routing · live OpenRouter catalog · one HTML file{spec.repoUrl ? ` · ${spec.repoUrl}` : ''}
        </div>
      </div>
    </AbsoluteFill>
  );
};
