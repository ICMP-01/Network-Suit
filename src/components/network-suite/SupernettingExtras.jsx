import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Activity, AlertTriangle, GitBranch, Terminal } from 'lucide-react';

function ipToInt(ip) {
  return ip.split('.').reduce((a,b) => (a<<8)|parseInt(b,10), 0) >>> 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Step-by-Step Binary Walkthrough
// ══════════════════════════════════════════════════════════════════════════════
export function BinaryWalkthrough({ result }) {
  if (!result || !result.sorted.length) return null;

  const lcp = result.prefix;

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-cyan-500/20 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} className="text-cyan-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-cyan-400">Binary Prefix Matching</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-4">The router compares the binary representation of all networks to find the longest common prefix. The bit where they first diverge determines the new aggregate boundary.</p>

      <div className="space-y-1.5 min-w-max pb-2">
        {result.sorted.map((s, idx) => {
          const binStr = ipToInt(s.ip).toString(2).padStart(32, '0');
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-24 text-[10px] font-bold text-gray-300 text-right">{s.ip}</div>
              <div className="flex gap-px">
                {binStr.split('').map((b, i) => (
                  <div key={i} className={`w-4 h-5 sm:w-5 sm:h-6 flex items-center justify-center text-[10px] font-mono font-black rounded ${i % 8 === 7 ? 'mr-1.5' : ''}`}
                    style={{
                      background: i < lcp ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                      color: i < lcp ? '#67e8f9' : (i === lcp ? '#ef4444' : '#6b7280'),
                      border: i === lcp ? '1px solid rgba(239,68,68,0.5)' : 'none'
                    }}>
                    {b}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-cyan-500/20">
          <div className="w-24 text-[10px] font-black text-cyan-400 text-right">Aggregate</div>
          <div className="flex gap-px relative">
            {ipToInt(result.network).toString(2).padStart(32, '0').split('').map((b, i) => (
              <div key={i} className={`w-4 h-5 sm:w-5 sm:h-6 flex items-center justify-center text-[10px] font-mono font-black rounded ${i % 8 === 7 ? 'mr-1.5' : ''}`}
                style={{
                  background: i < lcp ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.02)',
                  color: i < lcp ? '#cffafe' : '#334155',
                }}>
                {i < lcp ? b : '0'}
              </div>
            ))}
            
            {/* LCP indicator line */}
            <div className="absolute top-full mt-2 flex flex-col items-center" style={{ left: `${(lcp * 21) + Math.floor(lcp/8)*6 - 10}px` }}>
              <div className="w-px h-4 bg-cyan-500 mb-1" />
              <div className="text-[9px] font-bold text-cyan-400 whitespace-nowrap bg-cyan-500/20 px-2 py-0.5 rounded">Boundary: /{lcp}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10 text-[9px] font-mono text-gray-500 flex gap-4">
        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-cyan-500/40 rounded-sm"/> Common Bits (Network)</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 border border-red-500 rounded-sm"/> Divergence Bit</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. "Can I Aggregate?" Validator
// ══════════════════════════════════════════════════════════════════════════════
export function AggregateValidator({ result, inputs }) {
  if (!result || !inputs.length) return null;

  const validCount = Math.log2(inputs.length) % 1 === 0;
  const isAligned = (result.sorted[0].int % result.blockSize) === 0;
  const isContiguous = result.waste === 0;
  const samePrefixes = result.sorted.every(s => s.prefix === result.sorted[0].prefix);

  let verdict = 'Perfect';
  let color = '#22c55e';
  let desc = 'These networks aggregate perfectly with 100% efficiency. No wasted space, proper alignment, and power-of-2 count.';

  if (!isContiguous) {
    verdict = 'Imperfect (Leaky)';
    color = '#f97316';
    desc = 'The aggregate covers space that you did not input. This is dangerous unless you actually own the missing subnets.';
  } else if (!isAligned) {
    verdict = 'Unaligned Boundary';
    color = '#ef4444';
    desc = 'The networks are contiguous, but do not start on a valid block boundary. You cannot summarize them cleanly into one route.';
  } else if (!validCount && !samePrefixes) {
    verdict = 'Mixed Prefixes';
    color = '#a855f7';
    desc = 'The aggregate is efficient, but the inputs use mixed prefix lengths (VLSM block).';
  }

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-white/10" style={{borderColor: `${color}30`}}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{color}} />
          <span className="text-[10px] font-black font-mono uppercase tracking-widest" style={{color}}>Aggregation Validator: {verdict}</span>
        </div>
      </div>
      <p className="text-[10px] font-mono text-gray-300 mb-4">{desc}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Contiguous Block', pass: isContiguous },
          { label: 'Proper Alignment', pass: isAligned },
          { label: 'Power of 2 Count', pass: validCount },
          { label: 'Uniform Prefixes', pass: samePrefixes }
        ].map(r => (
          <div key={r.label} className="p-3 rounded-lg flex flex-col items-center justify-center text-center ns-glass"
               style={{ border: `1px solid ${r.pass ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div className="text-xl mb-1">{r.pass ? '✅' : '❌'}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400">{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. Hierarchical Summarization
// ══════════════════════════════════════════════════════════════════════════════
export function HierarchicalSummarization() {
  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch size={14} className="text-purple-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-purple-400">Multi-Level Hierarchical Summarization</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-6">In large enterprise networks, summarization happens at multiple tiers to minimize the routing table at the core.</p>

      <div className="flex flex-col items-center">
        {/* Core */}
        <div className="px-4 py-2 rounded-xl text-xs font-black font-mono shadow-lg mb-0 z-10" style={{background:'rgba(168,85,247,0.2)', color:'#d8b4fe', border:'1px solid rgba(168,85,247,0.4)'}}>
          Core Router (Receives 10.0.0.0/8)
        </div>
        <div className="w-px h-6 bg-purple-500/50" />
        <div className="w-[80%] h-px bg-purple-500/50" />
        
        {/* Regions */}
        <div className="flex justify-between w-[80%]">
          <div className="w-px h-6 bg-purple-500/50" />
          <div className="w-px h-6 bg-purple-500/50" />
        </div>

        <div className="flex justify-between w-full max-w-2xl px-8">
          <div className="flex flex-col items-center">
            <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono z-10" style={{background:'rgba(59,130,246,0.2)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.4)'}}>
              US Region ABR: 10.1.0.0/16
            </div>
            <div className="w-px h-6 bg-blue-500/50" />
            <div className="w-[120px] h-px bg-blue-500/50" />
            <div className="flex justify-between w-[120px]">
              <div className="w-px h-6 bg-blue-500/50" />
              <div className="w-px h-6 bg-blue-500/50" />
            </div>
            <div className="flex gap-4">
              <div className="px-2 py-1 rounded text-[8px] font-mono bg-white/5 border border-white/10 text-gray-300">NY: 10.1.1.0/24</div>
              <div className="px-2 py-1 rounded text-[8px] font-mono bg-white/5 border border-white/10 text-gray-300">SF: 10.1.2.0/24</div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono z-10" style={{background:'rgba(34,197,94,0.2)', color:'#86efac', border:'1px solid rgba(34,197,94,0.4)'}}>
              EU Region ABR: 10.2.0.0/16
            </div>
            <div className="w-px h-6 bg-green-500/50" />
            <div className="w-[120px] h-px bg-green-500/50" />
            <div className="flex justify-between w-[120px]">
              <div className="w-px h-6 bg-green-500/50" />
              <div className="w-px h-6 bg-green-500/50" />
            </div>
            <div className="flex gap-4">
              <div className="px-2 py-1 rounded text-[8px] font-mono bg-white/5 border border-white/10 text-gray-300">LON: 10.2.1.0/24</div>
              <div className="px-2 py-1 rounded text-[8px] font-mono bg-white/5 border border-white/10 text-gray-300">PAR: 10.2.2.0/24</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
