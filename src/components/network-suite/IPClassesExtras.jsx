import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Search, Map, Zap, BookOpen, Layers, Target } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════════
// 1. Address Space Ruler
// ══════════════════════════════════════════════════════════════════════════════
export function AddressSpaceRuler() {
  const classes = [
    { name: 'A', pct: 50, color: '#06b6d4', desc: '50% (128 /8s)' },
    { name: 'B', pct: 25, color: '#a855f7', desc: '25% (16K /16s)' },
    { name: 'C', pct: 12.5, color: '#22c55e', desc: '12.5% (2M /24s)' },
    { name: 'D', pct: 6.25, color: '#f97316', desc: '6.25% (Multicast)' },
    { name: 'E', pct: 6.25, color: '#ef4444', desc: '6.25% (Reserved)' },
  ];

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-blue-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={14} className="text-blue-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-blue-400">Classful Address Space Ruler</span>
      </div>
      
      <div className="flex h-8 w-full rounded-xl overflow-hidden shadow-lg border border-white/10" style={{background:'rgba(0,0,0,0.5)'}}>
        {classes.map(c => (
          <div key={c.name} className="h-full flex items-center justify-center relative group border-r border-black/40 last:border-r-0 transition-all hover:brightness-125"
               style={{width: `${c.pct}%`, background: `${c.color}40`}}>
            <span className="text-[10px] font-black font-mono drop-shadow-md" style={{color:c.color}}>{c.name}</span>
            <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 p-2 rounded-lg border z-10 whitespace-nowrap pointer-events-none"
                 style={{borderColor: c.color}}>
              <div className="text-[10px] font-bold" style={{color:c.color}}>Class {c.name}</div>
              <div className="text-[8px] font-mono text-gray-300 mt-1">{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[7px] font-mono text-gray-500 mt-2">
        <span>0.0.0.0</span>
        <span>128.0.0.0</span>
        <span>192.0.0.0</span>
        <span>224.0.0.0</span>
        <span>240.0.0.0</span>
        <span>255.255.255.255</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Quick Classifier
// ══════════════════════════════════════════════════════════════════════════════
export function QuickClassifier() {
  const [ip, setIp] = useState('192.168.1.50');

  const classify = (ipStr) => {
    const parts = ipStr.split('.');
    if (parts.length !== 4) return null;
    const oct1 = parseInt(parts[0], 10);
    const oct2 = parseInt(parts[1], 10);
    if (isNaN(oct1)) return null;

    let cls = 'Unknown', type = 'Public', binary = '', mask = '';
    
    if (oct1 >= 0 && oct1 <= 127) { cls = 'A'; mask = '/8'; binary = '0'; }
    else if (oct1 >= 128 && oct1 <= 191) { cls = 'B'; mask = '/16'; binary = '10'; }
    else if (oct1 >= 192 && oct1 <= 223) { cls = 'C'; mask = '/24'; binary = '110'; }
    else if (oct1 >= 224 && oct1 <= 239) { cls = 'D'; mask = 'N/A'; binary = '1110'; type = 'Multicast'; }
    else if (oct1 >= 240 && oct1 <= 255) { cls = 'E'; mask = 'N/A'; binary = '1111'; type = 'Reserved'; }

    if (oct1 === 10) type = 'Private (RFC 1918)';
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) type = 'Private (RFC 1918)';
    if (oct1 === 192 && oct2 === 168) type = 'Private (RFC 1918)';
    if (oct1 === 127) type = 'Loopback';
    if (oct1 === 169 && oct2 === 254) type = 'APIPA (Link-Local)';

    return { cls, type, binary: oct1.toString(2).padStart(8,'0'), mask, oct1 };
  };

  const result = classify(ip);

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Search size={14} className="text-purple-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-purple-400">Quick IP Classifier</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <input 
          value={ip} 
          onChange={e=>setIp(e.target.value)}
          placeholder="Enter IP address..."
          className="w-full sm:w-64 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none"
          style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(168,85,247,0.3)'}}
        />
        
        {result ? (
          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-lg" style={{background:'rgba(168,85,247,0.1)'}}>
              <div className="text-[8px] font-mono text-purple-400 uppercase">Class</div>
              <div className="text-lg font-black text-purple-300">{result.cls}</div>
            </div>
            <div className="p-3 rounded-lg" style={{background:'rgba(168,85,247,0.1)'}}>
              <div className="text-[8px] font-mono text-purple-400 uppercase">Type</div>
              <div className="text-xs font-bold text-white mt-1 leading-tight">{result.type}</div>
            </div>
            <div className="p-3 rounded-lg" style={{background:'rgba(168,85,247,0.1)'}}>
              <div className="text-[8px] font-mono text-purple-400 uppercase">First Octet</div>
              <div className="text-xs font-mono text-white mt-1">{result.oct1} <span className="text-gray-500">({result.binary})</span></div>
            </div>
            <div className="p-3 rounded-lg" style={{background:'rgba(168,85,247,0.1)'}}>
              <div className="text-[8px] font-mono text-purple-400 uppercase">Default Mask</div>
              <div className="text-xs font-mono text-white mt-1">{result.mask}</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 text-[10px] font-mono text-gray-500">Enter a valid IPv4 address.</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. ARPANET Interactive Map
// ══════════════════════════════════════════════════════════════════════════════
export function ArpanetMap() {
  const earlyAllocations = [
    { num: 3, org: 'GE', year: '1990' },
    { num: 4, org: 'BBN', year: '1989' },
    { num: 9, org: 'IBM', year: '1989' },
    { num: 17, org: 'Apple', year: '1990' },
    { num: 18, org: 'MIT', year: '1989' },
    { num: 19, org: 'Ford', year: '1995' },
    { num: 44, org: 'AmprNet', year: '1992' },
    { num: 56, org: 'US Postal', year: '1994' }
  ];

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Map size={14} className="text-amber-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-amber-400">Historical Class A (/8) Allocations</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-4">In the early internet (pre-1993), massive Class A blocks (16.7 million IPs) were handed out to individual universities and corporations. Many have since been returned to IANA or sold.</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {earlyAllocations.map(a => (
          <div key={a.num} className="p-3 rounded-xl flex items-center justify-between" style={{background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.1)'}}>
            <div>
              <div className="text-[11px] font-bold text-amber-300">{a.org}</div>
              <div className="text-[8px] font-mono text-gray-500 mt-0.5">Allocated: {a.year}</div>
            </div>
            <div className="text-[10px] font-black font-mono text-white bg-amber-500/20 px-2 py-1 rounded">
              {a.num}.0.0.0
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. Classful vs CIDR Visualizer
// ══════════════════════════════════════════════════════════════════════════════
export function ClassfulVsCidr() {
  const [mode, setMode] = useState('classful'); // 'classful' or 'cidr'

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-rose-500/20 overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-rose-400" />
          <span className="text-[10px] font-black font-mono uppercase tracking-widest text-rose-400">Classful vs CIDR Boundaries</span>
        </div>
        <div className="flex bg-black/40 rounded-lg p-1">
          <button onClick={()=>setMode('classful')} className={`px-3 py-1 rounded text-[9px] font-bold font-mono transition-colors ${mode==='classful'?'bg-rose-500/20 text-rose-300':'text-gray-500'}`}>Classful</button>
          <button onClick={()=>setMode('cidr')} className={`px-3 py-1 rounded text-[9px] font-bold font-mono transition-colors ${mode==='cidr'?'bg-emerald-500/20 text-emerald-300':'text-gray-500'}`}>CIDR</button>
        </div>
      </div>

      <div className="relative h-20 w-full flex bg-black/30 rounded-xl border border-white/5">
        {mode === 'classful' ? (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="h-full border-r border-rose-500/50 flex flex-col items-center justify-center relative" style={{width:'8%', background:'rgba(244,63,94,0.1)'}}>
              <span className="text-[10px] font-black text-rose-400">/8</span>
              <span className="text-[7px] text-gray-400 absolute bottom-1">Class A boundary</span>
            </motion.div>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="h-full border-r border-rose-500/50 flex flex-col items-center justify-center relative" style={{width:'8%', background:'rgba(244,63,94,0.1)'}}>
              <span className="text-[10px] font-black text-rose-400">/16</span>
              <span className="text-[7px] text-gray-400 absolute bottom-1">Class B boundary</span>
            </motion.div>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="h-full border-r border-rose-500/50 flex flex-col items-center justify-center relative" style={{width:'8%', background:'rgba(244,63,94,0.1)'}}>
              <span className="text-[10px] font-black text-rose-400">/24</span>
              <span className="text-[7px] text-gray-400 absolute bottom-1">Class C boundary</span>
            </motion.div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[9px] font-mono text-gray-500">Rigid 8-bit boundaries only. Massive waste.</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex relative">
            {[...Array(32)].map((_,i) => (
              <motion.div key={i} initial={{opacity:0, scaleY:0}} animate={{opacity:1, scaleY:1}} transition={{delay: i*0.02}}
                className="flex-1 border-r border-emerald-500/20 flex flex-col items-center justify-center group hover:bg-emerald-500/20 cursor-crosshair">
                <div className="w-px h-full bg-emerald-500/10 group-hover:bg-emerald-500" />
                <span className="absolute bottom-2 text-[6px] text-emerald-500/0 group-hover:text-emerald-400 font-mono transition-colors">/{i+1}</span>
              </motion.div>
            ))}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] font-mono text-emerald-300 bg-black/60 px-2 py-1 rounded">Fluid boundaries anywhere from /1 to /32. No waste.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. Octet Pattern Trainer
// ══════════════════════════════════════════════════════════════════════════════
export function OctetPatternTrainer() {
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(generateTarget());
  const [feedback, setFeedback] = useState(null);

  function generateTarget() {
    const oct1 = Math.floor(Math.random() * 256);
    let cls = 'E';
    if (oct1 <= 127) cls = 'A';
    else if (oct1 <= 191) cls = 'B';
    else if (oct1 <= 223) cls = 'C';
    else if (oct1 <= 239) cls = 'D';
    return { oct1, cls };
  }

  const handleGuess = (guessCls) => {
    if (guessCls === target.cls) {
      setScore(s => s + 1);
      setFeedback({ type: 'success', text: `Correct! ${target.oct1} is Class ${target.cls}.` });
    } else {
      setScore(0);
      setFeedback({ type: 'error', text: `Wrong. ${target.oct1} is Class ${target.cls}, not ${guessCls}.` });
    }
    setTimeout(() => {
      setFeedback(null);
      setTarget(generateTarget());
    }, 1500);
  };

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-emerald-500/20 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Target size={14} className="text-emerald-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400">Class Trainer Minigame</span>
      </div>
      <div className="text-[8px] font-mono text-gray-500 mb-6">Score: <span className="text-white font-bold">{score}</span> streak</div>

      <div className="text-4xl font-black text-white mb-6 font-mono">
        {target.oct1}<span className="text-gray-600">.x.x.x</span>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {['A', 'B', 'C', 'D', 'E'].map(c => (
          <button key={c} onClick={() => handleGuess(c)} disabled={!!feedback}
            className="w-10 h-10 rounded-xl text-lg font-black font-mono bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors disabled:opacity-50 border border-white/10">
            {c}
          </button>
        ))}
      </div>

      <div className="h-4">
        {feedback && (
          <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} 
            className={`text-[10px] font-black font-mono ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {feedback.text}
          </motion.div>
        )}
      </div>
    </div>
  );
}
