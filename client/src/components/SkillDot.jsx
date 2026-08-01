import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

/*
 * F1 — AI exposure indicator.
 * Green  = human_core  (durable, human-led)
 * Blue   = augmented   (AI amplifies this skill)
 * Amber  = at_risk     (high automation exposure)
 */
export const EXPOSURE_META = {
  human_core: { color: 'var(--green, #16a34a)', label: 'Human-core', desc: 'Low automation exposure — a durable, human-led skill.' },
  augmented: { color: '#2563eb', label: 'AI-augmented', desc: 'AI tools amplify this skill — pairing them is a strength.' },
  at_risk: { color: 'var(--amber, #d97706)', label: 'At risk', desc: 'High automation exposure — worth balancing with human-core skills.' },
};

/**
 * SkillDot — small coloured dot with an optional hover/focus tooltip.
 * Accepts either `exposure` (the ai_exposure string directly) or `skill`
 * (a skill-like object with an `ai_exposure` field). Renders nothing when
 * no recognised exposure value is available (null-safe).
 */
export default function SkillDot({ exposure, skill, size = 8, tooltip = true, style }) {
  const [show, setShow] = useState(false);
  const exp = exposure || skill?.ai_exposure;
  const meta = exp ? EXPOSURE_META[exp] : null;
  if (!meta) return null;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 5, ...style }}
      onMouseEnter={() => tooltip && setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => tooltip && setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={tooltip ? 0 : -1}
      aria-label={`AI exposure: ${meta.label}`}
    >
      <span
        style={{ width: size, height: size, borderRadius: '50%', background: meta.color, display: 'inline-block', flexShrink: 0 }}
        aria-hidden="true"
      />
      {tooltip && show && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '140%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--navy, #0c1c3c)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            zIndex: 30,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {meta.label} · {meta.desc}
        </span>
      )}
    </span>
  );
}

/** Small inline legend explaining the three dot colours, for use where space allows. */
export function SkillDotLegend({ style }) {
  return (
    <div className="row small muted" style={{ gap: 14, flexWrap: 'wrap', ...style }}>
      {Object.entries(EXPOSURE_META).map(([key, m]) => (
        <span key={key} className="row" style={{ gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block' }} aria-hidden="true" />
          {m.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Loads GET /skills once and returns a lookup object keyed by lower-cased
 * skill name and by `id:<id>`, mapping to the ai_exposure string. Useful on
 * pages that only have skill *names* (e.g. match overlap/gap arrays) rather
 * than full skill objects. Fails silently (empty map) if the request errors.
 */
export function useSkillExposureMap() {
  const [map, setMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    api.get('/skills')
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        const m = {};
        list.forEach((s) => {
          if (!s) return;
          if (s.name) m[s.name.toLowerCase()] = s.ai_exposure;
          if (s.id != null) m[`id:${s.id}`] = s.ai_exposure;
        });
        setMap(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return map;
}
