import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, AlertTriangle, Clock, Layers } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function ipToInt(ip) {
  return ip.split('.').reduce((a, b) => (a << 8) | +b, 0) >>> 0;
}
function intToIp(n) {
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
}
function calcMask(prefix) {
  return prefix === 0 ? 0 : (0xffffffff << (32-prefix)) >>> 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ANIMATED BIT MAP — replaces static BitMap when prefix slider moves
// ══════════════════════════════════════════════════════════════════════════════
export function AnimatedBitMap({ info, prevPrefix, setIp }) {
  const [animating, setAnimating] = useState(false);
  const [displayBits, setDisplayBits] = useState(() => info?.ipBin?.split('') || []);
  const prevRef = useRef(prevPrefix);

  // Trigger animation whenever prefix changes
  useEffect(() => {
    if (!info) return;
    const newBits = info.ipBin.split('');
    if (prevRef.current !== info.prefix) {
      setAnimating(true);
      setDisplayBits(newBits);
      const t = setTimeout(() => setAnimating(false), 600);
      prevRef.current = info.prefix;
      return () => clearTimeout(t);
    } else {
      setDisplayBits(newBits);
    }
  }, [info]);

  if (!info) return null;

  const handleBitClick = (index) => {
    if (!setIp) return;
    const nb = [...displayBits];
    nb[index] = nb[index] === '0' ? '1' : '0';
    const b = nb.join('');
    setIp([b.slice(0,8),b.slice(8,16),b.slice(16,24),b.slice(24)].map(s=>parseInt(s,2)).join('.'));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[9px] font-mono mb-1">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{background:'rgba(16,185,129,0.5)',border:'1px solid #10b981'}}/>
            Network ({info.networkBits} bits)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{background:'rgba(245,158,11,0.4)',border:'1px solid #f59e0b'}}/>
            Host ({info.hostBits} bits)
          </span>
        </div>
        {animating && <span className="text-cyan-400 font-bold animate-pulse">⚡ bits flipping!</span>}
        {!animating && <span className="text-emerald-400 opacity-60">Click any bit to flip</span>}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[0,8,16,24].map(start => (
          <div key={start} className="flex flex-col items-center gap-1">
            <div className="text-[8px] font-mono text-gray-700 mb-0.5">Octet {start/8+1}</div>
            <div className="flex gap-[2px]">
              {displayBits.slice(start, start+8).map((b, i) => {
                const pos = start + i;
                const isNet = pos < info.networkBits;
                const justFlipped = animating && (
                  (isNet && pos >= Math.min(info.networkBits, prevRef.current)) ||
                  (!isNet && pos < Math.max(info.networkBits, prevRef.current))
                );
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleBitClick(pos)}
                    animate={justFlipped ? { scale:[1,1.4,1], y:[0,-4,0] } : { scale:1, y:0 }}
                    transition={{ duration: 0.35, delay: (pos % 8) * 0.02 }}
                    className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[8px] font-black font-mono cursor-pointer hover:brightness-150"
                    style={{
                      background: isNet ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${isNet ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)'}`,
                      color: isNet ? '#34d399' : '#fbbf24',
                      boxShadow: justFlipped ? `0 0 8px ${isNet?'#10b981':'#f59e0b'}` : 'none',
                    }}>
                    {b}
                  </motion.button>
                );
              })}
            </div>
            <div className="text-[9px] font-mono font-bold text-gray-600">
              {parseInt(info.ipBin.slice(start, start+8), 2)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg p-3 space-y-1 font-mono text-[9px]" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
        {[['IP  ',info.ipBin,'#34d399'],['MASK',info.maskBin,'#fb923c'],['NET ',info.netBin,'#60a5fa'],['BCAST',info.bcastBin,'#f87171']].map(([k,v,c])=>(
          <div key={k} className="flex items-center gap-2">
            <span className="text-gray-700 w-10 shrink-0">{k}</span>
            <span className="font-mono tracking-wider" style={{color:c}}>{v.match(/.{8}/g).join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. SUBNET SPLIT TOOL
// ══════════════════════════════════════════════════════════════════════════════
export function SubnetSplitTool({ info }) {
  const [splitN, setSplitN] = useState(2);
  if (!info) return null;

  const maxSplits = Math.min(128, Math.pow(2, info.hostBits - 1));
  // N must be power of 2
  const validNs = [2,4,8,16,32,64,128].filter(n => n <= maxSplits && info.hostBits > Math.log2(n));
  const newPrefix = info.prefix + Math.log2(splitN);
  const newSize = Math.pow(2, 32 - newPrefix);
  const newUsable = Math.max(0, newSize - 2);

  const subnets = Array.from({ length: splitN }, (_, i) => {
    const netInt = info.networkInt + i * newSize;
    return {
      id: i+1,
      network: intToIp(netInt),
      broadcast: intToIp(netInt + newSize - 1),
      first: intToIp(netInt + 1),
      last: intToIp(netInt + newSize - 2),
      cidr: `${intToIp(netInt)}/${newPrefix}`,
    };
  });

  const colors = ['#10b981','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

  return (
    <div className="ns-glass rounded-2xl p-5 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Scissors size={14} className="text-purple-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-purple-300">Subnet Split Tool</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] font-mono text-gray-400">Split <span className="text-purple-300 font-bold">{info.cidr}</span> into</span>
        <div className="flex gap-1.5">
          {validNs.map(n => (
            <button key={n} onClick={() => setSplitN(n)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black font-mono transition-all"
              style={{
                background: splitN===n ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${splitN===n ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
                color: splitN===n ? '#c084fc' : '#6b7280',
              }}>
              {n}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-mono text-gray-400">equal /{newPrefix} subnets</span>
      </div>

      <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto">
        {subnets.map((s, i) => (
          <motion.div key={s.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
            className="flex items-center gap-3 rounded-xl px-3 py-2 border"
            style={{background:`${colors[i%colors.length]}0d`, borderColor:`${colors[i%colors.length]}25`}}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black shrink-0"
              style={{background:`${colors[i%colors.length]}25`, color:colors[i%colors.length]}}>
              {s.id}
            </div>
            <code className="text-[10px] font-bold font-mono flex-1" style={{color:colors[i%colors.length]}}>{s.cidr}</code>
            <div className="text-[8px] font-mono text-gray-500">{s.first} → {s.last}</div>
            <div className="text-[8px] font-mono text-gray-600">{newUsable} hosts</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 p-2.5 rounded-lg text-[8px] font-mono text-gray-500 border border-white/5" style={{background:'rgba(0,0,0,0.2)'}}>
        📐 Each /{newPrefix} has <strong className="text-white">{newUsable.toLocaleString()}</strong> usable hosts.
        Original /{info.prefix} had <strong className="text-white">{info.usableHosts.toLocaleString()}</strong>.
        {newPrefix > 30 && ' ⚠️ Very small subnets — consider /30 or /31 for point-to-point.'}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. OVERLAP DETECTOR
// ══════════════════════════════════════════════════════════════════════════════
function parseCidr(str) {
  const m = str.trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
  if (!m) return null;
  const prefix = parseInt(m[2]);
  if (prefix < 0 || prefix > 32) return null;
  const ipInt = ipToInt(m[1]);
  if (ipInt === null || isNaN(ipInt)) return null;
  const mask = calcMask(prefix);
  const netInt = (ipInt & mask) >>> 0;
  const bcast = (netInt | (~mask >>> 0)) >>> 0;
  return { cidr: `${intToIp(netInt)}/${prefix}`, netInt, bcast, prefix, raw: str.trim() };
}

function overlaps(a, b) {
  return a.netInt <= b.bcast && b.netInt <= a.bcast;
}

export function OverlapDetector() {
  const [text, setText] = useState('192.168.1.0/24\n192.168.1.128/25\n10.0.0.0/8');
  const [results, setResults] = useState(null);

  const detect = () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(l => ({ raw: l, parsed: parseCidr(l) }));
    const invalid = parsed.filter(p => !p.parsed).map(p => p.raw);
    const valid = parsed.filter(p => p.parsed).map(p => p.parsed);

    const pairs = [];
    for (let i = 0; i < valid.length; i++) {
      for (let j = i+1; j < valid.length; j++) {
        if (overlaps(valid[i], valid[j])) {
          pairs.push({ a: valid[i].cidr, b: valid[j].cidr });
        }
      }
    }
    setResults({ valid, invalid, pairs });
  };

  const colors = ['#10b981','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4'];

  return (
    <div className="ns-glass rounded-2xl p-5 border border-red-500/20">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={14} className="text-red-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-red-300">CIDR Overlap Detector</span>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
        placeholder="One CIDR per line, e.g. 192.168.1.0/24"
        className="w-full rounded-xl px-4 py-3 text-xs font-mono outline-none resize-none mb-3"
        style={{background:'rgba(0,0,0,0.4)', border:'1px solid rgba(239,68,68,0.3)', color:'#e2e8f0'}}/>

      <button onClick={detect} className="px-5 py-2 rounded-xl text-[10px] font-black font-mono mb-4 transition-all hover:scale-105"
        style={{background:'rgba(239,68,68,0.2)', color:'#f87171', border:'1px solid rgba(239,68,68,0.4)'}}>
        Detect Overlaps →
      </button>

      {results && (
        <AnimatePresence>
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-3">
            {results.invalid.length > 0 && (
              <div className="p-3 rounded-xl border border-yellow-500/30" style={{background:'rgba(245,158,11,0.08)'}}>
                <div className="text-[9px] font-mono text-yellow-400 mb-1">⚠️ Invalid entries (skipped):</div>
                {results.invalid.map(r => <div key={r} className="text-[8px] font-mono text-gray-500">{r}</div>)}
              </div>
            )}

            {/* Visual bar chart of ranges */}
            <div className="space-y-1.5">
              <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">Address Space</div>
              {results.valid.map((v, i) => {
                const pct = Math.min(100, Math.max(2, (v.bcast - v.netInt + 1) / 0xffffffff * 100 * 60));
                const offset = (v.netInt / 0xffffffff) * 100;
                return (
                  <div key={v.cidr} className="flex items-center gap-2">
                    <div className="w-32 text-[8px] font-mono truncate" style={{color:colors[i%colors.length]}}>{v.cidr}</div>
                    <div className="flex-1 h-5 rounded relative" style={{background:'rgba(255,255,255,0.04)'}}>
                      <motion.div initial={{width:0}} animate={{width:`${Math.max(pct,1)}%`}}
                        className="absolute top-0 bottom-0 rounded"
                        style={{left:`${Math.min(offset*0.4,80)}%`, background:`${colors[i%colors.length]}60`, border:`1px solid ${colors[i%colors.length]}80`}}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {results.pairs.length === 0 ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 text-center" style={{background:'rgba(16,185,129,0.08)'}}>
                <span className="text-[10px] font-mono font-bold text-emerald-400">✅ No overlaps detected</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-red-500/40 space-y-2" style={{background:'rgba(239,68,68,0.08)'}}>
                <div className="text-[9px] font-mono font-bold text-red-400">⚠️ {results.pairs.length} overlap{results.pairs.length>1?'s':''} found!</div>
                {results.pairs.map((p,i) => (
                  <div key={i} className="text-[8px] font-mono text-gray-400">
                    <span className="text-red-300 font-bold">{p.a}</span> overlaps <span className="text-red-300 font-bold">{p.b}</span>
                  </div>
                ))}
                <div className="text-[8px] font-mono text-gray-600 mt-1">⚡ Overlapping ACL entries cause unpredictable permit/deny behaviour on Cisco IOS.</div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. ADDRESS TIMELINE (IANA Allocation History)
// ══════════════════════════════════════════════════════════════════════════════
const IANA_TIMELINE = [
  { range:'0.0.0.0/8',     year:1981, rfc:'RFC 791',  label:'Reserved — "This network"', color:'#6b7280', desc:'Used as source before IP is assigned. 0.0.0.0 = default route.' },
  { range:'10.0.0.0/8',    year:1996, rfc:'RFC 1918', label:'Private Class A', color:'#10b981', desc:'16.7M addresses. Used in large enterprise networks and ISP NAT pools.' },
  { range:'100.64.0.0/10', year:2012, rfc:'RFC 6598', label:'Shared Address Space (CGNAT)', color:'#06b6d4', desc:'ISP Carrier-Grade NAT. Sits between public internet and private RFC1918.' },
  { range:'127.0.0.0/8',   year:1981, rfc:'RFC 791',  label:'Loopback', color:'#3b82f6', desc:'127.0.0.1 = localhost. Never leaves the host OS network stack.' },
  { range:'169.254.0.0/16',year:2005, rfc:'RFC 3927', label:'Link-Local (APIPA)', color:'#f59e0b', desc:'Auto-assigned when DHCP fails. Only valid on local link — not routed.' },
  { range:'172.16.0.0/12', year:1996, rfc:'RFC 1918', label:'Private Class B', color:'#10b981', desc:'172.16–172.31. 1M addresses. Common in corporate VPNs and cloud VPCs.' },
  { range:'192.0.0.0/24',  year:2010, rfc:'RFC 5736', label:'IETF Protocol Assignments', color:'#8b5cf6', desc:'Reserved for IETF protocol experimentation.' },
  { range:'192.0.2.0/24',  year:1999, rfc:'RFC 5737', label:'TEST-NET-1 (Documentation)', color:'#ec4899', desc:'192.0.2.x used in RFCs and textbooks. Never route these.' },
  { range:'192.168.0.0/16',year:1996, rfc:'RFC 1918', label:'Private Class C', color:'#10b981', desc:'65,536 networks. Home routers default here. 192.168.1.x is ubiquitous.' },
  { range:'198.18.0.0/15', year:1999, rfc:'RFC 2544', label:'Benchmarking (BMWG)', color:'#f97316', desc:'Used in RFC 2544 performance tests. Never used in production routing.' },
  { range:'203.0.113.0/24',year:2010, rfc:'RFC 5737', label:'TEST-NET-3 (Documentation)', color:'#ec4899', desc:'Third documentation block. Use in examples instead of real customer IPs.' },
  { range:'224.0.0.0/4',   year:1986, rfc:'RFC 1112', label:'Multicast (Class D)', color:'#eab308', desc:'224.0.0.1=all hosts, 224.0.0.2=all routers, 224.0.0.5=OSPF. IGMP manages groups.' },
  { range:'240.0.0.0/4',   year:1981, rfc:'RFC 791',  label:'Reserved (Class E)', color:'#ef4444', desc:'Originally "future use". Never allocated. Most OSes drop packets to/from here.' },
  { range:'255.255.255.255/32',year:1981,rfc:'RFC 919',label:'Limited Broadcast', color:'#f43f5e', desc:'Sent to all hosts on local segment. Routers never forward it.' },
];

function matchTimeline(networkInt, prefix) {
  return IANA_TIMELINE.filter(entry => {
    const ep = parseCidr(entry.range);
    if (!ep) return false;
    // Check if the queried network overlaps this entry
    return overlaps({ netInt: networkInt, bcast: networkInt + Math.pow(2, 32-prefix) - 1 }, ep);
  });
}

export function AddressTimeline({ info }) {
  if (!info) return null;
  const matches = matchTimeline(info.networkInt, info.prefix);

  return (
    <div className="ns-glass rounded-2xl p-5 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-amber-400"/>
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-amber-300">Address Timeline</span>
        <span className="text-[8px] font-mono text-gray-500 ml-1">IANA allocation history for {info.cidr}</span>
      </div>

      {matches.length === 0 ? (
        <div className="p-4 rounded-xl border border-white/10 text-center">
          <div className="text-2xl mb-2">🌐</div>
          <div className="text-[10px] font-mono text-gray-400">Public routable space — assigned through RIR (ARIN/RIPE/APNIC/LACNIC/AFRINIC).</div>
          <div className="text-[8px] font-mono text-gray-600 mt-1">No special IANA reservation applies to {info.cidr}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <motion.div key={m.range} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
              className="flex gap-3 rounded-xl p-3 border"
              style={{background:`${m.color}08`, borderColor:`${m.color}25`}}>
              <div className="w-12 text-center shrink-0">
                <div className="text-[10px] font-black font-mono" style={{color:m.color}}>{m.year}</div>
                <div className="text-[7px] font-mono text-gray-600">{m.rfc}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-[9px] font-bold font-mono" style={{color:m.color}}>{m.range}</code>
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                    style={{background:`${m.color}15`, color:m.color, border:`1px solid ${m.color}30`}}>
                    {m.label}
                  </span>
                </div>
                <div className="text-[8px] font-mono text-gray-500 leading-relaxed">{m.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mini timeline bar */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-[7px] font-mono text-gray-600 mb-2 uppercase tracking-widest">IPv4 History</div>
        <div className="relative h-4 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.04)'}}>
          {[{y:1981,l:'IPv4'},{y:1993,l:'CIDR'},{y:1996,l:'RFC1918'},{y:2011,l:'Exhaustion'},{y:2024,l:'Now'}].map((e,i,arr)=>{
            const pct = ((e.y - 1981) / (2024-1981)) * 100;
            return (
              <div key={e.y} className="absolute top-0 bottom-0 flex items-center" style={{left:`${pct}%`}}>
                <div className="w-px h-full bg-white/10"/>
                <span className="text-[6px] font-mono text-gray-700 ml-0.5 whitespace-nowrap">{e.l}</span>
              </div>
            );
          })}
          <div className="absolute top-1 bottom-1 rounded-full" style={{
            left:`${((info.isPrivate?1996:2000)-1981)/(2024-1981)*100}%`,
            width:'4px', background: info.isPrivate?'#10b981':'#3b82f6'
          }}/>
        </div>
      </div>
    </div>
  );
}
