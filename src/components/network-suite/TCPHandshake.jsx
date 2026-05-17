import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Server, RotateCcw } from 'lucide-react';

const STATE_COLOR = { CLOSED:'#6b7280', LISTEN:'#3b82f6', SYN_SENT:'#f59e0b', SYN_RCVD:'#f97316', ESTABLISHED:'#10b981', FIN_WAIT_1:'#ef4444', FIN_WAIT_2:'#f97316', CLOSE_WAIT:'#f59e0b', LAST_ACK:'#a855f7', TIME_WAIT:'#ec4899', };

const CONNECT_STEPS = [
  { c:'CLOSED',      s:'LISTEN',      arrow:null,                                                label:'Server listening on port. Client idle.', detail:'Server called listen() — blocked waiting for SYN. Client has not started.' },
  { c:'SYN_SENT',   s:'LISTEN',      arrow:{label:'SYN',    sub:'Seq=1000 Ack=0 Flags=SYN',    dir:'→', color:'#3b82f6'}, label:'Client → SYN (I want to connect!)', detail:'Client picks ISN=1000. Sets SYN flag. No data. Enters SYN_SENT state.' },
  { c:'SYN_SENT',   s:'SYN_RCVD',   arrow:{label:'SYN-ACK',sub:'Seq=5000 Ack=1001 Flags=SYN+ACK', dir:'←', color:'#10b981'}, label:'Server → SYN-ACK (Acknowledged!)', detail:'Server picks ISN=5000. ACK=client ISN+1=1001. Both SYN+ACK set. Enters SYN_RCVD.' },
  { c:'ESTABLISHED', s:'SYN_RCVD',   arrow:{label:'ACK',    sub:'Seq=1001 Ack=5001 Flags=ACK', dir:'→', color:'#3b82f6'}, label:'Client → ACK (Connection confirmed)', detail:'Client confirms server\'s ISN. No SYN flag. Client now ESTABLISHED.' },
  { c:'ESTABLISHED', s:'ESTABLISHED', arrow:{label:'HTTP GET',sub:'Seq=1001 PSH+ACK',           dir:'→', color:'#a855f7'}, label:'✅ Connection open — data flowing', detail:'Full-duplex. Both sides ESTABLISHED. TLS handshake may follow for HTTPS.' },
];

const CLOSE_STEPS = [
  { c:'ESTABLISHED',s:'ESTABLISHED', arrow:null,                                                   label:'Active close begins (client closes first)', detail:'Client application called close(). Will send FIN.' },
  { c:'FIN_WAIT_1', s:'ESTABLISHED', arrow:{label:'FIN',    sub:'Seq=2000 Flags=FIN+ACK',        dir:'→', color:'#ef4444'}, label:'Client → FIN (Done sending)', detail:'Client done sending. Sets FIN flag. Enters FIN_WAIT_1.' },
  { c:'FIN_WAIT_2', s:'CLOSE_WAIT',  arrow:{label:'ACK',    sub:'Ack=2001',                       dir:'←', color:'#f59e0b'}, label:'Server → ACK (Half-close acknowledged)', detail:'Server can still send. Client waits in FIN_WAIT_2.' },
  { c:'FIN_WAIT_2', s:'LAST_ACK',    arrow:{label:'FIN',    sub:'Seq=6000 Flags=FIN+ACK',        dir:'←', color:'#a855f7'}, label:'Server → FIN (Server also done)', detail:'Server finished sending. Sends FIN. Enters LAST_ACK.' },
  { c:'TIME_WAIT',  s:'CLOSED',      arrow:{label:'ACK',    sub:'Ack=6001 (final)',               dir:'→', color:'#ec4899'}, label:'Client → ACK + TIME_WAIT 2MSL', detail:'Client sends final ACK. Waits 2×MSL (~4min) to handle lost ACKs, then CLOSED.' },
];

function Arrow({ arrow }) {
  if (!arrow) return <div className="h-10 flex items-center justify-center text-[9px] font-mono text-gray-600">—</div>;
  const isRight = arrow.dir === '→';
  return (
    <motion.div initial={{ opacity:0, x: isRight?-40:40 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.45 }}
      className="flex items-center gap-2 w-full py-1" style={{ flexDirection: isRight?'row':'row-reverse' }}>
      <div className="px-2 py-1 rounded-full text-[10px] font-black font-mono border shrink-0 text-center"
        style={{ background:`${arrow.color}20`, borderColor:`${arrow.color}50`, color:arrow.color, minWidth:72 }}>
        {arrow.label}
      </div>
      <div className="flex-1 flex items-center gap-1" style={{ flexDirection: isRight?'row':'row-reverse' }}>
        <div className="flex-1 h-px" style={{ background:`linear-gradient(${isRight?'90deg':'270deg'},${arrow.color}80,${arrow.color}10)` }}/>
        <span className="text-base" style={{ color:arrow.color }}>{arrow.dir}</span>
      </div>
      <div className="text-[7px] font-mono shrink-0" style={{ color:`${arrow.color}80` }}>{arrow.sub}</div>
    </motion.div>
  );
}

function StateBox({ label, state, side }) {
  const color = STATE_COLOR[state] || '#6b7280';
  return (
    <div className="flex-1 ns-glass rounded-xl p-3 border" style={{ borderColor:`${color}30` }}>
      <div className="flex items-center gap-1.5 mb-2">
        {side==='client' ? <Monitor size={13} className="text-blue-400"/> : <Server size={13} className="text-emerald-400"/>}
        <span className="text-[9px] font-black font-mono" style={{ color: side==='client'?'#93c5fd':'#6ee7b7' }}>{side.toUpperCase()}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={state} initial={{ scale:0.85, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.85, opacity:0 }}
          className="rounded-lg px-3 py-2 text-center border" style={{ background:`${color}15`, borderColor:`${color}40` }}>
          <div className="text-[7px] font-mono text-gray-500 mb-0.5">TCP STATE</div>
          <div className="text-xs font-black font-mono" style={{ color }}>{state}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function TCPHandshake() {
  const [mode, setMode] = useState('connect'); // 'connect' | 'close'
  const [step, setStep] = useState(0);

  const steps = mode==='connect' ? CONNECT_STEPS : CLOSE_STEPS;
  const cur = steps[step];

  const switchMode = (m) => { setMode(m); setStep(0); };

  return (
    <div className="flex flex-col gap-3">
      {/* Mode selector */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(55,65,81,0.3)' }}>
        {[['connect','🤝 3-Way Handshake'],['close','🔚 4-Way Termination']].map(([m,label]) => (
          <button key={m} onClick={() => switchMode(m)} className="flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
            style={{ background:mode===m?'rgba(168,85,247,0.2)':'transparent', color:mode===m?'#c084fc':'#6b7280', border:mode===m?'1px solid rgba(168,85,247,0.35)':'1px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {/* State boxes */}
      <div className="flex gap-3">
        <StateBox label="CLIENT" state={cur.c} side="client"/>
        <StateBox label="SERVER" state={cur.s} side="server"/>
      </div>

      {/* Arrow */}
      <div className="ns-glass rounded-xl p-3 border border-white/5 min-h-[52px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div key={`${mode}-${step}`} className="w-full" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <Arrow arrow={cur.arrow}/>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Detail */}
      <AnimatePresence mode="wait">
        <motion.div key={`detail-${mode}-${step}`} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
          className="ns-glass rounded-xl p-3 border border-white/5">
          <div className="text-[11px] font-bold text-white mb-1">{cur.label}</div>
          <div className="text-[9px] font-mono text-gray-400 leading-relaxed">{cur.detail}</div>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex items-center gap-1">
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            <button onClick={() => setStep(i)} className="w-6 h-6 rounded-full border-2 text-[8px] font-black transition-all flex items-center justify-center"
              style={{ background:i<=step?'rgba(168,85,247,0.3)':'rgba(0,0,0,0.3)', borderColor:i===step?'#a855f7':i<step?'#7c3aed':'rgba(255,255,255,0.1)', color:i<=step?'#c084fc':'#4b5563' }}>
              {i+1}
            </button>
            {i<steps.length-1 && <div className="flex-1 h-px" style={{ background:i<step?'rgba(168,85,247,0.4)':'rgba(255,255,255,0.08)' }}/>}
          </React.Fragment>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button onClick={() => setStep(0)} className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/10"><RotateCcw size={13}/></button>
        <button disabled={step===0} onClick={() => setStep(s=>s-1)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono font-bold text-gray-400 disabled:opacity-30">← Prev</button>
        <button disabled={step===steps.length-1} onClick={() => setStep(s=>s+1)} className="flex-1 py-2 rounded-xl text-[11px] font-mono font-bold disabled:opacity-30 transition-all"
          style={{ background:'rgba(168,85,247,0.2)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.4)' }}>
          Next →
        </button>
      </div>

      {/* Callout */}
      {mode==='close' && (
        <div className="ns-glass-purple rounded-xl p-3">
          <div className="text-[9px] font-mono text-purple-300 leading-relaxed">
            <strong className="text-purple-200">💡 TIME_WAIT:</strong> The 2×MSL (~4 minute) wait prevents stale packets from a previous connection being misinterpreted by a new one on the same port. This is why rapid server restarts need <code className="text-purple-400">SO_REUSEADDR</code>.
          </div>
        </div>
      )}
    </div>
  );
}
