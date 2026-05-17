import React, { useState } from 'react';
import { useSuite, CertTag } from './SuiteContext';
import { CidrAggregator, Ipv4SpaceMap, IanaRegistry, BgpPolicyExplainer, AllocationTimeline } from './CIDRExtras';

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// CIDR table /0–/32
function buildTable() {
  const rows = [];
  for (let p = 0; p <= 32; p++) {
    const m = p === 0 ? 0 : (0xffffffff << (32-p)) >>> 0;
    const w = (~m) >>> 0;
    const oct = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
    const total = Math.pow(2, 32-p);
    const usable = p >= 31 ? (p===32?1:2) : total-2;
    const hostBits = 32-p;
    const netInt = m; // Since we are showing 0.0.0.0 based table, network address is 0
    const useCase = {
      0:'Default route — matches all IPs',
      1:'—',2:'—',3:'—',4:'—',5:'—',6:'—',7:'—',
      8:'Class A — 16M hosts, single org (10.x.x.x)',
      9:'—',10:'—',11:'—',12:'—',13:'—',14:'—',15:'—',
      16:'Class B — 65K hosts, large campus (172.16.x.x)',
      17:'—',18:'—',19:'—',20:'—',21:'—',22:'—',23:'ISP aggregation — 512 hosts',
      24:'Class C — 254 hosts, standard LAN (192.168.x.x)',
      25:'Half /24 — two VLANs from one /24',
      26:'Quarter /24 — 62 hosts',
      27:'1/8 of /24 — 30 hosts, small dept',
      28:'DMZ / server group — 14 hosts',
      29:'Tiny segment — 6 hosts',
      30:'WAN P2P link — 2 hosts',
      31:'RFC 3021 P2P — 2 hosts, no overhead',
      32:'Host route / loopback',
    }[p] || '—';
    rows.push({ p, mask: oct(m), wildcard: oct(w), hostBits, usable: usable.toLocaleString(), total: total.toLocaleString(), useCase, maskInt: m });
  }
  return rows;
}

const TABLE = buildTable();
const JUMPS = [8,16,24,25,26,27,28,29,30,31,32];

export default function CIDRReference() {
  const { certPrepMode } = useSuite();
  const [filter, setFilter] = useState('');
  const [highlight, setHighlight] = useState(null);
  const [showTheory, setShowTheory] = useState(false);

  const [searchIp, setSearchIp] = useState('');

  let filtered = TABLE;
  
  if (searchIp.trim()) {
    // If the user types an IP address, we check if it's a valid IP.
    // If valid, we find the longest matching prefix (which for 0.0.0.0 means any mask where IP & mask == 0... wait, no. 
    // The table shows 0.0.0.0/X blocks. ANY IP is technically in 0.0.0.0/0. 
    // Actually, "Prefix Search" means "If I have IP X and prefix Y, what is the network?" 
    // Let's adjust Prefix Search to just highlight matching string or if it's an IP, maybe show the network.
    // Wait, the requirement: "Type any IP — instantly find which CIDR block it falls in from the reference table"
    // Since the reference table is just generic /0 to /32 masks, maybe this means string filtering. Let's just do standard string filtering + if it's an exact match.
  }

  filtered = filtered.filter(r =>
    String(r.p).includes(filter) ||
    r.mask.includes(filter) ||
    r.wildcard.includes(filter) ||
    r.useCase.toLowerCase().includes(filter.toLowerCase())
  );

  // But let's actually implement a real "IP to Prefix Matcher" above the table.
  const checkPrefixMatch = (ipStr, prefix) => {
    try {
      const parts = ipStr.split('.');
      if (parts.length !== 4) return null;
      const int = ipToInt(ipStr);
      const mask = TABLE.find(t=>t.p === prefix).maskInt;
      const net = (int & mask) >>> 0;
      return [(net>>>24)&255,(net>>>16)&255,(net>>>8)&255,net&255].join('.');
    } catch { return null; }
  };

  const theory = [
    { q:'What is CIDR?', a:'Classless Inter-Domain Routing (RFC 1519, 1993) replaced the rigid Class A/B/C system. Instead of fixed 8/16/24-bit boundaries, CIDR allows any prefix length /0–/32. This enabled VLSM, route aggregation, and slowed IPv4 exhaustion by decades.' },
    { q:'Why was CIDR revolutionary?', a:'Before CIDR, organizations received full Class A (/8), B (/16), or C (/24) blocks regardless of actual need. A company needing 300 hosts got a /24 (254 hosts) or a /16 (65,534 hosts). CIDR lets ISPs assign exactly /23 (510 hosts), /22 (1022), etc. Routing tables shrank by 10x.' },
    { q:'Route aggregation (supernetting)', a:'Four /24 networks (192.168.0.0, .1.0, .2.0, .3.0) can be summarized as 192.168.0.0/22. One BGP advertisement replaces four. ISPs use this to keep the global routing table manageable. The internet\'s BGP table has ~900,000 prefixes without aggregation.' },
    { q:'Longest prefix match', a:'When a router has multiple matching routes, it uses the most specific (longest prefix). 192.168.1.5 matches 0.0.0.0/0 (default), 192.168.0.0/16, and 192.168.1.0/24. The /24 wins. This enables traffic engineering and hierarchical routing.' },
    { q:'CIDR notation in configs', a:'"192.168.1.0/24" means IP 192.168.1.0 with mask 255.255.255.0. BGP announces prefixes in CIDR. OSPF uses prefix length in LSAs. Cloud VPCs define subnets in CIDR. Firewall rules use CIDR ranges. Universal across all modern networking.' },
    { q:'Special CIDR prefixes', a:'/0 = 0.0.0.0/0 = default route, matches everything. /32 = single host. /31 = point-to-point pair (RFC 3021). /8 = Class A legacy boundary. /24 = Class C legacy. These boundaries are historical but the tools still respect them.' },
  ];

  return (
    <div className="flex gap-0 min-h-screen" style={{background:'transparent'}}>
      {/* LEFT */}
      <div className="flex-1 min-w-0 p-6 pb-10 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden ns-glass-blue">
          <div className="absolute right-4 top-4 text-[60px] opacity-[0.04] font-black select-none">CIDR</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{background:'rgba(59,130,246,0.15)',color:'#93c5fd',border:'1px solid rgba(59,130,246,0.3)'}}>REFERENCE</span>
            <span className="text-[9px] font-mono text-gray-600">RFC 1517–1519 · 1993</span>
          </div>
          <h2 className="text-lg font-black text-white mb-0.5">CIDR Reference Table</h2>
          <p className="text-[11px] font-mono text-gray-400 max-w-xl">Complete /0–/32 CIDR reference. Classless Inter-Domain Routing replaced classful networking in 1993 (RFC 1517–1519), enabling variable-length prefix allocation and eliminating rigid Class A/B/C boundaries.</p>
        </div>

        {/* Jump + Search */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[8px] font-mono text-gray-600">Jump:</span>
          {JUMPS.map(j => (
            <button key={j} onClick={()=>setHighlight(j)} className="text-[8px] font-mono font-bold px-2 py-0.5 rounded transition-all"
              style={{background:highlight===j?'rgba(59,130,246,0.3)':'rgba(59,130,246,0.1)',color:highlight===j?'#93c5fd':'#6b7280',border:`1px solid ${highlight===j?'rgba(59,130,246,0.5)':'rgba(59,130,246,0.15)'}`}}>
              /{j}
            </button>
          ))}
          <button onClick={()=>{setHighlight(null);setFilter('');}} className="text-[8px] font-mono px-2 py-0.5 rounded" style={{background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)'}}>Clear</button>
        </div>

        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter by prefix, mask, or use case…"
          className="w-full rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
          style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(59,130,246,0.2)'}} />

        {/* IP Prefix Calculator */}
        <div className="flex gap-2 items-center rounded-xl p-3 ns-glass-blue border border-blue-500/20">
          <span className="text-[10px] font-black font-mono uppercase text-blue-400 w-24">IP Matcher</span>
          <input value={searchIp} onChange={e=>setSearchIp(e.target.value)} placeholder="Enter IP (e.g. 192.168.1.50)"
            className="flex-1 rounded-lg px-3 py-1.5 text-[10px] font-mono text-white outline-none"
            style={{background:'rgba(0,0,0,0.4)',border:'1px solid rgba(59,130,246,0.3)'}} />
          <div className="text-[10px] font-mono text-emerald-400">
             {searchIp && highlight !== null ? `Network: ${checkPrefixMatch(searchIp, highlight) || 'Invalid IP'}/${highlight}` : 'Select a prefix above'}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden ns-glass">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr style={{background:'rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(55,65,81,0.4)'}}>
                {['Prefix','Subnet Mask','Wildcard Mask','Host Bits','Usable Hosts','Total IPs','Use Case'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[8px] uppercase tracking-widest text-gray-500 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isHL = highlight === r.p;
                return (
                  <tr key={r.p} onClick={()=>setHighlight(isHL?null:r.p)}
                    className="border-t border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{background:isHL?'rgba(59,130,246,0.08)':'transparent'}}>
                    <td className="px-3 py-2 font-black" style={{color:isHL?'#60a5fa':'#f1f5f9'}}>/{r.p}</td>
                    <td className="px-3 py-2" style={{color:'#fb923c'}}>{r.mask}</td>
                    <td className="px-3 py-2 text-gray-400">{r.wildcard}</td>
                    <td className="px-3 py-2 text-center" style={{color:'#4ade80'}}>{r.hostBits}</td>
                    <td className="px-3 py-2 font-bold" style={{color:'#a78bfa'}}>{r.usable}</td>
                    <td className="px-3 py-2 text-gray-300">{r.total}</td>
                    <td className="px-3 py-2 text-gray-500 italic">{r.useCase}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Theory */}
        <div className="rounded-2xl overflow-hidden ns-glass">
          <button onClick={()=>setShowTheory(t=>!t)} className="w-full flex items-center gap-2 px-5 py-3">
            <span className="text-[9px] font-black font-mono uppercase tracking-widest text-blue-400">CIDR Deep-Dive{certPrepMode && <CertTag obj="CCNA §22.3" />}{certPrepMode && <CertTag obj="Net+ N10-009 §2.3" />}</span>
            <span className="ml-auto text-gray-600 text-xs">{showTheory?'▲':'▼'}</span>
          </button>
          {showTheory && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/[0.05]">
              {theory.map(t => (
                <div key={t.q} className="rounded-lg p-3" style={{background:'rgba(0,0,0,0.2)'}}>
                  <div className="text-[9px] font-black text-blue-300 mb-1">{t.q}</div>
                  <div className="text-[9px] font-mono text-gray-400 leading-relaxed">{t.a}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <CidrAggregator />
        <Ipv4SpaceMap />
        <BgpPolicyExplainer />

      </div>

      {/* RIGHT */}
      <div className="w-[340px] shrink-0 border-l border-white/[0.04]" style={{background:'transparent'}}>
        <div className="p-4 space-y-4">

          {/* Highlighted prefix deep info */}
          {highlight !== null && (
            <div className="rounded-xl p-4 ns-glass-blue">
              <div className="text-[8px] font-black font-mono uppercase tracking-widest text-blue-400 mb-3">/{highlight} Details</div>
              {(() => {
                const r = TABLE[highlight];
                return (
                  <div className="space-y-1.5 text-[8px] font-mono">
                    {[
                      {l:'Mask',         v:r.mask,     c:'#fb923c'},
                      {l:'Wildcard',     v:r.wildcard, c:'#06b6d4'},
                      {l:'Host Bits',    v:r.hostBits, c:'#4ade80'},
                      {l:'Usable Hosts', v:r.usable,   c:'#a78bfa'},
                      {l:'Total IPs',    v:r.total,    c:'#f1f5f9'},
                      {l:'Use Case',     v:r.useCase,  c:'#94a3b8'},
                    ].map(x => (
                      <div key={x.l} className="flex gap-2">
                        <span className="text-gray-600 w-24 shrink-0">{x.l}:</span>
                        <span style={{color:x.c}} className="font-bold">{x.v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400 mb-3">CIDR Topology — Aggregation</div>
            <div className="space-y-2">
              <p className="text-[8px] font-mono text-gray-500 leading-relaxed mb-3">Four /24 subnets summarised into one /22 advertisement to upstream BGP peer:</p>
              <div className="topo-node mb-2" style={{borderColor:'rgba(255,255,255,0.15)'}}>
                <div className="text-[8px] font-bold text-white">🌐 ISP BGP Router</div>
                <div className="text-[7px] text-amber-400 font-mono">Receives: 192.168.0.0/22</div>
              </div>
              <div style={{marginLeft:20,borderLeft:'2px dashed rgba(6,182,212,0.4)',paddingLeft:12}} className="space-y-1.5">
                {['192.168.0.0/24','192.168.1.0/24','192.168.2.0/24','192.168.3.0/24'].map((net,i) => (
                  <div key={net} className="topo-node" style={{borderColor:`rgba(${i===0?'6,182,212':i===1?'168,85,247':i===2?'34,197,94':'249,115,22'},0.3)`}}>
                    <div className="text-[7px] font-mono" style={{color:['#06b6d4','#a855f7','#22c55e','#f97316'][i]}}>{net}</div>
                  </div>
                ))}
              </div>
              <p className="text-[7px] font-mono text-gray-600 mt-2">4 routes → 1 route. 75% table reduction via supernetting.</p>
            </div>
          </div>

          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-rose-400 mb-3">CIDR RFCs</div>
            <div className="space-y-1.5">
              {[
                {rfc:'RFC 1517',title:'Applicability Statement for CIDR', year:1993},
                {rfc:'RFC 1518',title:'CIDR: An Address Assignment and Aggregation Strategy', year:1993},
                {rfc:'RFC 1519',title:'CIDR: Addressing and Routing in the Internet', year:1993},
                {rfc:'RFC 4632',title:'CIDR: The Internet Address Architecture', year:2006},
                {rfc:'RFC 1338',title:'Supernetting: An Address Assignment and Aggregation Strategy', year:1992},
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
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-purple-400 mb-3">Global BGP Table Impact{certPrepMode && <CertTag obj="CCNA §24.1" />}</div>
            <div className="space-y-2 text-[8px] font-mono">
              {[
                {year:'1993',routes:'20,000',event:'Pre-CIDR classful'},
                {year:'1995',routes:'35,000',event:'CIDR adopted'},
                {year:'2000',routes:'80,000',event:'Dot-com growth'},
                {year:'2010',routes:'300,000',event:'Depletion concerns'},
                {year:'2024',routes:'950,000+',event:'Current (IPv4+v6)'},
              ].map(r => (
                <div key={r.year} className="flex items-center gap-2">
                  <span className="text-gray-600 w-10">{r.year}</span>
                  <span className="text-purple-400 font-bold w-20">{r.routes}</span>
                  <span className="text-gray-500">{r.event}</span>
                </div>
              ))}
            </div>
          </div>

          <IanaRegistry />
          <AllocationTimeline />

        </div>
      </div>
    </div>
  );
}
