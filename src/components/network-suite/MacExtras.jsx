import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Server, HardDrive, RefreshCw, Zap, Search } from 'lucide-react';

const COMMON_OUIS = {
  '00:00:0C': 'Cisco Systems, Inc',
  '00:01:42': 'Cisco Systems, Inc',
  '00:0A:95': 'Apple, Inc.',
  '00:1A:2B': 'Ayerst',
  '00:14:22': 'Dell Inc.',
  '00:1B:21': 'Intel Corporate',
  '00:50:56': 'VMware, Inc.',
  '08:00:27': 'PCS Systemtechnik (VirtualBox)',
  '52:54:00': 'Realtek (QEMU/KVM)',
  'B8:27:EB': 'Raspberry Pi Foundation',
  'DC:A6:32': 'Raspberry Pi Trading Ltd',
  'E4:5F:01': 'Google LLC',
  'F4:0F:24': 'Apple, Inc.',
  '00:11:32': 'Synology Incorporated',
  'C4:2C:03': 'Apple, Inc.'
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. EUI-64 IPv6 Generator
// ══════════════════════════════════════════════════════════════════════════════
export function Eui64Generator({ macStr }) {
  if (!macStr || macStr.length !== 17) return null;

  const getEui64 = () => {
    const parts = macStr.split(':');
    
    // 1. Insert FF:FE in the middle
    const step1 = [...parts.slice(0,3), 'FF', 'FE', ...parts.slice(3,6)];
    
    // 2. Invert the 7th bit of the first octet (U/L bit)
    let firstByteInt = parseInt(step1[0], 16);
    firstByteInt = firstByteInt ^ 2; // XOR with 00000010
    step1[0] = firstByteInt.toString(16).padStart(2, '0').toUpperCase();

    // 3. Format as IPv6 groups (x:x:x:x)
    const groups = [];
    for(let i=0; i<8; i+=2) {
      groups.push((step1[i] + step1[i+1]).toLowerCase());
    }
    
    // Link-local prefix
    return `fe80::${groups.join(':')}`;
  };

  const eui = getEui64();

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-blue-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} className="text-blue-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-blue-400">EUI-64 IPv6 Link-Local Generation</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-4">IPv6 uses SLAAC to auto-configure addresses. The MAC address is split, FF:FE is inserted in the middle, and the 7th bit (U/L) is inverted.</p>
      
      <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col items-center gap-3 relative">
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded bg-white/5 font-mono text-[11px] text-gray-300">{macStr}</div>
        </div>
        <div className="text-blue-400 text-xs">↓</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono text-gray-500">fe80::</div>
          <div className="px-3 py-1.5 rounded font-mono font-black text-sm text-white" style={{background:'rgba(59,130,246,0.2)', border:'1px solid rgba(59,130,246,0.4)'}}>
            {eui.replace('fe80::','')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. MAC Randomizer
// ══════════════════════════════════════════════════════════════════════════════
export function MacRandomizer({ onGenerate }) {
  const generateRandom = () => {
    // Generate valid unicast, locally administered MAC
    // First byte: format X2, X6, XA, XE ensures it's unicast (bit 0=0) and local (bit 1=1)
    const firstBytes = ['02', '06', '0A', '0E', '12', '16', '1A', '1E'];
    const b0 = firstBytes[Math.floor(Math.random() * firstBytes.length)];
    
    const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    const mac = `${b0}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
    onGenerate(mac);
  };

  return (
    <div className="rounded-xl p-4 ns-glass mt-4 border border-emerald-500/20">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-black font-mono uppercase tracking-widest text-emerald-400 mb-1">Random MAC Generator</div>
          <div className="text-[8px] font-mono text-gray-400">Generates a valid, locally-administered unicast MAC</div>
        </div>
        <button onClick={generateRandom} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono transition-colors hover:bg-emerald-500/20"
                style={{background:'rgba(16,185,129,0.1)', color:'#6ee7b7', border:'1px solid rgba(16,185,129,0.3)'}}>
          <RefreshCw size={10} /> Generate
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. OUI Database Search
// ══════════════════════════════════════════════════════════════════════════════
export function OuiDatabaseSearch() {
  const [query, setQuery] = useState('');

  const results = Object.entries(COMMON_OUIS).filter(([oui, vendor]) => {
    const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!q) return false;
    return vendor.toLowerCase().includes(q) || oui.replace(/:/g,'').toLowerCase().includes(q);
  });

  return (
    <div className="rounded-xl p-4 ns-glass mt-4 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Search size={12} className="text-purple-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-widest text-purple-400">Mini OUI Lookup</span>
      </div>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search vendor (e.g. Apple) or OUI..."
             className="w-full rounded-lg px-3 py-2 text-[10px] font-mono text-white outline-none mb-3"
             style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(168,85,247,0.3)'}} />
      
      {query && (
        <div className="max-h-32 overflow-y-auto space-y-1">
          {results.length > 0 ? results.map(([oui, vendor]) => (
            <div key={oui} className="flex justify-between items-center p-2 rounded bg-black/20 border border-white/5">
              <span className="text-[10px] font-mono font-bold text-cyan-300">{oui}</span>
              <span className="text-[9px] text-gray-300 truncate max-w-[150px]">{vendor}</span>
            </div>
          )) : (
            <div className="text-[9px] text-gray-500 font-mono italic">No matches in mini database.</div>
          )}
        </div>
      )}
    </div>
  );
}
