import React from 'react';
import Modal from './Modal.jsx';
import Badge from './Badge.jsx';
import SkillTag from './SkillTag.jsx';
import MatchPill from './MatchPill.jsx';
import { useToast } from './Toast.jsx';

const STAGE_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

// F3: candidate comparison board. `items` are pre-normalised by the caller
// (see RoleManage.jsx toCompareItem) to a common shape:
// { key, name, verified, university:{name,qs_rank}, match_score, overlap:[],
//   gaps:[], stage: string|null, future_proof_score: number|null }
export default function CompareModal({ open, onClose, items = [], onRemove }) {
  const toast = useToast();

  const copySummary = async () => {
    const cols = items;
    const rows = [
      ['Name', ...cols.map((c) => c.name || '—')],
      ['Verified', ...cols.map((c) => (c.verified ? 'Yes' : 'No'))],
      ['University', ...cols.map((c) => `${c.university?.name || '—'}${c.university?.qs_rank ? ` (QS #${c.university.qs_rank})` : ''}`)],
      ['Match %', ...cols.map((c) => (c.match_score != null ? `${c.match_score}%` : '—'))],
      ['Overlapping skills', ...cols.map((c) => (c.overlap && c.overlap.length ? c.overlap.join('; ') : '—'))],
      ['Gap skills', ...cols.map((c) => (c.gaps && c.gaps.length ? c.gaps.join('; ') : '—'))],
      ['Stage', ...cols.map((c) => (c.stage ? STAGE_LABELS[c.stage] || c.stage : '—'))],
      ['Future-proof score', ...cols.map((c) => (c.future_proof_score != null ? c.future_proof_score : '—'))],
    ];
    const text = rows.map((r) => r.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Comparison summary copied to clipboard');
    } catch (e) {
      toast('Could not copy summary', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Compare candidates (${items.length})`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary" disabled={items.length === 0} onClick={copySummary}>Copy summary</button>
        </>
      }
    >
      {items.length === 0 ? (
        <div className="muted small">No candidates selected. Tick up to 4 rows to compare.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: 160 + items.length * 190 }}>
            <thead>
              <tr>
                <th style={{ width: 150 }}>&nbsp;</th>
                {items.map((c) => (
                  <th key={c.key}>
                    <div className="stack" style={{ gap: 4 }}>
                      <span>{c.name}</span>
                      {onRemove && (
                        <button type="button" className="btn-link small" onClick={() => onRemove(c.key)}>Remove</button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="muted small">Verified</td>
                {items.map((c) => <td key={c.key}>{c.verified ? <Badge kind="verified" /> : <span className="muted small">Not verified</span>}</td>)}
              </tr>
              <tr>
                <td className="muted small">University</td>
                {items.map((c) => (
                  <td key={c.key}>
                    {c.university?.name || '—'}
                    {c.university?.qs_rank ? <span className="muted small"> (QS #{c.university.qs_rank})</span> : null}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="muted small">Match %</td>
                {items.map((c) => <td key={c.key}>{c.match_score != null ? <MatchPill score={c.match_score} /> : '—'}</td>)}
              </tr>
              <tr>
                <td className="muted small">Overlapping skills</td>
                {items.map((c) => (
                  <td key={c.key}>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                      {(c.overlap || []).length ? c.overlap.map((s) => <SkillTag key={s} name={s} variant="overlap" />) : <span className="muted small">—</span>}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="muted small">Gap skills</td>
                {items.map((c) => (
                  <td key={c.key}>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                      {(c.gaps || []).length ? c.gaps.map((s) => <SkillTag key={s} name={s} variant="gap" />) : <span className="muted small">—</span>}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="muted small">Stage</td>
                {items.map((c) => <td key={c.key}>{c.stage ? <Badge kind={`status-${c.stage}`} /> : <span className="muted small">Not applied</span>}</td>)}
              </tr>
              <tr>
                <td className="muted small">Future-proof score</td>
                {items.map((c) => <td key={c.key}>{c.future_proof_score != null ? c.future_proof_score : '—'}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
