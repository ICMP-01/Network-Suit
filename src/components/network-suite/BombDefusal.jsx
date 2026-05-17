import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Zap, RotateCcw, CheckCircle, XCircle, Trophy } from 'lucide-react';

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function ipToInt(ip) { return ip.split('.').reduce((a, o) => (a << 8) | +o, 0) >>> 0; }
function intToIp(n) { return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.'); }

function genQuestion() {
  const prefix = randInt(20, 30);
  const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const hostBits = 32 - prefix;
  const subnetSize = Math.pow(2, hostBits);
  const netBase = (randInt(10,200) << 24 | randInt(0,255) << 16 | randInt(0,255) << 8) >>> 0;
  const networkInt = netBase & mask;
  const broadcastInt = (networkInt + subnetSize - 1) >>> 0;
  const ip = intToIp(networkInt + randInt(1,Math.min(254, subnetSize-2)));
  const network   = intToIp(networkInt);
  const broadcast = intToIp(broadcastInt);
  const first     = intToIp(networkInt + 1);
  const last      = intToIp(broadcastInt - 1);
  const usable    = Math.max(0, subnetSize - 2);
  const lastOctet = 256 - subnetSize;

  const variants = [
    { q:`Broadcast of ${ip}/${prefix}?`,            a: broadcast },
    { q:`Network address of ${ip}/${prefix}?`,      a: network },
    { q:`First usable host in ${network}/${prefix}?`,a: first },
    { q:`Last usable host in ${network}/${prefix}?`, a: last },
    { q:`Usable hosts in /${prefix}?`,              a: String(usable) },
    { q:`CIDR prefix for 255.255.255.${lastOctet}?`,a: `/${prefix}` },
    { q:`Subnet mask for /${prefix}?`,              a: intToIp(mask) },
    { q:`Number of subnets if ${network}/22 is split into /${prefix}?`, a: String(Math.pow(2, prefix-22)) },
  ];
  return variants[randInt(0, variants.length - 1)];
}

const TOTAL_Q  = 8;
const BASE_TIME = 35;

export default function BombDefusal() {
  const [phase, setPhase]   = useState('idle'); // idle | playing | result
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx]     = useState(0);
  const [input, setInput]   = useState('');
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [score, setScore]   = useState(0);
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [highScore, setHighScore] = useState(() => +localStorage.getItem('ns_bomb_hi') || 0);

  // Refs to avoid stale closures in timer
  const phaseRef    = useRef('idle');
  const resultsRef  = useRef([]);
  const scoreRef    = useRef(0);
  const penaltyRef  = useRef(0);
  const timerRef    = useRef(null);
  const inputRef    = useRef(null);

  phaseRef.current   = phase;
  resultsRef.current = results;
  scoreRef.current   = score;

  const effectiveTime = Math.max(0, timeLeft - penaltyRef.current);
  const danger = effectiveTime <= 10;
  const pct    = (effectiveTime / BASE_TIME) * 100;

  const finishGame = useCallback((res, sc) => {
    clearInterval(timerRef.current);
    setPhase('result');
    if (sc > highScore) {
      setHighScore(sc);
      localStorage.setItem('ns_bomb_hi', String(sc));
    }
  }, [highScore]);

  const startGame = useCallback(() => {
    clearInterval(timerRef.current);
    const qs = Array.from({ length: TOTAL_Q }, genQuestion);
    penaltyRef.current = 0;
    setQuestions(qs); setQIdx(0); setInput(''); setTimeLeft(BASE_TIME);
    setScore(0); setResults([]); setFeedback(null); setPhase('playing');
  }, []);

  // Timer tick
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const effective = t - 1 - penaltyRef.current;
        if (effective <= 0) {
          finishGame(resultsRef.current, scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, finishGame]);

  useEffect(() => { if (phase === 'playing') inputRef.current?.focus(); }, [qIdx, phase]);

  const submit = useCallback(() => {
    if (phase !== 'playing' || !questions[qIdx]) return;
    const q = questions[qIdx];
    const correct = input.trim().toLowerCase() === q.a.toLowerCase();
    const pts = correct ? Math.max(5, Math.floor(effectiveTime / 3)) : 0;
    if (!correct) penaltyRef.current += 8;

    const newResults = [...resultsRef.current, { q: q.q, correct, given: input, expected: q.a }];
    setResults(newResults);
    setScore(s => s + pts);
    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      const nextIdx = qIdx + 1;
      if (nextIdx >= TOTAL_Q) {
        finishGame(newResults, scoreRef.current + pts);
      } else {
        setQIdx(nextIdx);
        setInput('');
      }
    }, 700);
  }, [phase, qIdx, questions, input, effectiveTime, finishGame]);

  // ── IDLE screen ──────────────────────────────────────────────────────────────
  if (phase === 'idle') return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-6 p-8 text-center">
      <motion.div animate={{ y:[0,-8,0] }} transition={{ repeat:Infinity, duration:2 }} className="text-6xl">💣</motion.div>
      <div>
        <div className="text-xl font-black text-white mb-2">Defuse the Bomb!</div>
        <div className="text-[11px] font-mono text-gray-400 leading-relaxed max-w-xs mx-auto">
          Answer {TOTAL_Q} subnetting questions before the timer explodes.<br/>
          Each wrong answer adds <span className="text-red-400 font-bold">+8s penalty</span> — accuracy matters!
        </div>
      </div>
      {highScore > 0 && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400">
          <Trophy size={13}/> High Score: <strong>{highScore} pts</strong>
        </div>
      )}
      <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }} onClick={startGame}
        className="px-10 py-3 rounded-2xl text-sm font-black"
        style={{ background:'linear-gradient(135deg,#ef4444,#b91c1c)', color:'#fff', boxShadow:'0 0 30px rgba(239,68,68,0.5)' }}>
        🚀 START MISSION
      </motion.button>
    </div>
  );

  // ── RESULT screen ──────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const correct = results.filter(r=>r.correct).length;
    const pct2 = Math.round((correct/TOTAL_Q)*100);
    const emoji = pct2>=87?'🎉':pct2>=62?'😅':'💥';
    return (
      <div className="flex flex-col gap-3 p-2">
        <div className="ns-glass rounded-2xl p-5 text-center border border-white/10">
          <div className="text-4xl mb-2">{emoji}</div>
          <div className="text-lg font-black text-white mb-1">{pct2>=62?'Bomb Defused! ✅':'BOOM! 💥'}</div>
          <div className="text-[10px] font-mono text-gray-400">{correct}/{TOTAL_Q} correct • <span className="text-amber-300 font-bold">{score} pts</span></div>
          {score >= highScore && score > 0 && <div className="text-[9px] font-mono text-amber-400 mt-1"><Trophy size={11} className="inline mr-1"/>New High Score!</div>}
        </div>

        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="ns-glass rounded-xl p-3 flex items-start gap-3 border"
              style={{ borderColor: r.correct?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)' }}>
              {r.correct ? <CheckCircle size={13} className="text-emerald-400 shrink-0 mt-0.5"/> : <XCircle size={13} className="text-red-400 shrink-0 mt-0.5"/>}
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-mono text-gray-300">{r.q}</div>
                <div className="text-[9px] font-mono mt-0.5">
                  {r.correct
                    ? <span className="text-emerald-400">✓ {r.expected}</span>
                    : <><span className="text-red-400 line-through mr-1">{r.given||'—'}</span><span className="text-gray-400">→ {r.expected}</span></>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <motion.button whileHover={{ scale:1.03 }} onClick={startGame}
          className="py-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-2"
          style={{ background:'linear-gradient(135deg,#ef4444,#b91c1c)', color:'#fff' }}>
          <RotateCcw size={14}/> Play Again
        </motion.button>
      </div>
    );
  }

  // ── PLAYING screen ──────────────────────────────────────────────────────────────
  const q = questions[qIdx];
  return (
    <div className="flex flex-col gap-4">
      {/* Timer */}
      <div className="ns-glass rounded-2xl p-4 border" style={{ borderColor: danger?'rgba(239,68,68,0.5)':'rgba(168,85,247,0.25)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.span animate={{ rotate: danger?[-5,5,-5]:0 }} transition={{ repeat:Infinity, duration:0.3 }}>💣</motion.span>
            <span className="text-[10px] font-mono text-gray-400">Q{qIdx+1}/{TOTAL_Q}</span>
            {penaltyRef.current > 0 && <span className="text-[8px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">+{penaltyRef.current}s penalty</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <Timer size={13} style={{ color: danger?'#f87171':'#c084fc' }}/>
            <motion.span animate={{ color: danger?'#f87171':'#c084fc' }} className="text-base font-black font-mono">{effectiveTime}s</motion.span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
          <motion.div className="h-full rounded-full" animate={{ width:`${pct}%`, background: danger?'#ef4444':'#a855f7' }} transition={{ duration:0.5 }}/>
        </div>
      </div>

      {/* Scores row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label:'Score', val: score, color:'#c084fc' },
          { label:'Best',  val: highScore, color:'#fbbf24' },
          { label:'Left',  val: `${TOTAL_Q - qIdx}`, color:'#67e8f9' },
        ].map(({ label, val, color }) => (
          <div key={label} className="ns-glass rounded-xl p-2 text-center border border-white/5">
            <div className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
            <div className="text-sm font-black font-mono" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
          className="ns-glass rounded-2xl p-5 border border-purple-500/25">
          <div className="text-[8px] font-mono text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-black">{qIdx+1}</span>
            Subnet Challenge
          </div>
          <div className="text-[15px] font-bold text-white leading-snug">{q?.q}</div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback flash */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:1.5, opacity:0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="text-7xl drop-shadow-2xl">{feedback==='correct'?'✅':'❌'}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex gap-2">
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') submit(); }}
          placeholder="Answer (e.g. 192.168.1.0  or  /24  or  62)"
          className="flex-1 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all"
          style={{ background:'rgba(0,0,0,0.4)', border:`1px solid ${danger?'rgba(239,68,68,0.5)':'rgba(168,85,247,0.35)'}`, color:'#e2e8f0' }}/>
        <motion.button whileTap={{ scale:0.92 }} onClick={submit}
          className="px-5 py-3 rounded-xl font-black text-sm"
          style={{ background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff', boxShadow:'0 0 20px rgba(168,85,247,0.4)' }}>
          <Zap size={16}/>
        </motion.button>
      </div>

      <div className="text-[8px] font-mono text-gray-600 text-center">↵ Enter or ⚡ to submit</div>
    </div>
  );
}
