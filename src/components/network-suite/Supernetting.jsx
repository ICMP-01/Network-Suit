import React, { useState, useMemo } from 'react';
import { useSuite, CertTag } from './SuiteContext';
import { BinaryWalkthrough, AggregateValidator, HierarchicalSummarization } from './SupernettingExtras';

// ── Supernetting / Route Aggregation Engine ───────────────────────────────────
function ipToInt(ip) {
  return ip.split('.').reduce((a,b) => (a<<8)|parseInt(b,10), 0) >>> 0;
}
function intToIp(n) {
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
}
function longestCommonPrefix(ints) {
  if (!ints.length) return 0;
  let prefix = 32;
  for (let b = 31; b >= 0; b--) {
    const bit = (ints[0] >>> b) & 1;
    if (!ints.every(x => ((x >>> b) & 1) === bit)) { prefix = 31 - b; break; }
  }
  return prefix;
}
function aggregate(networks) {
  const parsed = networks.map(n => {
    const [ip, p] = n.split('/');
    return { ip, prefix: parseInt(p,10), int: ipToInt(ip) };
  }).filter(x => !isNaN(x.prefix));
  if (!parsed.length) return null;
  const sorted = [...parsed].sort((a,b) => a.int - b.int);
  const ints = sorted.map(x => x.int);
  const lcp = longestCommonPrefix(ints);
  const maskInt = lcp === 0 ? 0 : (0xffffffff << (32-lcp)) >>> 0;
  const netInt = (ints[0] & maskInt) >>> 0;
  const bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;
  const waste = sorted.reduce((acc,x) => acc + Math.pow(2,32-x.prefix), 0);
  const blockSize = Math.pow(2, 32-lcp);
  return {
    network: intToIp(netInt),
    prefix: lcp,
    mask: intToIp(maskInt),
    broadcast: intToIp(bcastInt),
    cidr: `${intToIp(netInt)}/${lcp}`,
    blockSize,
    waste: blockSize - waste,
    efficiency: ((waste/blockSize)*100).toFixed(1),
    sorted,
  };
}

// ── Topology showing aggregated block ────────────────────────────────────────
function AggregationTopology({ result, inputs }) {
  if (!result) return null;
  return (
    <div className="rounded-2xl p-5 ns-glass-cyan">
      <div className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400 mb-4">
        Route Aggregation Topology — {result.cidr}
      </div>
      <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Upstream BGP */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="topo-node flex flex-col items-center gap-0.5" style={{borderColor:'rgba(255,255,255,0.15)',minWidth:110}}>
            <span className="text-[11px]">🌐</span>
            <span className="text-[8px] font-bold text-white">ISP / BGP Peer</span>
            <span className="text-[7px] text-amber-400 font-mono">Sees: {result.cidr}</span>
            <span className="text-[6px] text-gray-600 font-mono">1 route instead of {inputs.length}</span>
          </div>
        </div>
        {/* Arrow */}
        <div className="flex items-center self-center" style={{minWidth:40}}>
          <div style={{flex:1,borderTop:'2px dashed rgba(6,182,212,0.5)'}} />
          <span className="text-cyan-400 text-xs">←</span>
        </div>
        {/* Aggregating router */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="topo-node flex flex-col items-center gap-0.5" style={{borderColor:'rgba(16,185,129,0.4)',minWidth:120}}>
            <span className="text-[11px]">📡</span>
            <span className="text-[8px] font-bold text-green-400">ABR / Aggregating Router</span>
            <span className="text-[7px] text-cyan-400 font-mono">Advertises: {result.cidr}</span>
            <span className="text-[6px] text-gray-500 font-mono">ip route {result.network} {result.mask}</span>
          </div>
        </div>
        {/* Branches to each subnet */}
        <div style={{borderLeft:'2px dashed rgba(6,182,212,0.3)',marginLeft:4,paddingLeft:8}} className="flex flex-col gap-2">
          {result.sorted.map((s,i) => {
            const COLORS=['#06b6d4','#a855f7','#22c55e','#f97316','#eab308','#f43f5e'];
            const c = COLORS[i%COLORS.length];
            return (
              <div key={s.ip+s.prefix} className="flex items-center gap-2">
                <div style={{width:16,borderTop:`1.5px dashed ${c}60`}} />
                <div className="topo-node" style={{borderColor:`${c}40`,minWidth:110}}>
                  <div className="text-[8px] font-bold" style={{color:c}}>{s.ip}/{s.prefix}</div>
                  <div className="text-[6px] text-gray-600 font-mono">block {Math.pow(2,32-s.prefix)} addrs</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-3 text-[8px] font-mono">
        <div><span className="text-gray-500">Aggregate: </span><span className="text-cyan-400 font-bold">{result.cidr}</span></div>
        <div><span className="text-gray-500">Block size: </span><span className="text-green-400 font-bold">{result.blockSize.toLocaleString()} IPs</span></div>
        <div><span className="text-gray-500">Efficiency: </span><span className={result.efficiency>=75?'text-green-400 font-bold':'text-orange-400 font-bold'}>{result.efficiency}%</span></div>
      </div>
    </div>
  );
}

const EXAMPLES = [
  { name: 'Four contiguous /24s → /22', nets: ['192.168.0.0/24','192.168.1.0/24','192.168.2.0/24','192.168.3.0/24'] },
  { name: 'Two /25s → /24', nets: ['10.1.0.0/25','10.1.0.128/25'] },
  { name: 'Mixed /24 + /25 (imperfect)', nets: ['172.16.0.0/24','172.16.1.0/24','172.16.2.0/25'] },
  { name: 'ISP PoP links (/30s → /28)', nets: ['203.0.113.0/30','203.0.113.4/30','203.0.113.8/30','203.0.113.12/30'] },
];

export default function Supernetting() {
  const { certPrepMode } = useSuite();
  const [nets, setNets] = useState(['192.168.0.0/24','192.168.1.0/24','192.168.2.0/24','192.168.3.0/24']);
  const [showTheory, setShowTheory] = useState(false);
  const result = useMemo(() => aggregate(nets.filter(n=>n.trim())), [nets]);

  const updateNet = (i,v) => setNets(prev => { const n=[...prev]; n[i]=v; return n; });
  const addNet = () => setNets(prev=>[...prev,'']);
  const removeNet = (i) => setNets(prev=>prev.filter((_,j)=>j!==i));
  const loadExample = (ex) => setNets(ex.nets);

  const theory = [
    { q:'What is supernetting?', a:'Supernetting (also called route aggregation or summarization) combines multiple contiguous, same-sized subnet blocks into a single shorter-prefix route. Where subnetting divides, supernetting combines. A set of four /24 networks (192.168.0–3.x) shares the 22 high-order bits, so they can be advertised as one /22.' },
    { q:'The math: longest common prefix', a:'Given N networks, align them as 32-bit binary numbers. Find the rightmost bit position where they all agree. That position becomes the new prefix length. Example: 192.168.0.0 = 11000000.10101000.00000000.x and 192.168.1.0 = 11000000.10101000.00000001.x share 23 bits → /23.' },
    { q:'Alignment requirement', a:'Supernets MUST start on a boundary aligned to the block size. You can\'t aggregate 192.168.1.0/24 and 192.168.2.0/24 cleanly — the block 192.168.0.0/22 covers .0 through .3, but starts at .0. If your subnets don\'t fit neatly, the aggregate may include addresses you don\'t own.' },
    { q:'BGP route aggregation', a:'BGP tables contain ~950,000 prefixes. Without aggregation, every /24 in a /16 block would be a separate entry. ISPs use "ip summary-address" and "aggregate-address" to advertise one aggregate. Smaller routing tables = faster convergence, less memory, less CPU.' },
    { q:'OSPF area summarization', a:'OSPF ABRs summarize inter-area routes. "area 1 range 10.1.0.0 255.255.0.0" advertises one /16 instead of every /24 in Area 1. This reduces LSA flooding across the backbone and speeds up SPF calculations in large networks.' },
    { q:'Supernetting vs. CIDR vs. VLSM', a:'VLSM subdivides (longer prefixes). CIDR is the framework allowing variable-length prefixes. Supernetting aggregates (shorter prefixes). All three work together: VLSM allocates efficiently, CIDR represents the result, supernetting summarizes for routing.' },
    { q:'Waste in aggregation', a:'If your blocks aren\'t perfectly contiguous, the aggregate includes "holes" — address space you don\'t own but your aggregate claims. A router using that aggregate must have more-specific routes for the holes, or traffic will blackhole. Always verify efficiency %.' },
  ];

  return (
    <div className="flex gap-0 min-h-screen" style={{background:'transparent'}}>
      {/* LEFT */}
      <div className="flex-1 min-w-0 p-6 pb-10 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden ns-glass-cyan">
          <div className="absolute right-4 top-4 text-[60px] opacity-[0.04] font-black select-none">SUPER</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{background:'rgba(6,182,212,0.15)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.3)'}}>ADVANCED</span>
            {certPrepMode && <CertTag obj="CCNA §22.5" />}
            {certPrepMode && <CertTag obj="Net+ N10-009 §2.4" />}
            <span className="text-[9px] font-mono text-gray-500">RFC 1338 · Route Aggregation</span>
          </div>
          <h2 className="text-lg font-black text-white mb-0.5">Supernetting & Route Aggregation</h2>
          <p className="text-[11px] font-mono text-gray-300 max-w-xl">Supernetting combines multiple contiguous subnet blocks into a single shorter-prefix route. The inverse of subnetting. Essential for BGP route aggregation, OSPF summarization, and keeping global routing tables manageable.</p>
        </div>

        {/* Quick examples */}
        <div>
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">Quick Examples</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex.name} onClick={()=>loadExample(ex)}
                className="text-[8px] font-mono px-3 py-1.5 rounded-lg transition-all hover:brightness-125"
                style={{background:'rgba(6,182,212,0.08)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.2)'}}>
                {ex.name}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="rounded-2xl p-5 space-y-3 ns-glass-cyan">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-mono uppercase tracking-widest text-cyan-400">Networks to Aggregate</label>
            <button onClick={addNet} className="text-[8px] font-mono font-bold px-2.5 py-1 rounded-full"
              style={{background:'rgba(6,182,212,0.15)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.3)'}}>+ Add Network</button>
          </div>
          <div className="space-y-2">
            {nets.map((n,i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{background:`hsl(${i*55},80%,65%)`}} />
                <input value={n} onChange={e=>updateNet(i,e.target.value)} placeholder="e.g. 192.168.0.0/24"
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
                  style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(6,182,212,0.2)'}} />
                <button onClick={()=>removeNet(i)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {label:'Aggregate CIDR', value:result.cidr,      color:'#06b6d4'},
                {label:'Subnet Mask',   value:result.mask,       color:'#f97316'},
                {label:'Block Size',    value:result.blockSize.toLocaleString(), color:'#a855f7'},
                {label:'Efficiency',    value:`${result.efficiency}%`, color: parseFloat(result.efficiency)>=75?'#22c55e':'#f97316'},
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 ns-glass">
                  <div className="text-[8px] font-mono text-gray-400 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className="text-[15px] font-black font-mono" style={{color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Network detail */}
            <div className="rounded-2xl p-5 ns-glass">
              <div className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400 mb-3">Aggregate Details{certPrepMode && <CertTag obj="CCNA §22.5" />}</div>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                {[
                  {l:'Network Address', v:result.network, c:'#06b6d4'},
                  {l:'Prefix Length',   v:`/${result.prefix}`, c:'#a855f7'},
                  {l:'Subnet Mask',     v:result.mask,    c:'#f97316'},
                  {l:'Broadcast',       v:result.broadcast,c:'#ef4444'},
                  {l:'Block Size',      v:result.blockSize.toLocaleString()+' IPs', c:'#22c55e'},
                  {l:'Wasted Space',    v:result.waste > 0 ? result.waste.toLocaleString()+' IPs' : 'None — perfect', c:result.waste>0?'#f97316':'#22c55e'},
                ].map(x => (
                  <div key={x.l} className="flex items-center gap-2">
                    <span className="text-gray-500 w-28 shrink-0">{x.l}:</span>
                    <span style={{color:x.c}} className="font-bold">{x.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual block allocation */}
            <div className="rounded-2xl p-5 ns-glass">
              <div className="text-[8px] font-black font-mono uppercase tracking-widest text-gray-400 mb-3">Block Visualization — /{result.prefix}</div>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {result.sorted.map((s,i) => {
                  const COLORS=['#06b6d4','#a855f7','#22c55e','#f97316','#eab308','#f43f5e'];
                  const size = Math.pow(2,32-s.prefix);
                  const pct = (size/result.blockSize*100).toFixed(1);
                  return (
                    <div key={s.ip} title={`${s.ip}/${s.prefix} (${pct}%)`}
                      style={{width:`${pct}%`,background:COLORS[i%COLORS.length],opacity:0.75}} />
                  );
                })}
                {parseFloat(result.efficiency) < 100 && (
                  <div style={{flex:1,background:'rgba(239,68,68,0.15)',borderLeft:'1px dashed rgba(239,68,68,0.3)'}}
                    title="Wasted/unowned space in aggregate" />
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {result.sorted.map((s,i) => {
                  const COLORS=['#06b6d4','#a855f7','#22c55e','#f97316','#eab308','#f43f5e'];
                  return (
                    <div key={s.ip} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm" style={{background:COLORS[i%COLORS.length]}} />
                      <span className="text-[7px] font-mono" style={{color:COLORS[i%COLORS.length]}}>{s.ip}/{s.prefix}</span>
                    </div>
                  );
                })}
                {parseFloat(result.efficiency)<100 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-red-900/50" />
                    <span className="text-[7px] font-mono text-red-500">Waste ({(100-parseFloat(result.efficiency)).toFixed(1)}%)</span>
                  </div>
                )}
              </div>
            </div>

            <AggregateValidator result={result} inputs={nets.filter(n=>n.trim())} />
            <BinaryWalkthrough result={result} />

            {/* Topology */}
            <AggregationTopology result={result} inputs={nets.filter(n=>n.trim())} />
          </div>
        )}

        {/* Theory */}
        <div className="rounded-2xl overflow-hidden ns-glass">
          <button onClick={()=>setShowTheory(t=>!t)} className="w-full flex items-center gap-2 px-5 py-3">
            <span className="text-[9px] font-black font-mono uppercase tracking-widest text-cyan-400">Supernetting Theory Deep-Dive</span>
            <span className="ml-auto text-gray-600 text-xs">{showTheory?'▲':'▼'}</span>
          </button>
          {showTheory && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/[0.05]">
              {theory.map(t => (
                <div key={t.q} className="rounded-lg p-3" style={{background:'rgba(0,0,0,0.2)'}}>
                  <div className="text-[9px] font-black text-cyan-300 mb-1">{t.q}</div>
                  <div className="text-[9px] font-mono text-gray-400 leading-relaxed">{t.a}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <HierarchicalSummarization />

      </div>

      {/* RIGHT */}
      <div className="w-[340px] shrink-0 border-l border-white/[0.04]" style={{background:'transparent'}}>
        <div className="p-4 space-y-4">

          <div className="rounded-xl p-4 ns-glass-cyan">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400 mb-3">Aggregation Rules</div>
            <div className="space-y-2">
              {[
                {rule:'Contiguity', desc:'Networks must be adjacent in address space — no gaps allowed in a clean aggregate'},
                {rule:'Power-of-2 count', desc:'Must aggregate 2, 4, 8, 16… blocks of equal size for a perfect supernet'},
                {rule:'Alignment', desc:'The aggregate must start at an address divisible by its block size'},
                {rule:'Same prefix', desc:'All constituent subnets should have the same prefix length for efficiency'},
                {rule:'Ownership', desc:'You must own all addresses in the aggregate, or more-specific routes will leak'},
              ].map(r => (
                <div key={r.rule} className="rounded-lg p-2.5 ns-glass">
                  <div className="text-[8px] font-bold text-cyan-300 mb-0.5">{r.rule}</div>
                  <div className="text-[8px] font-mono text-gray-400">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-purple-400 mb-3">Cisco Config Examples</div>
            <div className="space-y-2 text-[8px] font-mono">
              {[
                {label:'BGP aggregate', code:'aggregate-address 192.168.0.0 255.255.252.0 summary-only'},
                {label:'OSPF area range', code:'area 1 range 10.1.0.0 255.255.0.0'},
                {label:'EIGRP summary', code:'ip summary-address eigrp 100 172.16.0.0 255.255.0.0'},
                {label:'Static summary', code:'ip route 192.168.0.0 255.255.252.0 Null0'},
              ].map(c => (
                <div key={c.label} className="rounded-lg p-2" style={{background:'rgba(0,0,0,0.25)'}}>
                  <div className="text-gray-500 mb-0.5">{c.label}:</div>
                  <code className="text-cyan-400 text-[7px] break-all">{c.code}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-rose-400 mb-3">Key RFCs</div>
            <div className="space-y-1.5">
              {[
                {rfc:'RFC 1338',title:'Supernetting: Address Assignment and Aggregation', year:1992},
                {rfc:'RFC 1519',title:'CIDR: Addresses and Aggregation Strategy', year:1993},
                {rfc:'RFC 4271',title:'BGP-4: aggregate-address attribute', year:2006},
                {rfc:'RFC 2328',title:'OSPF v2: area range summarization', year:1998},
                {rfc:'RFC 7153',title:'IANA Registries for BGP Extended Communities', year:2014},
              ].map(r => (
                <div key={r.rfc} className="flex items-center gap-2">
                  <span className="text-[8px] font-black font-mono w-16 shrink-0" style={{color:'#fb7185'}}>{r.rfc}</span>
                  <span className="text-[8px] font-mono text-gray-500 flex-1">{r.title}</span>
                  <span className="text-[7px] font-mono text-gray-700">{r.year}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-amber-400 mb-3">BGP Table Impact</div>
            <div className="space-y-2 text-[8px] font-mono">
              <p className="text-gray-400 leading-relaxed">Without aggregation, the global BGP table would contain millions of entries — one per /24. ISPs mandate strict aggregation policies:</p>
              {[
                {item:'Tier-1 ISPs', desc:'Minimum prefix /24. Longer prefixes filtered'},
                {item:'Route flap damping', desc:'Unstable aggregates penalized, suppressed'},
                {item:'RPKI validation', desc:'Aggregates must match ROA records'},
                {item:'Bogon filtering', desc:'Aggregates containing RFC 1918 rejected'},
              ].map(x => (
                <div key={x.item} className="flex gap-2">
                  <span className="text-amber-400 font-bold shrink-0 w-28">{x.item}:</span>
                  <span className="text-gray-500">{x.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
