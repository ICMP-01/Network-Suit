import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Layers, GitBranch, Terminal } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════════
// 1. Visual Tree View (Dendrogram-style)
// ══════════════════════════════════════════════════════════════════════════════
export function VisualTreeView({ plan, baseNet }) {
  if (!plan || plan.error || !plan.results?.length) return null;

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-indigo-500/20">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch size={14} className="text-indigo-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-indigo-400">Hierarchical Tree View</span>
      </div>

      <div className="flex flex-col items-center">
        {/* Root */}
        <div className="flex flex-col items-center">
          <div className="px-4 py-2 rounded-xl text-xs font-black font-mono shadow-lg" 
            style={{background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)'}}>
            {baseNet} (Parent Block)
          </div>
          <div className="w-px h-6 bg-indigo-500/50"></div>
          
          {/* Horizontal connecting line */}
          <div className="relative w-full max-w-2xl border-t border-indigo-500/50" />
        </div>

        {/* Branches */}
        <div className="flex justify-around w-full max-w-4xl mt-0 pt-0 flex-wrap gap-y-6">
          {plan.results.map((r, i) => (
            <motion.div key={r.name} initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} transition={{delay: i*0.1}}
              className="flex flex-col items-center relative min-w-[120px]">
              
              <div className="w-px h-6 bg-indigo-500/50"></div>
              
              <div className="px-3 py-2 rounded-lg text-center w-full" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)'}}>
                <div className="text-[9px] font-bold text-white truncate max-w-[100px] mx-auto">{r.name}</div>
                <div className="text-[10px] font-black font-mono text-cyan-400 mt-1">{r.network}/{r.prefix}</div>
                <div className="text-[8px] font-mono text-gray-500 mt-1">{r.usable} hosts</div>
                {r.vlan && <div className="text-[7px] font-mono font-bold text-purple-400 mt-1">VLAN {r.vlan}</div>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. IP Utilization Heatmap
// ══════════════════════════════════════════════════════════════════════════════
export function IpUtilizationHeatmap({ plan }) {
  if (!plan || plan.error || !plan.results) return null;

  return (
    <div className="mt-4">
      <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between">
        <span>Address Space Heatmap</span>
        <span>{plan.utilisation}% Allocated</span>
      </div>
      <div className="h-6 w-full rounded-lg overflow-hidden flex" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}}>
        {plan.results.map((r, i) => {
          const pct = (r.subnetSize / plan.total) * 100;
          // Calculate internal waste proportion for this block
          const usablePct = ((r.required + 2) / r.subnetSize) * 100;
          const wastePct = 100 - usablePct;
          
          const colors = ['#06b6d4','#a855f7','#22c55e','#f97316','#eab308','#f43f5e','#3b82f6','#ec4899'];
          const baseColor = colors[i%colors.length];

          return (
            <div key={r.name} className="h-full flex relative group border-r border-black/20" style={{width:`${pct}%`}}>
              {/* Tooltip */}
              <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-2 py-1 rounded text-[8px] font-mono whitespace-nowrap z-10 pointer-events-none">
                <span style={{color:baseColor}}>{r.name}</span>: {r.network}/{r.prefix}<br/>
                Waste: {r.waste} IPs
              </div>
              
              {/* Used Space */}
              <div className="h-full" style={{width:`${usablePct}%`, background:baseColor, opacity:0.8}} />
              {/* Wasted/Headroom Space */}
              <div className="h-full relative overflow-hidden" style={{width:`${wastePct}%`, background:baseColor, opacity:0.3}}>
                <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #000 2px, #000 4px)'}}></div>
              </div>
            </div>
          );
        })}
        {/* Unallocated Space */}
        <div className="h-full flex-1 relative group">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-mono text-gray-400">Available: {plan.total - plan.used}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mt-2 justify-end text-[7px] font-mono text-gray-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-white/60"/> Allocated (Required)</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-white/30" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #000 2px, #000 4px)'}}/> Allocated (Waste/Headroom)</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-white/5"/> Available space</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. Switchport Trunk Config Generator
// ══════════════════════════════════════════════════════════════════════════════
export function TrunkConfigGenerator({ plan }) {
  if (!plan || plan.error || !plan.results) return null;

  const vlans = plan.results.filter(r => r.vlan).map(r => r.vlan).join(',');
  if (!vlans) return null;

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-green-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Terminal size={14} className="text-green-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-green-400">Switchport Trunk Config</span>
      </div>
      
      <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-gray-300 space-y-1">
        <div className="text-green-400/50">! Core Switch Uplink Configuration</div>
        <div>interface GigabitEthernet1/0/1</div>
        <div> description UPLINK-TO-ROUTER</div>
        <div> switchport mode trunk</div>
        <div> switchport trunk allowed vlan <span className="text-white font-bold">{vlans}</span></div>
        <br/>
        <div className="text-green-400/50">! VLAN SVI Creation (Layer 3 Switch)</div>
        {plan.results.filter(r => r.vlan).map(r => (
          <React.Fragment key={r.name}>
            <div>interface Vlan{r.vlan}</div>
            <div> description {r.name.toUpperCase()}</div>
            <div> ip address <span className="text-cyan-300">{r.firstHost}</span> <span className="text-orange-300">{r.mask}</span></div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
