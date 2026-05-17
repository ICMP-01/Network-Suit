import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ── Cert Prep Tag ─────────────────────────────────────────────────────────────
export function CertTag({ obj, domain, weight, studyMin = 20 }) {
  const [show, setShow] = useState(false);
  return (
    <span className="cert-tag-wrap" style={{ position:'relative', display:'inline-block', marginLeft:4 }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ background:'rgba(245,158,11,0.13)', border:'1px solid rgba(245,158,11,0.38)', color:'#fbbf24', fontSize:7, fontWeight:700, padding:'1px 6px', borderRadius:999, fontFamily:'monospace', cursor:'help', display:'inline-block', verticalAlign:'middle' }}>
        🎓 {obj}
      </span>
      {show && (
        <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:0, zIndex:999, minWidth:200, background:'rgba(8,12,28,0.97)', border:'1px solid rgba(245,158,11,0.4)', borderRadius:10, padding:'8px 12px', boxShadow:'0 8px 32px rgba(0,0,0,0.6)', pointerEvents:'none' }}>
          <div style={{ color:'#fbbf24', fontSize:8, fontWeight:800, fontFamily:'monospace', marginBottom:3 }}>{obj}</div>
          {domain && <div style={{ color:'#9ca3af', fontSize:7, fontFamily:'monospace', marginBottom:2 }}>Domain: {domain}{weight ? ` (${weight}% of exam)` : ''}</div>}
          <div style={{ color:'#6b7280', fontSize:7, fontFamily:'monospace' }}>⏱ ~{studyMin} min to review · click 🎓 Cert Prep Hub</div>
          <div style={{ position:'absolute', bottom:-5, left:12, width:8, height:8, background:'rgba(8,12,28,0.97)', borderRight:'1px solid rgba(245,158,11,0.4)', borderBottom:'1px solid rgba(245,158,11,0.4)', transform:'rotate(45deg)' }} />
        </div>
      )}
    </span>
  );
}

// ── Suite Context ─────────────────────────────────────────────────────────────
export const SuiteContext = createContext({
  theme: 'hacker',      setTheme: () => {},
  certPrepMode: false,  setCertPrepMode: () => {},
  trackerEntries: [],   addToTracker: () => {}, removeFromTracker: () => {}, updateTrackerNote: () => {},
  learningProgress: {}, markLearningStep: () => {},
  quizHighScores: {},   saveQuizScore: () => {},
  xp: 0,               addXP: () => {},
  streak: 0,
  achievements: {},     unlockAchievement: () => {},
  quizHistory: [],      addQuizHistory: () => {},
  certProgress: {},     setCertObjective: () => {},
});

export const useSuite = () => useContext(SuiteContext);

function loadJSON(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def; }
  catch { return def; }
}

export function SuiteProvider({ children }) {
  const [theme, setTheme]                 = useState(() => loadJSON('ns_theme', 'hacker'));
  const [certPrepMode, setCertPrepMode]   = useState(false);
  const [trackerEntries, setTrackerEntries] = useState(() => loadJSON('ns_tracker', []));
  const [learningProgress, setLearningProgress] = useState(() => loadJSON('ns_progress', {}));
  const [quizHighScores, setQuizHighScores]   = useState(() => loadJSON('ns_quiz_scores', {}));
  const [xp, setXP]                          = useState(() => loadJSON('ns_xp', 0));
  const [streak, setStreak]                  = useState(() => loadJSON('ns_streak', 0));
  const [achievements, setAchievements]      = useState(() => loadJSON('ns_achievements', {}));
  const [quizHistory, setQuizHistory]        = useState(() => loadJSON('ns_quiz_history', []));
  const [certProgress, setCertProgress]      = useState(() => loadJSON('ns_cert_progress', {}));

  useEffect(() => { localStorage.setItem('ns_theme', JSON.stringify(theme)); }, [theme]);
  useEffect(() => { localStorage.setItem('ns_tracker', JSON.stringify(trackerEntries)); }, [trackerEntries]);
  useEffect(() => { localStorage.setItem('ns_progress', JSON.stringify(learningProgress)); }, [learningProgress]);
  useEffect(() => { localStorage.setItem('ns_quiz_scores', JSON.stringify(quizHighScores)); }, [quizHighScores]);
  useEffect(() => { localStorage.setItem('ns_xp', JSON.stringify(xp)); }, [xp]);
  useEffect(() => { localStorage.setItem('ns_streak', JSON.stringify(streak)); }, [streak]);
  useEffect(() => { localStorage.setItem('ns_achievements', JSON.stringify(achievements)); }, [achievements]);
  useEffect(() => { localStorage.setItem('ns_quiz_history', JSON.stringify(quizHistory)); }, [quizHistory]);
  useEffect(() => { localStorage.setItem('ns_cert_progress', JSON.stringify(certProgress)); }, [certProgress]);

  const addToTracker = useCallback((entry) => {
    setTrackerEntries(prev => {
      if (prev.find(e => e.cidr === entry.cidr)) return prev;
      return [...prev, { ...entry, id: Date.now(), notes: '' }];
    });
  }, []);

  const removeFromTracker = useCallback((id) => setTrackerEntries(prev => prev.filter(e => e.id !== id)), []);
  const updateTrackerNote = useCallback((id, notes) => setTrackerEntries(prev => prev.map(e => e.id === id ? { ...e, notes } : e)), []);

  const markLearningStep = useCallback((pathId, stepId, status) => {
    setLearningProgress(prev => ({ ...prev, [pathId]: { ...(prev[pathId] || {}), [stepId]: status } }));
  }, []);

  const saveQuizScore = useCallback((category, score, total) => {
    const pct = Math.round((score / total) * 100);
    setQuizHighScores(prev => {
      if ((prev[category] || 0) < pct) return { ...prev, [category]: pct };
      return prev;
    });
    addQuizHistory({ category, score, total, pct, date: new Date().toISOString() });
  }, []);

  const addXP = useCallback((amount, reason) => {
    setXP(prev => prev + amount);
  }, []);

  const unlockAchievement = useCallback((id) => {
    setAchievements(prev => ({ ...prev, [id]: { date: new Date().toISOString() } }));
  }, []);

  const addQuizHistory = useCallback((entry) => {
    setQuizHistory(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const setCertObjective = useCallback((examId, objId, checked) => {
    setCertProgress(prev => ({ ...prev, [`${examId}_${objId}`]: checked }));
  }, []);

  return (
    <SuiteContext.Provider value={{
      theme, setTheme,
      certPrepMode, setCertPrepMode,
      trackerEntries, addToTracker, removeFromTracker, updateTrackerNote,
      learningProgress, markLearningStep,
      quizHighScores, saveQuizScore,
      xp, addXP, streak,
      achievements, unlockAchievement,
      quizHistory, addQuizHistory,
      certProgress, setCertObjective,
    }}>
      {children}
    </SuiteContext.Provider>
  );
}
