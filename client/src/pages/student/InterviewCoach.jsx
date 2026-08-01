import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ScoreDial from '../../components/ScoreDial.jsx';

// Base categories from the interview question bank (Technical, Data, Business,
// Soft/behavioural) — used for the "pick a category" chip flow. Role-based
// selection derives categories from the role's required skills server-side.
const CATEGORIES = ['Technical', 'Data', 'Business', 'Soft', 'Consulting', 'Finance', 'Engineering', 'Media'];

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function readinessTone(label) {
  const l = (label || '').toLowerCase();
  if (l.includes('ready')) return 'var(--green, #16a34a)';
  if (l.includes('progress') || l.includes('developing')) return 'var(--amber, #d97706)';
  return 'var(--red, #dc2626)';
}

export default function InterviewCoach() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [pastAttempts, setPastAttempts] = useState(null);

  const [pickMode, setPickMode] = useState('role'); // 'role' | 'category'
  const [roleId, setRoleId] = useState('');
  const [category, setCategory] = useState('');

  const [questions, setQuestions] = useState(null); // null = not yet loaded
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/roles').then((d) => setRoles(d.roles || [])).catch(() => {});
    loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAttempts = () => {
    api.get('/interview/attempts').then(setPastAttempts).catch(() => setPastAttempts([]));
  };

  const roleMap = useMemo(() => {
    const m = {};
    roles.forEach((r) => { m[r.id] = r; });
    return m;
  }, [roles]);

  const startPractice = async () => {
    if (pickMode === 'role' && !roleId) { toast('Pick a role first', 'error'); return; }
    if (pickMode === 'category' && !category) { toast('Pick a category first', 'error'); return; }
    setLoadingQuestions(true);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (pickMode === 'role') params.set('role_id', roleId);
      else params.set('category', category);
      const data = await api.get(`/interview/questions?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data.questions || []);
      if (list.length === 0) {
        toast('No questions available for that selection', 'error');
        setQuestions(null);
      } else {
        setQuestions(list);
        setAnswers({});
        setStep(0);
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const setAnswer = (qid, text) => setAnswers((prev) => ({ ...prev, [qid]: text }));

  const next = () => setStep((s) => Math.min(s + 1, questions.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q) => ({ question_id: q.id, text: answers[q.id] || '' })),
      };
      if (pickMode === 'role') payload.role_id = Number(roleId);
      else payload.category = category;
      const res = await api.post('/interview/attempts', payload);
      setResult(res);
      loadAttempts();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setResult(null);
    setQuestions(null);
    setAnswers({});
    setStep(0);
  };

  const answeredCount = questions ? questions.filter((q) => (answers[q.id] || '').trim().length > 0).length : 0;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Interview coach</h1>
        <span className="muted small">Practise five questions and get instant, structured feedback.</span>
      </div>

      {!questions && !result && (
        <Card title="Choose how to practise">
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <button type="button" className={`btn btn-sm ${pickMode === 'role' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPickMode('role')}>By open role</button>
            <button type="button" className={`btn btn-sm ${pickMode === 'category' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPickMode('category')}>By category</button>
          </div>

          {pickMode === 'role' ? (
            <div className="field">
              <span className="label">Open role</span>
              <select className="select" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Select a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.title} — {r.company?.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="label">Category</div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="skill-tag skill-tag-pick"
                    style={category === c ? { background: 'var(--accent)', color: '#fff' } : undefined}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-primary" disabled={loadingQuestions} onClick={startPractice}>
              {loadingQuestions ? 'Loading…' : 'Start practice'}
            </button>
          </div>
        </Card>
      )}

      {questions && !result && (
        <Card title={`Question ${step + 1} of ${questions.length}`} action={<span className="muted small">{answeredCount}/{questions.length} answered</span>}>
          <div className="progress" style={{ marginBottom: 16 }}>
            <div className="progress-bar" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>

          <div className="stack">
            <div>
              <Badge kind="neutral">{questions[step].category}</Badge>
              <p style={{ fontWeight: 600, marginTop: 8 }}>{questions[step].question}</p>
            </div>
            <textarea
              className="textarea"
              rows={8}
              placeholder="Structure your answer with Situation, Task/Action and Result where relevant…"
              value={answers[questions[step].id] || ''}
              onChange={(e) => setAnswer(questions[step].id, e.target.value)}
            />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={prev}>Back</button>
              {step < questions.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={next}>Next</button>
              ) : (
                <button type="button" className="btn btn-primary" disabled={submitting} onClick={submit}>
                  {submitting ? 'Scoring…' : 'Submit answers'}
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {result && (
        <Card title="Your results">
          <div className="row" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <ScoreDial score={result.score} label="overall score" />
            <div>
              <div className="label">Readiness</div>
              <span style={{ fontWeight: 800, fontSize: 18, color: readinessTone(result.readiness_label) }}>
                {result.readiness_label || '—'}
              </span>
            </div>
            <button type="button" className="btn btn-primary" onClick={retry}>Practise again</button>
          </div>

          <div className="stack">
            {(result.per_question || []).map((pq, i) => {
              const q = questions.find((qq) => qq.id === pq.question_id);
              return (
                <div key={pq.question_id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>Q{i + 1}. {q ? q.question : `Question ${pq.question_id}`}</strong>
                    <span className="small muted">{pq.score}/100</span>
                  </div>
                  {pq.feedback && <div className="small muted" style={{ marginTop: 4 }}>{pq.feedback}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="Past attempts">
        {pastAttempts === null ? (
          <div className="muted small">Loading…</div>
        ) : pastAttempts.length === 0 ? (
          <EmptyState icon="🎤" title="No attempts yet" text="Practise a set of questions to see your history here." />
        ) : (
          <table className="table">
            <thead>
              <tr><th>Role / category</th><th>Score</th><th>Date</th></tr>
            </thead>
            <tbody>
              {pastAttempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.role_id && roleMap[a.role_id] ? roleMap[a.role_id].title : (a.category || '—')}</td>
                  <td>{a.score}/100</td>
                  <td className="muted small">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
