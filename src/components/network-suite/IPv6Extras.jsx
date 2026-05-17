import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Fingerprint, Activity, Layers, ListFilter } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function compressIPv6(groups) {
  if (!groups) return null;
  const stripped = groups.map(g => parseInt(g, 16).toString(16));
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  stripped.forEach((g, i) => {
    if (g === '0') {
      if (curStart === -1) { curStart = i; curLen = 1; }
      else curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else { curStart = -1; curLen = 0; }
  });
  if (bestLen > 1) {
    const result = [...stripped.slice(0, bestStart), null, ...stripped.slice(bestStart + bestLen)];
    return result.map(x => x === null ? '' : x).join(':').replace(/^:/, '::').replace(/:$/, '::').replace(/:::+/, '::');
  }
  return stripped.join(':');
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. EUI-64 Calculator
// ══════════════════════════════════════════════════════════════════════════════
export function Eui64Calculator() {
  const [mac, setMac] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const calculate = () => {
    let cleanMac = mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    if (cleanMac.length !== 12) {
      setError('MAC must be 12 hex digits');
      setResult(null);
      return;
    }
    setError(null);
    
    // Split into bytes
    const bytes = cleanMac.match(/.{2}/g).map(b => parseInt(b, 16));
    
    // Flip 7th bit of first byte (Universal/Local flag)
    bytes[0] ^= 0x02;

    // Insert FFFE in the middle
    const eui64 = [
      bytes[0], bytes[1], bytes[2],
      0xff, 0xfe,
      bytes[3], bytes[4], bytes[5]
    ];

    // Format as IPv6 groups
    const groups = [
      'fe80',
      '0000',
      '0000',
      '0000',
      ((eui64[0]<<8) | eui64[1]).toString(16).padStart(4, '0'),
      ((eui64[2]<<8) | eui64[3]).toString(16).padStart(4, '0'),
      ((eui64[4]<<8) | eui64[5]).toString(16).padStart(4, '0'),
      ((eui64[6]<<8) | eui64[7]).toString(16).padStart(4, '0'),
    ];

    const compressed = compressIPv6(groups);
    setResult({ mac: cleanMac, eui64: groups.slice(4).join(':'), compressed });
  };

  return (
    <div className="ns-glass rounded-2xl p-5 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Fingerprint size={14} className="text-purple-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-purple-300">EUI-64 Auto-Config (RFC 4291)</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-3">Input a MAC address. SLAAC generates a Link-Local address by flipping the 7th bit and inserting <code className="text-purple-300">FF:FE</code>.</p>
      
      <div className="flex gap-2 mb-3">
        <input value={mac} onChange={e=>setMac(e.target.value)} onKeyDown={e=>e.key==='Enter'&&calculate()}
          placeholder="e.g. 00:1A:2B:3C:4D:5E"
          className="flex-1 rounded-xl px-4 py-2 text-sm font-mono text-white outline-none"
          style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(168,85,247,0.3)'}}/>
        <button onClick={calculate} className="px-4 py-2 rounded-xl text-[10px] font-black font-mono transition-all"
          style={{background:'rgba(168,85,247,0.2)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.4)'}}>Generate</button>
      </div>
      
      {error && <div className="text-red-400 text-[9px] font-mono mb-2">{error}</div>}
      
      {result && (
        <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} className="p-3 rounded-xl border border-purple-500/30 space-y-2" style={{background:'rgba(168,85,247,0.08)'}}>
          <div className="text-[9px] font-mono text-gray-400">1. Clean MAC: <span className="text-gray-200">{result.mac.match(/.{2}/g).join(':')}</span></div>
          <div className="text-[9px] font-mono text-gray-400">2. Interface ID: <span className="text-purple-300 font-bold">{result.eui64}</span></div>
          <div className="text-[9px] font-mono text-gray-400">3. Link-Local Address:</div>
          <div className="text-sm font-black font-mono text-emerald-400">{result.compressed}</div>
        </motion.div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Privacy Address Generator (RFC 4941)
// ══════════════════════════════════════════════════════════════════════════════
export function PrivacyAddressGenerator() {
  const [prefix, setPrefix] = useState('2001:db8:1:1::');
  const [result, setResult] = useState(null);

  const generate = () => {
    let p = prefix.trim();
    if (!p) return;
    if (p.endsWith('::')) p = p.slice(0, -2);
    const groups = p.split(':').filter(Boolean);
    if (groups.length > 4) return; // Keep it simple, expect /64
    
    // Generate 64 random bits
    const r = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
    const iid = [r(), r(), r(), r()];
    
    // Set universal/local bit to 0 (local)
    iid[0] = (parseInt(iid[0], 16) & ~0x0200).toString(16).padStart(4, '0');

    const fullGroups = [...groups];
    while(fullGroups.length < 4) fullGroups.push('0000');
    fullGroups.push(...iid);

    setResult(compressIPv6(fullGroups));
  };

  return (
    <div className="ns-glass rounded-2xl p-5 border border-cyan-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Network size={14} className="text-cyan-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-cyan-300">Privacy Extension (RFC 4941)</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-3">EUI-64 leaks the device MAC. Privacy Extensions generate random Interface IDs that rotate periodically.</p>
      
      <div className="flex gap-2 mb-3">
        <input value={prefix} onChange={e=>setPrefix(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generate()}
          placeholder="/64 Prefix e.g. 2001:db8:1:1::"
          className="flex-1 rounded-xl px-4 py-2 text-sm font-mono text-white outline-none"
          style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(6,182,212,0.3)'}}/>
        <button onClick={generate} className="px-4 py-2 rounded-xl text-[10px] font-black font-mono transition-all"
          style={{background:'rgba(6,182,212,0.2)', color:'#67e8f9', border:'1px solid rgba(6,182,212,0.4)'}}>Generate</button>
      </div>

      {result && (
        <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} className="p-3 rounded-xl border border-cyan-500/30" style={{background:'rgba(6,182,212,0.08)'}}>
          <div className="text-[9px] font-mono text-gray-400 mb-1">Temporary Global Unicast Address:</div>
          <div className="text-sm font-black font-mono text-emerald-400">{result}</div>
        </motion.div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. Solicited-Node Multicast
// ══════════════════════════════════════════════════════════════════════════════
export function SolicitedNodeMulticast() {
  const [addr, setAddr] = useState('2001:db8::1a2b:3c4d');
  const [result, setResult] = useState(null);

  const calculate = () => {
    let a = addr.trim().toLowerCase();
    let groups = [];
    if (a.includes('::')) {
      const sides = a.split('::');
      const left  = sides[0] ? sides[0].split(':') : [];
      const right = sides[1] ? sides[1].split(':') : [];
      const missing = 8 - left.length - right.length;
      groups = [...left, ...Array(missing).fill('0000'), ...right];
    } else {
      groups = a.split(':');
    }
    
    if (groups.length !== 8) return;
    groups = groups.map(g => g.padStart(4, '0'));

    // Last 24 bits = last group + last 2 hex chars of second-to-last group
    const last24 = groups[6].slice(-2) + ':' + groups[7];
    
    // Append to ff02::1:ff00:0/104
    const snm = `ff02::1:ff${last24}`;
    
    setResult(snm);
  };

  return (
    <div className="ns-glass rounded-2xl p-5 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} className="text-amber-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-amber-300">Solicited-Node Multicast</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-3">Replaces ARP. NDP Neighbor Solicitations are sent to this address, which is derived from the last 24 bits of the unicast IP.</p>
      
      <div className="flex gap-2 mb-3">
        <input value={addr} onChange={e=>setAddr(e.target.value)} onKeyDown={e=>e.key==='Enter'&&calculate()}
          placeholder="IPv6 Address"
          className="flex-1 rounded-xl px-4 py-2 text-sm font-mono text-white outline-none"
          style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(245,158,11,0.3)'}}/>
        <button onClick={calculate} className="px-4 py-2 rounded-xl text-[10px] font-black font-mono transition-all"
          style={{background:'rgba(245,158,11,0.2)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.4)'}}>Calc</button>
      </div>

      {result && (
        <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} className="p-3 rounded-xl border border-amber-500/30" style={{background:'rgba(245,158,11,0.08)'}}>
          <div className="text-[9px] font-mono text-gray-400 mb-1">Target Multicast Group:</div>
          <div className="text-sm font-black font-mono text-emerald-400">{result}</div>
        </motion.div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. Dual-Stack Pair Viewer
// ══════════════════════════════════════════════════════════════════════════════
export function DualStackViewer() {
  const [ipv4, setIpv4] = useState('192.168.1.1');
  const [result, setResult] = useState(null);

  const mapToV6 = () => {
    const parts = ipv4.trim().split('.');
    if(parts.length !== 4) return;
    setResult(`::ffff:${parts.join('.')}`);
  };

  return (
    <div className="ns-glass rounded-2xl p-5 border border-pink-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={14} className="text-pink-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-pink-300">IPv4-Mapped IPv6</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-3">Allows IPv6-only applications (like a dual-stack web server) to handle IPv4 connections natively within their internal IPv6 sockets.</p>
      
      <div className="flex gap-2 mb-3">
        <input value={ipv4} onChange={e=>setIpv4(e.target.value)} onKeyDown={e=>e.key==='Enter'&&mapToV6()}
          placeholder="IPv4 Address"
          className="flex-1 rounded-xl px-4 py-2 text-sm font-mono text-white outline-none"
          style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(236,72,153,0.3)'}}/>
        <button onClick={mapToV6} className="px-4 py-2 rounded-xl text-[10px] font-black font-mono transition-all"
          style={{background:'rgba(236,72,153,0.2)', color:'#f472b6', border:'1px solid rgba(236,72,153,0.4)'}}>Map</button>
      </div>

      {result && (
        <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} className="p-3 rounded-xl border border-pink-500/30" style={{background:'rgba(236,72,153,0.08)'}}>
          <div className="text-[9px] font-mono text-gray-400 mb-1">Mapped IPv6 Socket Format:</div>
          <div className="text-sm font-black font-mono text-emerald-400">{result}</div>
        </motion.div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. Scope Classifier
// ══════════════════════════════════════════════════════════════════════════════
export function ScopeClassifier() {
  const [text, setText] = useState('fe80::1\n2001:db8::1\nfc00::abc\n::1\nff02::1\n::ffff:10.0.0.1');
  const [results, setResults] = useState(null);

  const classify = () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const res = lines.map(ip => {
      let scope = 'Unknown';
      let color = '#6b7280';
      if (ip === '::1') { scope = 'Loopback'; color = '#3b82f6'; }
      else if (ip.startsWith('fe80:')) { scope = 'Link-Local'; color = '#f59e0b'; }
      else if (ip.match(/^f[cd][0-9a-f]{2}:/i)) { scope = 'Unique Local (ULA)'; color = '#a855f7'; }
      else if (ip.match(/^2[0-9a-f]{3}:/i) || ip.match(/^3[0-9a-f]{3}:/i)) { scope = 'Global Unicast'; color = '#10b981'; }
      else if (ip.match(/^ff[0-9a-f]{2}:/i)) { scope = 'Multicast'; color = '#ec4899'; }
      else if (ip.startsWith('::ffff:')) { scope = 'IPv4-Mapped'; color = '#06b6d4'; }
      return { ip, scope, color };
    });
    setResults(res);
  };

  return (
    <div className="ns-glass rounded-2xl p-5 border border-emerald-500/20">
      <div className="flex items-center gap-2 mb-4">
        <ListFilter size={14} className="text-emerald-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-300">Bulk Scope Classifier</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-3">Paste multiple IPv6 addresses to instantly classify their routing scope.</p>

      <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
        className="w-full rounded-xl px-4 py-3 text-xs font-mono outline-none resize-none mb-3"
        style={{background:'rgba(0,0,0,0.4)', border:'1px solid rgba(16,185,129,0.3)', color:'#e2e8f0'}}/>

      <button onClick={classify} className="px-5 py-2 rounded-xl text-[10px] font-black font-mono mb-4 transition-all hover:scale-105"
        style={{background:'rgba(16,185,129,0.2)', color:'#34d399', border:'1px solid rgba(16,185,129,0.4)'}}>
        Classify Scopes →
      </button>

      {results && (
        <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg border" style={{background:`${r.color}15`, borderColor:`${r.color}30`}}>
              <code className="text-[10px] font-mono text-white">{r.ip}</code>
              <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{background:`${r.color}20`, color:r.color}}>
                {r.scope}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. IPv6 Address Builder
// ══════════════════════════════════════════════════════════════════════════════
export function Ipv6AddressBuilder() {
  const [selectedZone, setSelectedZone] = useState('prefix');
  
  const zones = [
    { id: 'prefix', label: 'Global Routing Prefix', bits: 48, color: '#3b82f6', hex: '2001:0db8:acad', desc: 'Assigned by the ISP/RIR. Represents the public site prefix.' },
    { id: 'subnet', label: 'Subnet ID', bits: 16, color: '#a855f7', hex: '0001', desc: 'Managed by the local admin. Allows 65,536 subnets per site.' },
    { id: 'iid', label: 'Interface ID', bits: 64, color: '#10b981', hex: '0000:0000:0000:0001', desc: 'Identifies the specific host on the link. Often generated via SLAAC (EUI-64) or Privacy Extensions.' },
  ];

  return (
    <div className="ns-glass rounded-2xl p-5 border border-indigo-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={14} className="text-indigo-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-indigo-300">128-Bit Address Builder</span>
      </div>
      <p className="text-[9px] font-mono text-gray-400 mb-6">Click a zone to learn about its structure in a standard /64 assignment.</p>

      {/* Builder Bar */}
      <div className="flex h-12 rounded-lg overflow-hidden mb-4 border border-white/10" style={{background:'rgba(0,0,0,0.4)'}}>
        {zones.map(z => (
          <button key={z.id} onClick={() => setSelectedZone(z.id)}
            className="flex flex-col items-center justify-center transition-all h-full"
            style={{ 
              width: `${(z.bits/128)*100}%`,
              background: selectedZone === z.id ? `${z.color}40` : `${z.color}15`,
              borderLeft: '1px solid rgba(255,255,255,0.05)'
            }}>
            <span className="text-[9px] font-black font-mono" style={{color:z.color}}>{z.bits} bits</span>
          </button>
        ))}
      </div>

      {/* Hex Representation */}
      <div className="flex justify-center items-center gap-1 mb-6 text-xl md:text-2xl font-black font-mono tracking-widest">
        {zones.map((z, i) => (
          <React.Fragment key={z.id}>
            <span className={`transition-colors ${selectedZone===z.id?'drop-shadow-lg scale-110':''}`} 
              style={{color:selectedZone===z.id?z.color:'rgba(255,255,255,0.5)'}}>{z.hex}</span>
            {i < 2 && <span className="text-gray-600">:</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Details Card */}
      <AnimatePresence mode="wait">
        {zones.map(z => z.id === selectedZone && (
          <motion.div key={z.id} initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}}
            className="p-4 rounded-xl border" style={{background:`${z.color}08`, borderColor:`${z.color}30`}}>
            <div className="text-[10px] font-black font-mono uppercase tracking-widest mb-1" style={{color:z.color}}>{z.label} ({z.bits} bits)</div>
            <div className="text-[10px] font-mono text-gray-400 leading-relaxed">{z.desc}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. Transition Mechanism Explorer
// ══════════════════════════════════════════════════════════════════════════════
export function TransitionExplorer() {
  const [mech, setMech] = useState('nat64');

  const mechs = [
    { id: 'dual', label: 'Dual-Stack', icon: '🔄', desc: 'Nodes run both IPv4 and IPv6 stacks simultaneously. The preferred long-term solution.', src: 'v6', dst: 'v6', intermediate: 'Dual-Stack Router' },
    { id: 'nat64', label: 'NAT64 / DNS64', icon: '🔀', desc: 'IPv6-only clients talk to IPv4-only servers. DNS64 synthesizes AAAA records (64:ff9b::) from IPv4 A records.', src: 'v6', dst: 'v4', intermediate: 'NAT64 Gateway' },
    { id: '6to4', label: '6to4 Tunnel', icon: '🚇', desc: 'Embeds an IPv4 address inside the 2002::/16 prefix to tunnel IPv6 traffic over an IPv4 core. (Deprecated)', src: 'v6', dst: 'v6', intermediate: 'IPv4 Internet' },
  ];

  const active = mechs.find(m => m.id === mech);

  return (
    <div className="ns-glass rounded-2xl p-5 border border-rose-500/20">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-rose-400">🛣️</span>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-rose-300">Transition Mechanisms</span>
      </div>

      <div className="flex gap-1.5 mb-4 border-b border-white/5 pb-3">
        {mechs.map(m => (
          <button key={m.id} onClick={() => setMech(m.id)}
            className="px-3 py-1.5 rounded-lg text-[9px] font-black font-mono transition-all flex items-center gap-1.5"
            style={{
              background: mech===m.id ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.04)',
              color: mech===m.id ? '#fda4af' : '#6b7280',
              border: `1px solid ${mech===m.id ? 'rgba(244,63,94,0.4)' : 'transparent'}`
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] font-mono text-gray-400 mb-6 min-h-[40px]">{active.desc}</p>

      {/* Flow Diagram */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 relative" style={{background:'rgba(0,0,0,0.2)'}}>
        
        {/* Animated Packet */}
        <motion.div 
          className="absolute h-2 w-4 rounded-full" 
          style={{background: active.id === 'nat64' ? 'linear-gradient(to right, #06b6d4, #f59e0b)' : '#a855f7', top: 'calc(50% - 4px)'}}
          animate={{ left: ['10%', '45%', '90%'], opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Source */}
        <div className="flex flex-col items-center z-10 w-20">
          <div className="text-2xl mb-1">💻</div>
          <div className="text-[8px] font-black font-mono text-center px-2 py-0.5 rounded" style={{background:active.src==='v6'?'rgba(6,182,212,0.2)':'rgba(245,158,11,0.2)', color:active.src==='v6'?'#67e8f9':'#fcd34d'}}>Client ({active.src.toUpperCase()})</div>
        </div>

        {/* Intermediate Node */}
        <div className="flex flex-col items-center z-10">
          <div className="w-24 h-12 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 bg-black text-[8px] font-black font-mono text-gray-400 text-center px-2">
            {active.intermediate}
          </div>
        </div>

        {/* Destination */}
        <div className="flex flex-col items-center z-10 w-20">
          <div className="text-2xl mb-1">🖥️</div>
          <div className="text-[8px] font-black font-mono text-center px-2 py-0.5 rounded" style={{background:active.dst==='v6'?'rgba(6,182,212,0.2)':'rgba(245,158,11,0.2)', color:active.dst==='v6'?'#67e8f9':'#fcd34d'}}>Server ({active.dst.toUpperCase()})</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. DHCPv6 vs SLAAC
// ══════════════════════════════════════════════════════════════════════════════
export function DhcpVsSlaac() {
  const [mode, setMode] = useState('slaac'); // slaac, stateless, stateful

  const flows = {
    slaac: [
      { dir: 'out', label: 'Router Solicitation (RS)', desc: 'Host to ff02::2' },
      { dir: 'in',  label: 'Router Advertisement (RA)', desc: 'M=0, O=0. Contains Prefix. Host self-assigns IP.' }
    ],
    stateless: [
      { dir: 'out', label: 'Router Solicitation (RS)', desc: 'Host to ff02::2' },
      { dir: 'in',  label: 'Router Advertisement (RA)', desc: 'M=0, O=1. Uses SLAAC for IP, DHCP for DNS.' },
      { dir: 'out', label: 'DHCPv6 Info-Request', desc: 'Host asks for DNS' },
      { dir: 'in',  label: 'DHCPv6 Reply', desc: 'Server provides DNS' }
    ],
    stateful: [
      { dir: 'out', label: 'Router Solicitation (RS)', desc: 'Host to ff02::2' },
      { dir: 'in',  label: 'Router Advertisement (RA)', desc: 'M=1, O=1. Tells host to use DHCP for everything.' },
      { dir: 'out', label: 'DHCPv6 Solicit', desc: 'Find DHCPv6 server' },
      { dir: 'in',  label: 'DHCPv6 Advertise', desc: 'Server offers IP' },
      { dir: 'out', label: 'DHCPv6 Request', desc: 'Host requests IP' },
      { dir: 'in',  label: 'DHCPv6 Reply', desc: 'Server assigns IP & DNS' }
    ]
  };

  return (
    <div className="ns-glass rounded-2xl p-5 border border-fuchsia-500/20">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-fuchsia-400">🚥</span>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-fuchsia-300">Auto-Config Flow</span>
      </div>

      <div className="flex gap-1.5 mb-4">
        {['slaac', 'stateless', 'stateful'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-black font-mono transition-all capitalize"
            style={{
              background: mode===m ? 'rgba(217,70,239,0.2)' : 'rgba(255,255,255,0.04)',
              color: mode===m ? '#f0abfc' : '#6b7280',
              border: `1px solid ${mode===m ? 'rgba(217,70,239,0.4)' : 'transparent'}`
            }}>
            {m}
          </button>
        ))}
      </div>

      <div className="border-l-2 border-fuchsia-500/30 pl-4 py-2 space-y-4 relative ml-4">
        {flows[mode].map((step, i) => (
          <motion.div key={i} initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} transition={{delay: i*0.2}}
            className="relative">
            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-black"
              style={{background: step.dir==='out'?'#06b6d4':'#10b981'}}/>
            <div className="text-[10px] font-black font-mono mb-0.5" style={{color:step.dir==='out'?'#67e8f9':'#6ee7b7'}}>
              {step.dir==='out' ? 'Client ➔' : '➔ Client'} : {step.label}
            </div>
            <div className="text-[9px] font-mono text-gray-500">{step.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
