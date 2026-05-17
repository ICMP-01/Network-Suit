import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RotateCcw, Trophy, Shuffle } from 'lucide-react';

// ── CIDR Matcher data ──────────────────────────────────────────────────────────
const CIDR_PAIRS = [
  { mask:'255.255.255.0',   cidr:'/24', hosts:254 },
  { mask:'255.255.255.128', cidr:'/25', hosts:126 },
  { mask:'255.255.255.192', cidr:'/26', hosts:62  },
  { mask:'255.255.255.224', cidr:'/27', hosts:30  },
  { mask:'255.255.255.240', cidr:'/28', hosts:14  },
  { mask:'255.255.255.248', cidr:'/29', hosts:6   },
  { mask:'255.255.255.252', cidr:'/30', hosts:2   },
  { mask:'255.255.254.0',   cidr:'/23', hosts:510 },
  { mask:'255.255.252.0',   cidr:'/22', hosts:1022 },
  { mask:'255.255.248.0',   cidr:'/21', hosts:2046 },
  { mask:'255.255.0.0',     cidr:'/16', hosts:65534 },
  { mask:'255.0.0.0',       cidr:'/8',  hosts:16777214 },
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ── Wildcard data ──────────────────────────────────────────────────────────────
const WILDCARD_QS = [
  { q:'Match only 192.168.1.0 – 192.168.1.255', wc:'0.0.0.255',   desc:'Any host in 192.168.1.0/24' },
  { q:'Match 10.0.0.0 – 10.0.0.31',            wc:'0.0.0.31',    desc:'32 IPs = /27 wildcard' },
  { q:'Match 172.16.0.0 – 172.16.255.255',      wc:'0.0.255.255', desc:'172.16.0.0/16 block' },
  { q:'Match only one specific host: 10.1.1.1', wc:'0.0.0.0',    desc:'Exact match — no bits may vary' },
  { q:'Match 192.168.0.0 – 192.168.3.255',      wc:'0.0.3.255',  desc:'4 /24 subnets (/22 block)' },
  { q:'Match all IPs (permit any)',             wc:'255.255.255.255', desc:'Wildcard any — matches everything' },
  { q:'Match 10.0.0.0 – 10.0.0.15',            wc:'0.0.0.15',   desc:'16 IPs = /28 wildcard' },
  { q:'Match 10.10.0.0 – 10.10.255.255',        wc:'0.0.255.255', desc:'10.10.0.0/16 block' },
];

// ══════════════════════════════════════════════════════════════════════════════
// CIDR Matcher Game
// ══════════════════════════════════════════════════════════════════════════════
export function CIDRMatcher() {
  const [qIdx, setQIdx]     = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore]   = useState(0);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState([]);
  const [pool, setPool] = useState(() => shuffle(CIDR_PAIRS));

  const q = pool[qIdx % pool.length];

  // Build 4 options: correct + 3 distractors
  const opts = useCallback(() => {
    const others = shuffle(CIDR_PAIRS.filter(p => p.cidr !== q.cidr)).slice(0, 3);
    return shuffle([q, ...others]);
  }, [q]);
  const [options] = useState(opts);

  const [currentOpts, setCurrentOpts] = useState(opts());

  const pick = (opt) => {
    if (chosen) return;
    const correct = opt.cidr === q.cidr;
    setChosen(opt);
    setHistory(h => [...h, correct]);
    if (correct) { setScore(s => s + 10 + streak * 2); setStreak(s => s + 1); }
    else setStreak(0);
  };

  const next = () => {
    const ni = qIdx + 1;
    setQIdx(ni);
    setChosen(null);
    const nq = pool[ni % pool.length];
    const others = shuffle(CIDR_PAIRS.filter(p => p.cidr !== nq.cidr)).slice(0, 3);
    setCurrentOpts(shuffle([nq, ...others]));
  };

  const reset = () => { setQIdx(0); setChosen(null); setScore(0); setStreak(0); setHistory([]); setPool(shuffle(CIDR_PAIRS)); const nq=pool[0]; const others=shuffle(CIDR_PAIRS.filter(p=>p.cidr!==nq.cidr)).slice(0,3); setCurrentOpts(shuffle([nq,...others])); };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-black font-mono text-cyan-300">CIDR ↔ Subnet Mask Matcher</div>
          <div className="text-[8px] font-mono text-gray-500">Q{qIdx+1} • Score: {score} {streak>1 && <span className="text-amber-400">🔥×{streak}</span>}</div>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-0.5">{history.slice(-8).map((h,i)=><div key={i} className="w-2 h-2 rounded-full" style={{background:h?'#10b981':'#ef4444'}}/>)}</div>
          <button onClick={reset} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400"><RotateCcw size={12}/></button>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
          className="ns-glass-cyan rounded-2xl p-5 text-center border border-cyan-500/30">
          <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest mb-2">What is the CIDR notation for?</div>
          <div className="text-2xl font-black font-mono text-white">{q.mask}</div>
          <div className="text-[8px] font-mono text-gray-400 mt-1">{q.hosts.toLocaleString()} usable hosts</div>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {currentOpts.map((opt) => {
          const isCorrect = opt.cidr === q.cidr;
          const isPicked = chosen?.cidr === opt.cidr;
          let bg = 'rgba(255,255,255,0.04)';
          let border = 'rgba(255,255,255,0.1)';
          let color = '#9ca3af';
          if (chosen) {
            if (isCorrect) { bg='rgba(16,185,129,0.2)'; border='#10b981'; color='#34d399'; }
            else if (isPicked) { bg='rgba(239,68,68,0.15)'; border='#ef4444'; color='#f87171'; }
            else { bg='rgba(0,0,0,0.1)'; border='rgba(255,255,255,0.05)'; color='#374151'; }
          }
          return (
            <motion.button key={opt.cidr} onClick={()=>pick(opt)} disabled={!!chosen} whileTap={{scale:0.96}}
              className="py-4 rounded-2xl font-black text-xl font-mono transition-all border"
              style={{ background:bg, borderColor:border, color }}>
              {opt.cidr}
              {chosen && isCorrect && <div className="text-[8px] mt-1 font-normal">✓ {opt.mask}</div>}
            </motion.button>
          );
        })}
      </div>

      {/* Next */}
      {chosen && (
        <motion.button initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} onClick={next}
          className="py-2.5 rounded-xl text-[11px] font-black transition-all hover:scale-105"
          style={{ background:'rgba(6,182,212,0.2)', color:'#67e8f9', border:'1px solid rgba(6,182,212,0.4)' }}>
          Next Question →
        </motion.button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Wildcard Mask Game
// ══════════════════════════════════════════════════════════════════════════════
export function WildcardGame() {
  const [pool] = useState(() => shuffle(WILDCARD_QS));
  const [qIdx, setQIdx]   = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);

  const q = pool[qIdx % pool.length];

  const submit = () => {
    if (result) return;
    const correct = input.trim() === q.wc;
    setResult(correct ? 'correct' : 'wrong');
    setHistory(h => [...h, { correct, given: input, expected: q.wc, desc: q.desc }]);
    if (correct) setScore(s => s + 15);
  };

  const next = () => { setQIdx(i=>i+1); setInput(''); setResult(null); };
  const reset = () => { setQIdx(0); setInput(''); setResult(null); setScore(0); setHistory([]); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-black font-mono text-amber-300">ACL Wildcard Mask Game</div>
          <div className="text-[8px] font-mono text-gray-500">Q{qIdx+1} • Score: {score}</div>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-0.5">{history.slice(-8).map((h,i)=><div key={i} className="w-2 h-2 rounded-full" style={{background:h.correct?'#10b981':'#ef4444'}}/>)}</div>
          <button onClick={reset} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400"><RotateCcw size={12}/></button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
          className="ns-glass-amber rounded-2xl p-5 border border-amber-500/30">
          <div className="text-[9px] font-mono text-amber-400 uppercase tracking-widest mb-2">Write the Wildcard Mask for:</div>
          <div className="text-base font-bold text-white">{q.q}</div>
          <div className="text-[8px] font-mono text-gray-400 mt-2">
            💡 Wildcard = inverse of subnet mask. 0 = must match, 1 = don't care.
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} disabled={!!result}
          placeholder="e.g. 0.0.0.255"
          className="flex-1 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all"
          style={{ background:'rgba(0,0,0,0.4)', border:`1px solid ${result==='correct'?'rgba(16,185,129,0.5)':result==='wrong'?'rgba(239,68,68,0.5)':'rgba(245,158,11,0.35)'}`, color:'#e2e8f0' }}/>
        <button onClick={submit} disabled={!!result} className="px-5 py-3 rounded-xl font-black text-sm disabled:opacity-40 transition-all hover:scale-105"
          style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#000' }}>
          Check
        </button>
      </div>

      {result && (
        <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
          className="ns-glass rounded-xl p-4 border" style={{ borderColor: result==='correct'?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)' }}>
          <div className="flex items-center gap-2 mb-1">
            {result==='correct' ? <CheckCircle size={14} className="text-emerald-400"/> : <XCircle size={14} className="text-red-400"/>}
            <span className="text-[11px] font-bold" style={{ color: result==='correct'?'#34d399':'#f87171' }}>
              {result==='correct' ? 'Correct! +15 pts' : `Wrong — Answer: ${q.wc}`}
            </span>
          </div>
          <div className="text-[9px] font-mono text-gray-400">{q.desc}</div>
          <button onClick={next} className="mt-3 w-full py-2 rounded-lg text-[10px] font-bold font-mono transition-all"
            style={{ background:'rgba(245,158,11,0.2)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.4)' }}>
            Next →
          </button>
        </motion.div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="ns-glass rounded-xl p-3 border border-white/5">
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">History</div>
          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
            {[...history].reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[8px] font-mono">
                <span style={{ color: h.correct?'#34d399':'#f87171' }}>{h.correct?'✓':'✗'}</span>
                <span className="text-gray-400 truncate flex-1">{h.desc}</span>
                {!h.correct && <span className="text-gray-600">→ {h.expected}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
