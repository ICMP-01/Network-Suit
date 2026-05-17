import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Monitor, Server } from 'lucide-react';

const PROTOCOLS = {
  HTTP:  { color:'#3b82f6', port:80,  appHeader:'GET / HTTP/1.1\nHost: example.com', tls:false, icon:'🌐' },
  HTTPS: { color:'#10b981', port:443, appHeader:'GET / HTTP/1.1\nHost: example.com\n[TLS encrypted]', tls:true, icon:'🔒' },
  DNS:   { color:'#f59e0b', port:53,  appHeader:'Query: A example.com', tls:false, icon:'📖', udp:true },
  SSH:   { color:'#a855f7', port:22,  appHeader:'SSH-2.0-OpenSSH_8.9\n[Encrypted channel]', tls:true, icon:'🔐' },
};

const LAYERS = [
  { num:7, name:'Application',  color:'#10b981', icon:'📱' },
  { num:6, name:'Presentation', color:'#3b82f6', icon:'🔐' },
  { num:5, name:'Session',      color:'#8b5cf6', icon:'🤝' },
  { num:4, name:'Transport',    color:'#a855f7', icon:'📦' },
  { num:3, name:'Network',      color:'#06b6d4', icon:'🌐' },
  { num:2, name:'Data Link',    color:'#f59e0b', icon:'🔗' },
  { num:1, name:'Physical',     color:'#ef4444', icon:'⚡' },
];

const TOTAL = 15;

function getStepLabel(step, proto) {
  const p = PROTOCOLS[proto];
  const labels = [
    `L7 Application — ${proto} request created (port ${p.port})`,
    p.tls ? 'L6 Presentation — TLS 1.3 encrypts payload' : 'L6 Presentation — No encryption (plaintext)',
    'L5 Session — Socket session ID attached',
    `L4 Transport — ${p.udp?'UDP':'TCP'} header added (src port ${30000+Math.floor(Math.random()*5000)}, dst ${p.port})`,
    'L3 Network — IPv4 header: TTL=64, src/dst IP assigned',
    'L2 Data Link — Ethernet frame: dst MAC via ARP, FCS appended',
    'L1 Physical — Frame encoded as electrical/optical signals',
    `⚡ ${proto} ${p.udp?'datagram':'segment'} traveling on the wire at ~speed of light`,
    'L1 Physical — NIC receives electrical signals, decodes bits',
    'L2 Data Link — FCS validated, dst MAC matches → accepted',
    'L3 Network — TTL decremented, routing table checked',
    `L4 Transport — ${p.udp?'UDP port':'TCP seq#'} verified, ${p.udp?'passed up':'ACK queued'}`,
    'L5 Session — Matched to open session socket',
    p.tls ? 'L6 Presentation — TLS decrypts with session keys' : 'L6 Presentation — Raw bytes passed up',
    `L7 Application — ${proto} response processed ✅`,
  ];
  return labels[step];
}

function getHeaderDetail(layerIdx, step, proto) {
  const p = PROTOCOLS[proto];
  const details = {
    0: `${p.appHeader}`,
    1: p.tls ? 'ContentType: 23\nVersion: TLS 1.3\nRecord Length: varies' : 'No TLS wrapper',
    2: p.tls ? `SessionID: ${Math.random().toString(16).slice(2,10).toUpperCase()}` : 'No session layer data',
    3: p.udp
      ? `UDP: src=${30000+Math.floor(Math.random()*999)} dst=${p.port}\nLength: varies, Checksum: computed`
      : `TCP: src=${30000+Math.floor(Math.random()*999)} dst=${p.port}\nSeq=ISN Flags=SYN/PSH/ACK`,
    4: 'IP: Ver=4 IHL=5 TTL=64\nProto=' + (p.udp?'17(UDP)':'6(TCP)') + '\nSrc=192.168.1.x Dst=93.184.216.34',
    5: 'EtherType=0x0800\nDst: Gateway MAC\nSrc: Host MAC\nFCS: CRC-32',
    6: '10110100 11001010 01101011...\n(Manchester/NRZ encoding)',
  };
  return details[layerIdx] || '';
}

function EncapStack({ step, side, proto }) {
  let wrapped = 0;
  if (side === 'client') wrapped = step > 6 ? 7 : step;
  else {
    if (step < 8) return null;
    wrapped = Math.max(0, 7 - (step - 8));
  }

  return (
    <div className="w-full flex flex-col gap-0.5 text-[9px] font-mono">
      {LAYERS.map((layer, idx) => {
        const isActive = side==='client' ? idx===step : idx===(14-step);
        const isWrapped = idx < wrapped;
        return (
          <motion.div key={layer.num} layout animate={{ opacity: isWrapped||isActive ? 1 : 0.18, scale: isActive ? 1.02 : 1 }}
            transition={{ duration: 0.35 }}
            className="rounded px-2 py-1 flex items-center gap-2 cursor-default"
            style={{
              background: isActive ? `${layer.color}25` : isWrapped ? `${layer.color}0a` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isActive ? layer.color : isWrapped ? `${layer.color}35` : 'rgba(255,255,255,0.05)'}`,
              boxShadow: isActive ? `0 0 14px ${layer.color}50` : 'none',
            }}>
            <span className="font-black w-7 shrink-0" style={{ color: layer.color }}>L{layer.num}</span>
            <span>{layer.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{layer.name}</div>
              {isActive && (
                <div className="text-gray-400 leading-tight whitespace-pre-line text-[7px] mt-0.5 truncate" title={getHeaderDetail(idx, step, proto)}>
                  {getHeaderDetail(idx, step, proto).split('\n')[0]}
                </div>
              )}
            </div>
            {isActive && <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:0.9 }} className="w-2 h-2 rounded-full shrink-0" style={{ background: layer.color }} />}
          </motion.div>
        );
      })}
      <div className="rounded px-2 py-1 mt-0.5 text-center font-bold" style={{ background:'rgba(16,185,129,0.2)', border:'1px solid rgba(16,185,129,0.4)', color:'#34d399' }}>
        📄 {proto} PAYLOAD
      </div>
    </div>
  );
}

export default function PacketJourney() {
  const [step, setStep] = useState(0);
  const [proto, setProto] = useState('HTTPS');
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setStep(s => { if (s >= TOTAL-1) { setPlaying(false); return s; } return s+1; });
      }, 950);
    }
    return () => clearInterval(timerRef.current);
  }, [playing]);

  const reset = () => { setStep(0); setPlaying(false); };
  const phase = step < 7 ? 'encap' : step === 7 ? 'wire' : 'decap';
  const progress = Math.round((step/(TOTAL-1))*100);
  const p = PROTOCOLS[proto];

  return (
    <div className="flex flex-col gap-3">
      {/* Protocol selector */}
      <div className="ns-glass rounded-2xl p-3 border border-purple-500/20">
        <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">Protocol Simulation</div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PROTOCOLS).map(([key, val]) => (
            <button key={key} onClick={() => { setProto(key); reset(); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black font-mono transition-all"
              style={{ background: proto===key ? `${val.color}25` : 'rgba(255,255,255,0.04)', border:`1px solid ${proto===key ? val.color : 'rgba(255,255,255,0.1)'}`, color: proto===key ? val.color : '#6b7280' }}>
              {val.icon} {key}
            </button>
          ))}
        </div>
      </div>

      {/* Controls + progress */}
      <div className="ns-glass rounded-2xl p-3 border border-purple-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-black font-mono text-purple-300">Packet Journey — Step {step+1}/{TOTAL}</div>
          <div className="flex gap-2">
            <button onClick={reset} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/10"><RotateCcw size={12}/></button>
            <button onClick={() => setPlaying(p => !p)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all"
              style={{ background:'rgba(168,85,247,0.2)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.4)' }}>
              {playing ? <><Pause size={11}/> Pause</> : <><Play size={11}/> Play</>}
            </button>
            <button onClick={() => setStep(s => Math.min(TOTAL-1,s+1))} disabled={step===TOTAL-1}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-gray-300 disabled:opacity-30">
              Next →
            </button>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
          <motion.div className="h-full rounded-full" animate={{ width:`${progress}%` }} style={{ background:`linear-gradient(90deg, ${p.color}, #06b6d4)` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-5 }}
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg text-center"
            style={{ background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.2)', color:'#d8b4fe' }}>
            {getStepLabel(step, proto)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main visual */}
      <div className="grid grid-cols-3 gap-2">
        <div className="ns-glass rounded-2xl p-3 border border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-2"><Monitor size={13} className="text-blue-400"/><span className="text-[10px] font-black font-mono text-blue-300">CLIENT</span>
            {phase==='encap' && <span className="text-[7px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/30 ml-auto">↓ SENDING</span>}
          </div>
          {phase !== 'wire' && phase !== 'decap' ? <EncapStack step={step} side="client" proto={proto}/> : <div className="h-28 flex items-center justify-center text-[9px] font-mono text-gray-600 text-center">Sent ✓</div>}
        </div>

        <div className="ns-glass rounded-2xl p-3 border border-amber-500/20 flex flex-col items-center justify-center min-h-[180px]">
          <div className="text-[8px] font-mono text-amber-400 mb-2 font-black uppercase tracking-widest">WIRE / NETWORK</div>
          <AnimatePresence>
            {phase==='wire' && (
              <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} className="flex flex-col items-center gap-2">
                <motion.div animate={{ y:[0,-10,0] }} transition={{ repeat:Infinity, duration:1 }} className="text-2xl">📦</motion.div>
                <div className="text-[8px] font-mono text-amber-300 text-center">{p.udp?'UDP datagram':'TCP segment'}<br/>~speed of light</div>
              </motion.div>
            )}
          </AnimatePresence>
          {phase!=='wire' && <div className="text-[8px] font-mono text-gray-600">{phase==='encap'?'Waiting...':'Delivered ✓'}</div>}
          <div className="w-full h-px mt-3 relative overflow-hidden" style={{ background:'rgba(245,158,11,0.15)' }}>
            {phase==='wire' && <motion.div className="absolute h-full w-8 rounded" animate={{ x:['-100%','200%'] }} transition={{ repeat:Infinity, duration:0.7 }} style={{ background:'linear-gradient(90deg,transparent,#f59e0b,transparent)' }}/>}
          </div>
        </div>

        <div className="ns-glass rounded-2xl p-3 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-2"><Server size={13} className="text-emerald-400"/><span className="text-[10px] font-black font-mono text-emerald-300">SERVER</span>
            {phase==='decap' && <span className="text-[7px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30 ml-auto">↑ RECV</span>}
          </div>
          {(phase==='decap') ? <EncapStack step={step} side="server" proto={proto}/> : <div className="h-28 flex items-center justify-center text-[9px] font-mono text-gray-600 text-center">Awaiting...</div>}
        </div>
      </div>

      {/* Layer colour key */}
      <div className="ns-glass rounded-xl p-2.5 border border-white/5 flex flex-wrap gap-x-4 gap-y-1">
        {LAYERS.map(l => (
          <div key={l.num} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background:l.color }}/>
            <span className="text-[8px] font-mono text-gray-500">L{l.num} {l.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
