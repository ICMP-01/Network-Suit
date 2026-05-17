import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, Database, ShieldAlert, FileText, BarChart, ExternalLink, Minimize2, Map as MapIcon, Clock } from 'lucide-react';

// Helpers
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}
function intToIp(int) {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}
function parseCIDR(cidrStr) {
  const [ip, prefixStr] = cidrStr.trim().split('/');
  if (!ip || !prefixStr) return null;
  const p = parseInt(prefixStr, 10);
  if (p < 0 || p > 32 || isNaN(p)) return null;
  const netInt = ipToInt(ip);
  const maskInt = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  const aligned = (netInt & maskInt) >>> 0;
  const end = (aligned | (~maskInt >>> 0)) >>> 0;
  return { ip, p, netInt: aligned, end, cidr: `${intToIp(aligned)}/${p}` };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. CIDR Aggregation Playground / Route Optimizer
// ══════════════════════════════════════════════════════════════════════════════
export function CidrAggregator() {
  const [input, setInput] = useState('192.168.1.0/24\n192.168.2.0/24\n192.168.3.0/24\n192.168.4.0/24\n10.0.0.0/24\n10.0.1.0/24');
  const [results, setResults] = useState([]);

  const aggregate = () => {
    const lines = input.split('\n').map(l => l.trim()).filter(l => l);
    const parsed = lines.map(parseCIDR).filter(x => x);
    if (parsed.length === 0) return setResults([]);

    // Very naive aggregation for pedagogical purposes:
    // Sort by IP int. If two adjacent are same prefix and adjacent ints, combine if boundary aligns.
    // Real algorithm uses a trie. We'll do a simplified merge pass.
    let current = [...parsed].sort((a, b) => a.netInt - b.netInt);
    let merged = true;
    while (merged) {
      merged = false;
      const next = [];
      for (let i = 0; i < current.length; i++) {
        if (i < current.length - 1 && current[i].p === current[i+1].p) {
          const p = current[i].p;
          const mask = p === 0 ? 0 : (0xffffffff << (32 - (p - 1))) >>> 0;
          const align1 = (current[i].netInt & mask) >>> 0;
          const align2 = (current[i+1].netInt & mask) >>> 0;
          if (align1 === align2 && (current[i].end + 1) === current[i+1].netInt) {
            next.push({
              ip: intToIp(align1),
              p: p - 1,
              netInt: align1,
              end: current[i+1].end,
              cidr: `${intToIp(align1)}/${p-1}`
            });
            i++; // skip next
            merged = true;
            continue;
          }
        }
        next.push(current[i]);
      }
      current = next;
    }
    
    // Sort final
    setResults(current);
  };

  useEffect(() => { aggregate(); }, []);

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-blue-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Minimize2 size={14} className="text-blue-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-blue-400">Route Table Optimizer & Aggregator</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-4">Paste multiple CIDR blocks. The algorithm will supernet (aggregate) them into the minimum number of covering prefixes possible.</p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1">Input Routes</div>
          <textarea 
            value={input} 
            onChange={e=>setInput(e.target.value)}
            className="w-full h-32 rounded-xl p-3 text-[10px] font-mono text-white outline-none resize-none"
            style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)'}}
          />
          <button onClick={aggregate} className="mt-2 w-full py-2 rounded-lg text-[9px] font-black font-mono transition-all hover:brightness-125"
            style={{background:'rgba(59,130,246,0.2)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.4)'}}>
            Optimize Routes
          </button>
        </div>
        
        <div className="flex-1">
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1">Summarized Routes</div>
          <div className="w-full h-32 rounded-xl p-3 text-[10px] font-mono overflow-y-auto space-y-1" style={{background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.2)'}}>
            {results.map((r,i) => (
              <div key={i} className="text-green-400 font-bold">{r.cidr}</div>
            ))}
            {results.length === 0 && <div className="text-gray-500">No valid routes</div>}
          </div>
          {results.length > 0 && input.split('\n').filter(x=>x.trim()).length > results.length && (
            <div className="mt-2 text-[9px] font-mono text-emerald-400 flex items-center justify-center gap-1 bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
              Table size reduced by {input.split('\n').filter(x=>x.trim()).length - results.length} entries!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. IPv4 Space Map (/8 grid)
// ══════════════════════════════════════════════════════════════════════════════
export function Ipv4SpaceMap() {
  // We render a 16x16 grid representing the 256 /8 blocks of IPv4.
  const blocks = Array.from({length: 256}, (_, i) => {
    let type = 'Public';
    let color = '#3b82f6'; // Blue for public
    if (i === 0) { type = 'Software (Zero)'; color = '#64748b'; }
    else if (i === 10) { type = 'Private (RFC 1918)'; color = '#10b981'; } // Green
    else if (i === 127) { type = 'Loopback'; color = '#a855f7'; } // Purple
    else if (i === 172) { type = 'Mixed (Private/Public)'; color = '#34d399'; }
    else if (i === 192) { type = 'Mixed (Private/Public)'; color = '#34d399'; }
    else if (i >= 224 && i <= 239) { type = 'Multicast (Class D)'; color = '#f97316'; } // Orange
    else if (i >= 240 && i <= 255) { type = 'Reserved (Class E)'; color = '#ef4444'; } // Red
    
    return { id: i, type, color };
  });

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-cyan-500/20">
      <div className="flex items-center gap-2 mb-4">
        <MapIcon size={14} className="text-cyan-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-cyan-400">IPv4 Address Space Map</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-4">Each square represents one /8 block (16.7 million addresses). The entire grid is the complete 4.3 billion IPv4 address space.</p>
      
      <div className="flex justify-center">
        <div className="grid grid-cols-16 gap-[2px] w-full max-w-md aspect-square bg-black/50 p-2 rounded-xl border border-white/5">
          {blocks.map(b => (
            <div 
              key={b.id} 
              className="w-full h-full rounded-[1px] relative group transition-all duration-300 hover:scale-150 hover:z-10"
              style={{background: b.color, opacity: 0.8}}
            >
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 bg-black/90 border border-white/20 p-2 rounded text-[8px] font-mono whitespace-nowrap z-20 pointer-events-none transition-opacity">
                <span className="font-black text-white">{b.id}.0.0.0/8</span><br/>
                <span style={{color:b.color}}>{b.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-3 mt-4 text-[8px] font-mono text-gray-400">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500"/> Public</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500"/> Private</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500"/> Loopback</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500"/> Multicast</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500"/> Reserved</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. IANA Special Purpose Registry
// ══════════════════════════════════════════════════════════════════════════════
export function IanaRegistry() {
  const registry = [
    { block: '0.0.0.0/8', name: '"This host on this network"', rfc: 'RFC 1122', route: false },
    { block: '10.0.0.0/8', name: 'Private-Use', rfc: 'RFC 1918', route: false },
    { block: '100.64.0.0/10', name: 'Shared Address Space (CGNAT)', rfc: 'RFC 6598', route: false },
    { block: '127.0.0.0/8', name: 'Loopback', rfc: 'RFC 1122', route: false },
    { block: '169.254.0.0/16', name: 'Link Local', rfc: 'RFC 3927', route: false },
    { block: '172.16.0.0/12', name: 'Private-Use', rfc: 'RFC 1918', route: false },
    { block: '192.0.0.0/24', name: 'IETF Protocol Assignments', rfc: 'RFC 6890', route: false },
    { block: '192.0.2.0/24', name: 'TEST-NET-1', rfc: 'RFC 5737', route: false },
    { block: '192.88.99.0/24', name: '6to4 Relay Anycast', rfc: 'RFC 3068', route: true },
    { block: '192.168.0.0/16', name: 'Private-Use', rfc: 'RFC 1918', route: false },
    { block: '198.18.0.0/15', name: 'Benchmarking', rfc: 'RFC 2544', route: false },
    { block: '198.51.100.0/24', name: 'TEST-NET-2', rfc: 'RFC 5737', route: false },
    { block: '203.0.113.0/24', name: 'TEST-NET-3', rfc: 'RFC 5737', route: false },
    { block: '224.0.0.0/4', name: 'Multicast', rfc: 'RFC 1112', route: true },
    { block: '240.0.0.0/4', name: 'Reserved', rfc: 'RFC 1112', route: false },
    { block: '255.255.255.255/32', name: 'Limited Broadcast', rfc: 'RFC 919', route: false },
  ];

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Database size={14} className="text-purple-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-purple-400">IANA IPv4 Special-Purpose Address Registry</span>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr style={{background:'rgba(0,0,0,0.3)'}}>
              <th className="px-3 py-2 text-left text-gray-500">Address Block</th>
              <th className="px-3 py-2 text-left text-gray-500">Name</th>
              <th className="px-3 py-2 text-left text-gray-500">RFC</th>
              <th className="px-3 py-2 text-left text-gray-500">Globally Routable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-black/20">
            {registry.map(r => (
              <tr key={r.block} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-2 text-cyan-300 font-bold">{r.block}</td>
                <td className="px-3 py-2 text-gray-300">{r.name}</td>
                <td className="px-3 py-2 text-purple-400">{r.rfc}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded ${r.route ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {r.route ? 'TRUE' : 'FALSE'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BGP Prefix Policy Explainer
// ══════════════════════════════════════════════════════════════════════════════
export function BgpPolicyExplainer() {
  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-orange-500/20">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={14} className="text-orange-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-orange-400">BGP Minimum Prefix Filtering</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-4">Global ISPs filter prefixes longer than /24 (e.g. /25, /26) to prevent the global routing table from exceeding memory limits.</p>
      
      <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[9px] font-bold text-white bg-blue-500/20 border border-blue-500/50 px-3 py-1.5 rounded-lg">Enterprise Router</div>
          <div className="flex flex-col gap-1">
            <div className="text-[8px] font-mono bg-green-500/20 text-green-400 px-2 py-1 rounded">Announce: 12.0.0.0/24</div>
            <div className="text-[8px] font-mono bg-red-500/20 text-red-400 px-2 py-1 rounded">Announce: 12.0.1.0/25</div>
          </div>
        </div>
        
        <div className="flex-1 px-4 relative flex flex-col items-center justify-center">
          <div className="w-full h-px border-t-2 border-dashed border-gray-600 mb-6 relative">
            <motion.div animate={{x:['0%','100%']}} transition={{duration:2, repeat:Infinity, ease:"linear"}} className="absolute -top-1.5 w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="w-full h-px border-t-2 border-dashed border-gray-600 relative">
            <motion.div animate={{x:['0%','50%']}} transition={{duration:2, repeat:Infinity, ease:"linear"}} className="absolute -top-1.5 w-3 h-3 rounded-full bg-red-400" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px]">🛑</div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-[9px] font-bold text-white bg-orange-500/20 border border-orange-500/50 px-3 py-1.5 rounded-lg">ISP Border Router</div>
          <div className="text-[7px] font-mono text-gray-400 text-center max-w-[100px]">
            Prefix-list filter:<br/>
            <code>permit 0.0.0.0/0 le 24</code><br/>
            <code>deny any</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. Allocation Timeline
// ══════════════════════════════════════════════════════════════════════════════
export function AllocationTimeline() {
  const events = [
    { year: 1981, desc: 'RFC 791 defines IPv4' },
    { year: 1993, desc: 'CIDR Introduced (RFC 1519)' },
    { year: 1996, desc: 'RFC 1918 Private Space defined' },
    { year: 2011, desc: 'IANA exhausts /8 free pool' },
    { year: 2012, desc: 'RFC 6598 CGNAT space (100.64/10)' },
    { year: 2019, desc: 'RIPE NCC runs out of IPv4' },
  ];

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-rose-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-rose-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-rose-400">IPv4 Exhaustion Timeline</span>
      </div>
      
      <div className="relative border-l border-rose-500/30 ml-2 pl-4 space-y-4">
        {events.map((e, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div className="text-[10px] font-black text-rose-300">{e.year}</div>
            <div className="text-[9px] font-mono text-gray-400">{e.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
