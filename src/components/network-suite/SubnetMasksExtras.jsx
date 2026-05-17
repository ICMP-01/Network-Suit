import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Map, Star, GitCompare, Layers } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════════
// 1. Interactive Bit Grid
// ══════════════════════════════════════════════════════════════════════════════
export function InteractiveBitGrid({ prefix, setPrefix, info }) {
  const maskBin = (prefix === 0 ? 0 : (0xffffffff << (32-prefix)) >>> 0).toString(2).padStart(32,'0');
  const bits = maskBin.split('');

  const handleBitClick = (idx) => {
    // If clicking a bit, the prefix becomes idx + 1 (since index is 0-based and prefix is 1-based count)
    // E.g., clicking bit index 0 makes prefix 1. Clicking bit index 23 makes prefix 24.
    // If the bit clicked is already the boundary (idx === prefix - 1), maybe toggle it back one.
    if (idx === prefix - 1) {
      setPrefix(idx);
    } else {
      setPrefix(idx + 1);
    }
  };

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-orange-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-orange-400" />
          <span className="text-[10px] font-black font-mono uppercase tracking-widest text-orange-400">Interactive Bit Grid</span>
        </div>
        <span className="text-[8px] font-mono text-gray-500">Click any bit to slide the boundary</span>
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {[0,8,16,24].map(start => (
          <div key={start} className="flex flex-col items-center">
            <div className="flex gap-px">
              {bits.slice(start,start+8).map((b,i) => {
                const idx = start + i;
                return (
                  <motion.button 
                    key={idx}
                    onClick={() => handleBitClick(idx)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center text-[10px] sm:text-xs font-black font-mono transition-colors"
                    style={{
                      background: b==='1' ? 'rgba(249,115,22,0.25)' : 'rgba(34,197,94,0.15)',
                      border:`1px solid ${b==='1'?'rgba(249,115,22,0.5)':'rgba(34,197,94,0.3)'}`,
                      color: b==='1' ? '#fb923c' : '#4ade80',
                      boxShadow: b==='1' ? '0 0 8px rgba(249,115,22,0.2)' : 'none'
                    }}>
                    {b}
                  </motion.button>
                );
              })}
            </div>
            <div className="text-[10px] font-mono text-gray-400 mt-2 font-bold">
              {parseInt(maskBin.slice(start,start+8),2)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-[10px] font-mono mt-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(249,115,22,0.1)'}}>
          <span className="w-2.5 h-2.5 rounded-sm" style={{background:'#f97316'}}/>
          <span className="text-orange-300">Network bits ({prefix})</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(34,197,94,0.1)'}}>
          <span className="w-2.5 h-2.5 rounded-sm" style={{background:'#22c55e'}}/>
          <span className="text-green-300">Host bits ({info.hostBits})</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Reverse Calculator
// ══════════════════════════════════════════════════════════════════════════════
export function ReverseCalculator({ setPrefix }) {
  const [targetHosts, setTargetHosts] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const num = parseInt(targetHosts, 10);
    if (isNaN(num) || num < 0) {
      setResult({ error: 'Please enter a valid number of hosts.' });
      return;
    }
    
    // For 0 hosts, /32 is best. For 1 host, /32. For 2 hosts, /31 is used (RFC 3021) or /30.
    if (num === 0 || num === 1) {
      setResult({ prefix: 32, usable: 1, waste: 1 - num });
      return;
    }
    if (num === 2) {
      setResult({ prefix: 31, usable: 2, waste: 0, note: '/31 is point-to-point (RFC 3021). Alternatively use /30.' });
      return;
    }

    const hostBits = Math.ceil(Math.log2(num + 2));
    if (hostBits > 32) {
      setResult({ error: 'Exceeds maximum IPv4 addresses.' });
      return;
    }

    const prefix = 32 - hostBits;
    const usable = Math.pow(2, hostBits) - 2;
    setResult({ prefix, usable, waste: usable - num });
  };

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-cyan-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={14} className="text-cyan-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-cyan-400">Reverse Calculator</span>
      </div>
      <p className="text-[10px] font-mono text-gray-400 mb-3">Don't know the prefix? Tell us how many hosts you need.</p>

      <div className="flex gap-2">
        <input 
          type="number" 
          value={targetHosts} 
          onChange={e=>setTargetHosts(e.target.value)} 
          onKeyDown={e=>e.key==='Enter'&&calculate()}
          placeholder="e.g. 200"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
          style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(6,182,212,0.3)'}} 
        />
        <button onClick={calculate} className="px-5 py-2.5 rounded-xl text-xs font-black font-mono transition-all hover:brightness-125"
          style={{background:'rgba(6,182,212,0.2)', color:'#67e8f9', border:'1px solid rgba(6,182,212,0.4)'}}>
          Calculate
        </button>
      </div>

      {result && !result.error && (
        <div className="mt-4 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)'}}>
          <div>
            <div className="text-[10px] font-mono text-gray-400">Optimal Prefix: <span className="text-xl font-black text-cyan-300 ml-1">/{result.prefix}</span></div>
            <div className="text-[9px] font-mono text-gray-500 mt-1">
              Provides <span className="text-green-400 font-bold">{result.usable}</span> usable hosts ({result.waste} wasted).
              {result.note && <span className="text-amber-400 block mt-1">{result.note}</span>}
            </div>
          </div>
          <button onClick={() => setPrefix(result.prefix)} className="px-4 py-2 rounded-lg text-[9px] font-black font-mono transition-all hover:scale-105"
            style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)'}}>
            Apply /{result.prefix}
          </button>
        </div>
      )}
      {result && result.error && (
        <div className="mt-4 p-3 rounded-lg text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20">
          {result.error}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. Special Masks Explainer
// ══════════════════════════════════════════════════════════════════════════════
export function SpecialMasksExplainer() {
  const cases = [
    { prefix: 32, name: 'Host Route', mask: '255.255.255.255', desc: 'Identifies a single exact host. Used extensively for router Loopback interfaces (always up), BGP Next-Hops, and fine-grained ACL entries.' },
    { prefix: 31, name: 'P2P Link (RFC 3021)', mask: '255.255.255.254', desc: 'Modern standard for Point-to-Point WAN links. Reuses the network and broadcast addresses as host addresses, eliminating waste entirely.' },
    { prefix: 30, name: 'Traditional WAN', mask: '255.255.255.252', desc: 'The old way to address P2P links. Provides 4 addresses: 1 network, 2 host, 1 broadcast. Wastes 50% of the block.' },
    { prefix: 0,  name: 'Default Route', mask: '0.0.0.0', desc: '"Gateway of last resort". Matches every IP address not specifically matched by a longer (more specific) prefix in the routing table.' }
  ];

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Star size={14} className="text-purple-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-purple-400">Special Cases Explained</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cases.map(c => (
          <div key={c.prefix} className="rounded-xl p-4 transition-all hover:-translate-y-1" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-black font-mono text-purple-300">/{c.prefix}</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{background:'rgba(168,85,247,0.1)', color:'#c084fc'}}>{c.name}</span>
            </div>
            <div className="text-[10px] font-mono text-gray-500 mb-2">{c.mask}</div>
            <div className="text-[9px] font-mono text-gray-400 leading-relaxed">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. Mask Use-Case Map
// ══════════════════════════════════════════════════════════════════════════════
export function MaskUseCaseMap() {
  const ranges = [
    { p: '/8',   name: 'ISP Backbone', count: '16.7M', color: '#ec4899', width: '20%' },
    { p: '/16',  name: 'Campus / Cloud VPC', count: '65K', color: '#8b5cf6', width: '25%' },
    { p: '/24',  name: 'Enterprise LAN', count: '254', color: '#3b82f6', width: '30%' },
    { p: '/28',  name: 'App DMZ', count: '14', color: '#10b981', width: '15%' },
    { p: '/31',  name: 'WAN', count: '2', color: '#f59e0b', width: '10%' },
  ];

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-rose-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Map size={14} className="text-rose-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-rose-400">Prefix Deployment Map</span>
      </div>
      
      <div className="flex h-12 w-full rounded-lg overflow-hidden mb-4 border border-white/10" style={{background:'rgba(0,0,0,0.3)'}}>
        {ranges.map(r => (
          <div key={r.p} className="h-full flex flex-col justify-center items-center relative group border-r border-black/40 last:border-r-0"
               style={{width: r.width, background:`${r.color}30`}}>
            <span className="text-[10px] font-black font-mono" style={{color:r.color}}>{r.p}</span>
            
            {/* Tooltip */}
            <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 p-2 rounded-lg pointer-events-none"
                 style={{background:'rgba(0,0,0,0.9)', border:`1px solid ${r.color}`}}>
              <div className="text-[10px] font-bold" style={{color:r.color}}>{r.name}</div>
              <div className="text-[8px] font-mono text-gray-400 mt-0.5">{r.count} usable hosts</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] font-mono text-gray-400 text-center">Hover over the blocks to see typical deployment scenarios and host limits.</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. Mask Binary Comparison
// ══════════════════════════════════════════════════════════════════════════════
export function MaskBinaryComparison() {
  const [pA, setPA] = useState(24);
  const [pB, setPB] = useState(26);

  const binA = (pA === 0 ? 0 : (0xffffffff << (32-pA)) >>> 0).toString(2).padStart(32,'0').split('');
  const binB = (pB === 0 ? 0 : (0xffffffff << (32-pB)) >>> 0).toString(2).padStart(32,'0').split('');

  const borrowStart = Math.min(pA, pB);
  const borrowEnd = Math.max(pA, pB);
  const borrowCount = Math.abs(pA - pB);
  const subnetsGained = Math.pow(2, borrowCount);

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-emerald-500/20">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare size={14} className="text-emerald-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400">Binary Mask Comparison</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-4">Select two prefixes to see the boundary shift. The borrowed bits determine how many subnets are created.</p>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="text-[9px] font-mono text-gray-500 block mb-1">Prefix A</label>
          <select value={pA} onChange={e=>setPA(+e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs font-mono text-white outline-none appearance-none" style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)'}}>
            {[...Array(33)].map((_,i)=><option key={i} value={i}>/{i}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[9px] font-mono text-gray-500 block mb-1">Prefix B</label>
          <select value={pB} onChange={e=>setPB(+e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs font-mono text-white outline-none appearance-none" style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)'}}>
            {[...Array(33)].map((_,i)=><option key={i} value={i}>/{i}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 min-w-max">
          <div className="w-8 text-[10px] font-black font-mono text-gray-400 text-right">/{pA}</div>
          <div className="flex gap-px">
            {binA.map((b,i) => (
              <div key={i} className={`w-4 h-6 sm:w-5 sm:h-6 rounded flex items-center justify-center text-[10px] font-mono ${i % 8 === 7 ? 'mr-1.5' : ''}`}
                style={{
                  background: b==='1' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  color: b==='1' ? '#fff' : '#6b7280'
                }}>{b}</div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-max">
          <div className="w-8 text-[10px] font-black font-mono text-emerald-400 text-right">/{pB}</div>
          <div className="flex gap-px">
            {binB.map((b,i) => {
              const isBorrowed = i >= borrowStart && i < borrowEnd;
              return (
                <div key={i} className={`w-4 h-6 sm:w-5 sm:h-6 rounded flex items-center justify-center text-[10px] font-mono font-black ${i % 8 === 7 ? 'mr-1.5' : ''}`}
                  style={{
                    background: isBorrowed ? 'rgba(16,185,129,0.3)' : (b==='1' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'),
                    color: isBorrowed ? '#34d399' : (b==='1' ? '#fff' : '#6b7280'),
                    border: isBorrowed ? '1px solid rgba(16,185,129,0.5)' : 'none'
                  }}>{b}</div>
              );
            })}
          </div>
        </div>
      </div>

      {borrowCount > 0 && (
        <div className="mt-4 p-3 rounded-xl flex items-center gap-3 text-[10px] font-mono text-emerald-300" style={{background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)'}}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-black shrink-0" style={{background:'rgba(16,185,129,0.2)'}}>
            {borrowCount}
          </div>
          <div>
            Borrowing <strong>{borrowCount}</strong> bits creates <strong>{subnetsGained.toLocaleString()}</strong> subnets.<br/>
            <span className="text-[8px] text-gray-400 mt-1 block">Formula: 2^{borrowCount} = {subnetsGained}</span>
          </div>
        </div>
      )}
    </div>
  );
}
