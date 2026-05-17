import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Send, CheckCircle, AlertTriangle } from 'lucide-react';

// Slow-start + AIMD congestion control phases
const PHASES = {
  slowstart:   { label:'Slow Start',        color:'#10b981', desc:'Window doubles every RTT (exponential growth).' },
  avoidance:   { label:'Congestion Avoid',  color:'#3b82f6', desc:'Window grows by 1 MSS per RTT (linear growth).' },
  recovery:    { label:'Fast Recovery',     color:'#f59e0b', desc:'3 dup-ACKs: halve ssthresh, retransmit.' },
  timeout:     { label:'Timeout',           color:'#ef4444', desc:'Loss detected: reset cwnd=1, ssthresh halved.' },
};

const MAX_PKTS = 14;

function PacketBox({ id, state }) {
  const styles = {
    acked:    { bg:'rgba(16,185,129,0.15)', border:'#10b981', text:'#34d399' },
    inflight: { bg:'rgba(168,85,247,0.25)', border:'#a855f7', text:'#c084fc' },
    window:   { bg:'rgba(6,182,212,0.15)',  border:'#06b6d4', text:'#67e8f9' },
    unsent:   { bg:'rgba(255,255,255,0.03)',border:'rgba(255,255,255,0.1)', text:'#374151' },
    dropped:  { bg:'rgba(239,68,68,0.15)',  border:'#ef4444', text:'#f87171' },
  };
  const s = styles[state] || styles.unsent;
  return (
    <motion.div layout initial={{ scale:0.7, opacity:0 }} animate={{ scale:1, opacity:1, boxShadow: state==='inflight'?`0 0 10px ${s.border}60`:'none' }}
      transition={{ duration:0.25 }}
      className="w-9 h-9 rounded-lg flex flex-col items-center justify-center border relative shrink-0"
      style={{ background:s.bg, borderColor:s.border }}>
      <span className="text-[9px] font-black font-mono" style={{ color:s.text }}>{id}</span>
      {state==='acked'   && <CheckCircle size={7} className="absolute -top-1 -right-1 text-emerald-400"/>}
      {state==='dropped' && <AlertTriangle size={7} className="absolute -top-1 -right-1 text-red-400"/>}
      {state==='inflight' && <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:0.8 }} className="absolute inset-0 rounded-lg border" style={{ borderColor:s.border }}/>}
    </motion.div>
  );
}

export default function TCPWindowSim() {
  const [mode, setMode]     = useState('manual');   // 'manual' | 'auto' | 'congestion'
  const [winSize, setWinSize] = useState(4);
  const [sendBase, setSendBase] = useState(0);
  const [nextSeq, setNextSeq]   = useState(0);
  const [acked, setAcked]       = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [log, setLog]           = useState([]);
  // Congestion control state
  const [cwnd, setCwnd]       = useState(1);
  const [ssthresh, setSsthresh] = useState(8);
  const [phase, setPhase]     = useState('slowstart');
  const [rtt, setRtt]         = useState(0);
  const timerRef = useRef(null);

  const addLog = (msg, color='#9ca3af') => setLog(l=>[{msg,color,t:Date.now()},...l].slice(0,8));

  const effectiveWin = mode==='congestion' ? Math.min(cwnd, MAX_PKTS) : winSize;

  const reset = () => {
    setPlaying(false); setSendBase(0); setNextSeq(0); setAcked(0); setLog([]);
    setCwnd(1); setSsthresh(8); setPhase('slowstart'); setRtt(0);
  };

  useEffect(() => {
    if (!playing) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setNextSeq(ns => {
        const win = mode==='congestion' ? Math.min(cwnd, MAX_PKTS) : winSize;
        if (ns < sendBase + win && ns < MAX_PKTS) {
          addLog(`→ Sent #${ns+1}`, '#c084fc'); return ns+1;
        }
        setSendBase(sb => {
          if (sb < ns) {
            addLog(`✓ ACK #${sb+1}`, '#34d399');
            setAcked(a=>a+1);
            if (mode==='congestion') {
              setRtt(r => {
                const newRtt = r+1;
                setCwnd(c => {
                  if (phase==='slowstart') { const nc=c*2; if(nc>=ssthresh){setPhase('avoidance');} return Math.min(nc,MAX_PKTS); }
                  return Math.min(c+1,MAX_PKTS);
                });
                return newRtt;
              });
            }
            return sb+1;
          }
          return sb;
        });
        return ns;
      });
    }, mode==='congestion' ? 500 : 550);
    return () => clearInterval(timerRef.current);
  }, [playing, sendBase, winSize, cwnd, ssthresh, phase, mode]);

  const step = () => {
    const win = mode==='congestion' ? Math.min(cwnd, MAX_PKTS) : winSize;
    if (nextSeq < sendBase + win && nextSeq < MAX_PKTS) {
      addLog(`→ Sent #${nextSeq+1}`, '#c084fc'); setNextSeq(s=>s+1);
    } else if (sendBase < nextSeq) {
      addLog(`✓ ACK #${sendBase+1}`, '#34d399'); setAcked(a=>a+1); setSendBase(s=>s+1);
    }
  };

  const simulateDrop = () => {
    setPhase('timeout');
    const newThresh = Math.max(1, Math.floor(cwnd/2));
    setSsthresh(newThresh); setCwnd(1);
    setSendBase(nextSeq); // reset pipeline
    addLog(`⚠️ Loss! ssthresh=${newThresh}, cwnd reset to 1`, '#f87171');
    setTimeout(()=>setPhase('slowstart'), 600);
  };

  const inFlight = nextSeq - sendBase;
  const pct = Math.round((acked/MAX_PKTS)*100);
  const phaseInfo = PHASES[phase];

  return (
    <div className="flex flex-col gap-3">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(55,65,81,0.3)' }}>
        {[['manual','📐 Manual'],['auto','⚡ Auto'],['congestion','📈 Congestion Ctrl']].map(([m,l])=>(
          <button key={m} onClick={()=>{setMode(m);reset();}} className="flex-1 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all"
            style={{ background:mode===m?'rgba(6,182,212,0.2)':'transparent', color:mode===m?'#67e8f9':'#6b7280', border:mode===m?'1px solid rgba(6,182,212,0.35)':'1px solid transparent' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="ns-glass rounded-2xl p-3 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] font-black font-mono text-cyan-300">TCP Sliding Window</div>
            <div className="text-[8px] font-mono text-gray-500">
              Win={effectiveWin} • In-flight={inFlight} • Acked={acked}/{MAX_PKTS}
              {mode==='congestion' && ` • cwnd=${cwnd} • ssthresh=${ssthresh}`}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400"><RotateCcw size={12}/></button>
            {mode!=='manual' && (
              <button onClick={()=>setPlaying(p=>!p)} disabled={acked>=MAX_PKTS}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono disabled:opacity-30"
                style={{ background:'rgba(6,182,212,0.2)', color:'#67e8f9', border:'1px solid rgba(6,182,212,0.4)' }}>
                {playing ? <><Pause size={11}/> Pause</> : <><Play size={11}/> Auto</>}
              </button>
            )}
            <button onClick={step} disabled={acked>=MAX_PKTS}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono disabled:opacity-30"
              style={{ background:'rgba(168,85,247,0.2)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.4)' }}>
              <Send size={11}/> Step
            </button>
            {mode==='congestion' && (
              <button onClick={simulateDrop} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono"
                style={{ background:'rgba(239,68,68,0.2)', color:'#f87171', border:'1px solid rgba(239,68,68,0.4)' }}>
                <AlertTriangle size={11}/> Drop!
              </button>
            )}
          </div>
        </div>

        {mode!=='congestion' && (
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-mono text-gray-500 shrink-0">Win:</span>
            <input type="range" min={1} max={8} value={winSize} onChange={e=>setWinSize(Number(e.target.value))} className="flex-1 accent-cyan-500"/>
            <span className="text-[10px] font-black font-mono text-cyan-400 w-4">{winSize}</span>
          </div>
        )}

        {mode==='congestion' && (
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 flex-1 h-6 bg-black/30 rounded-full overflow-hidden border border-white/5">
              <motion.div className="h-full rounded-full" animate={{ width:`${(cwnd/MAX_PKTS)*100}%` }}
                style={{ background:`linear-gradient(90deg, ${phaseInfo.color}80, ${phaseInfo.color})` }} transition={{ duration:0.4 }}/>
            </div>
            <div className="text-[9px] font-mono font-bold shrink-0" style={{ color: phaseInfo.color }}>
              {phaseInfo.label}
            </div>
          </div>
        )}
      </div>

      {/* Packet grid */}
      <div className="ns-glass rounded-2xl p-3 border border-purple-500/20">
        <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">Sender Buffer</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Array.from({length:MAX_PKTS},(_,i)=>{
            let state='unsent';
            if(i<sendBase) state='acked';
            else if(i<nextSeq) state='inflight';
            else if(i<sendBase+effectiveWin) state='window';
            return <PacketBox key={i} id={i+1} state={state}/>;
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
          {[['Acked ✓','#10b981','rgba(16,185,129,0.15)'],['In-flight','#a855f7','rgba(168,85,247,0.2)'],['In window','#06b6d4','rgba(6,182,212,0.15)'],['Not sent','#4b5563','rgba(255,255,255,0.03)']].map(([l,c,bg])=>(
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border" style={{ background:bg, borderColor:c }}/>
              <span className="text-[8px] font-mono" style={{ color:c }}>{l}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-[8px] font-mono mb-1">
            <span className="text-gray-500">Throughput</span>
            <span className="font-bold text-cyan-400">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div className="h-full rounded-full" animate={{ width:`${pct}%` }} style={{ background:'linear-gradient(90deg,#06b6d4,#10b981)' }}/>
          </div>
        </div>
      </div>

      {/* Congestion phase info */}
      {mode==='congestion' && (
        <div className="ns-glass rounded-xl p-3 border" style={{ borderColor:`${phaseInfo.color}30` }}>
          <div className="text-[9px] font-mono leading-relaxed" style={{ color: phaseInfo.color }}>
            <strong>{phaseInfo.label}:</strong> {phaseInfo.desc}
          </div>
          <div className="text-[8px] font-mono text-gray-500 mt-1">
            cwnd = {cwnd} MSS • ssthresh = {ssthresh} MSS • RTT count = {rtt}
          </div>
        </div>
      )}

      {/* Log */}
      <div className="ns-glass rounded-xl p-3 border border-white/5">
        <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1.5">Activity</div>
        <div className="space-y-0.5 min-h-[48px]">
          {log.length===0 && <div className="text-[8px] font-mono text-gray-700">Press Step or Auto to begin...</div>}
          {log.map((e,i)=>(
            <motion.div key={e.t} initial={{ opacity:0, x:-8 }} animate={{ opacity:1-i*0.1, x:0 }} className="text-[8px] font-mono" style={{ color:e.color }}>{e.msg}</motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
