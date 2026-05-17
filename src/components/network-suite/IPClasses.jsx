import React, { useState } from 'react';
import { useSuite, CertTag } from './SuiteContext';
import { AddressSpaceRuler, QuickClassifier, ArpanetMap, ClassfulVsCidr, OctetPatternTrainer } from './IPClassesExtras';

const CLASSES = [
  {
    cls: 'A', range: '1–126', firstOctet: '1–126', defaultMask: '255.0.0.0', prefix: '/8',
    networks: '128', hostsPerNet: '16,777,214', totalAddrs: '2,147,483,648',
    color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',
    binary: '0xxxxxxx',
    private: '10.0.0.0/8',
    use: 'Large enterprises, governments, ISPs. Historically assigned to organizations like IBM (9.x.x.x), Apple (17.x.x.x), MIT (18.x.x.x).',
    examples: [
      { org: 'IBM', block: '9.0.0.0/8' },
      { org: 'Apple', block: '17.0.0.0/8' },
      { org: 'MIT', block: '18.0.0.0/8' },
      { org: 'Ford Motor', block: '19.0.0.0/8' },
    ],
    quirks: '0.x.x.x (network 0) and 127.x.x.x (loopback) are reserved, reducing usable Class A space from 128 to 126 networks.',
    subnetting: 'A single /8 can be subnetted into 256× /16s or 65,536× /24s. Enterprise networks like AWS use entire /8 allocations internally.',
  },
  {
    cls: 'B', range: '128–191', firstOctet: '128–191', defaultMask: '255.255.0.0', prefix: '/16',
    networks: '16,384', hostsPerNet: '65,534', totalAddrs: '1,073,741,824',
    color: '#a855f7', glow: 'rgba(168,85,247,0.3)',
    binary: '10xxxxxx',
    private: '172.16.0.0/12',
    use: 'Mid-size enterprises, universities, regional ISPs. Many universities received /16 blocks in the 1980s.',
    examples: [
      { org: 'CMU', block: '128.2.0.0/16' },
      { org: 'MIT LCS', block: '128.30.0.0/16' },
      { org: 'DoD', block: '140.142.0.0/16' },
      { org: 'NASA', block: '128.102.0.0/16' },
    ],
    quirks: 'Class B has 14 network bits (bits 2–15) and 16 host bits. The 10xxxxxx pattern in the first octet identifies it immediately.',
    subnetting: 'A /16 is often split into 256× /24s for campus networks. Each /24 segment maps to one floor or department.',
  },
  {
    cls: 'C', range: '192–223', firstOctet: '192–223', defaultMask: '255.255.255.0', prefix: '/24',
    networks: '2,097,152', hostsPerNet: '254', totalAddrs: '536,870,912',
    color: '#22c55e', glow: 'rgba(34,197,94,0.3)',
    binary: '110xxxxx',
    private: '192.168.0.0/16',
    use: 'Small businesses, home networks, IoT segments. The most common class in modern use. 192.168.x.x is universally recognized as a private range.',
    examples: [
      { org: 'Home Router Default', block: '192.168.1.0/24' },
      { org: 'Office LAN', block: '192.168.0.0/24' },
      { org: 'Guest VLAN', block: '192.168.100.0/24' },
      { org: 'IoT Segment', block: '192.168.200.0/24' },
    ],
    quirks: '21 network bits, only 8 host bits. With VLSM, a /24 can be split into smaller segments: /25 (126 hosts), /26 (62), /27 (30).',
    subnetting: 'The /24 boundary is so common that network engineers treat it as the default. "Classful" thinking still persists even in CIDR environments.',
  },
  {
    cls: 'D', range: '224–239', firstOctet: '224–239', defaultMask: 'N/A (Multicast)',  prefix: 'N/A',
    networks: 'N/A', hostsPerNet: 'N/A', totalAddrs: '268,435,456',
    color: '#f97316', glow: 'rgba(249,115,22,0.3)',
    binary: '1110xxxx',
    private: 'N/A',
    use: 'Multicast group addressing. One sender → many receivers without unicast overhead. OSPF, RIP, PIM all use Class D addresses.',
    examples: [
      { org: 'All Hosts', block: '224.0.0.1' },
      { org: 'All Routers', block: '224.0.0.2' },
      { org: 'OSPF Routers', block: '224.0.0.5/6' },
      { org: 'RIPv2', block: '224.0.0.9' },
    ],
    quirks: 'Class D has no subnet mask — it is a group identifier, not a network. Hosts join multicast groups via IGMP. PIM-SM manages multicast trees.',
    subnetting: 'Not subnetted. The 28-bit group ID identifies up to 268M multicast groups. IANA controls permanent assignments; 224.0.0.0/24 is link-local.',
  },
  {
    cls: 'E', range: '240–255', firstOctet: '240–255', defaultMask: 'N/A (Reserved)', prefix: 'N/A',
    networks: 'N/A', hostsPerNet: 'N/A', totalAddrs: '268,435,456',
    color: '#ef4444', glow: 'rgba(239,68,68,0.3)',
    binary: '1111xxxx',
    private: 'N/A',
    use: 'Reserved for experimental and future use (RFC 1112). Never allocated for public internet. 255.255.255.255 is the limited broadcast address.',
    examples: [
      { org: 'Limited Broadcast', block: '255.255.255.255' },
      { org: 'Experimental', block: '240.0.0.0/4' },
      { org: 'Research Use', block: '240.1.0.0–254.x.x.x' },
      { org: 'Never Routed', block: '(filtered at all ISP borders)' },
    ],
    quirks: 'RFC 3330 and RFC 5735 document these as "reserved." Some proposals (RFC 6890) suggest reclaiming 240–254 for unicast to extend IPv4 lifetime.',
    subnetting: 'Not usable. ISP border routers drop all Class E packets. 255.255.255.255 is a special case — the DHCP/BOOTP broadcast address.',
  },
];

const SPECIAL = [
  { range: '0.0.0.0/8',       desc: 'This network — source address before DHCP assignment (RFC 1122)' },
  { range: '10.0.0.0/8',      desc: 'Private Class A — RFC 1918. 16M addresses, single org internal use' },
  { range: '100.64.0.0/10',   desc: 'Shared Address Space — carrier-grade NAT (RFC 6598)' },
  { range: '127.0.0.0/8',     desc: 'Loopback — 127.0.0.1 is "localhost", never leaves the host' },
  { range: '169.254.0.0/16',  desc: 'Link-Local / APIPA — auto-assigned when DHCP fails (RFC 3927)' },
  { range: '172.16.0.0/12',   desc: 'Private Class B range — RFC 1918. 172.16–172.31.x.x' },
  { range: '192.0.0.0/24',    desc: 'IETF Protocol Assignments (RFC 6890)' },
  { range: '192.0.2.0/24',    desc: 'TEST-NET-1 — documentation and examples only (RFC 5737)' },
  { range: '192.88.99.0/24',  desc: 'IPv6-to-IPv4 relay anycast (deprecated, RFC 7526)' },
  { range: '192.168.0.0/16',  desc: 'Private Class C range — RFC 1918. Home/office networks' },
  { range: '198.18.0.0/15',   desc: 'Benchmarking — network device performance testing (RFC 2544)' },
  { range: '198.51.100.0/24', desc: 'TEST-NET-2 — documentation only (RFC 5737)' },
  { range: '203.0.113.0/24',  desc: 'TEST-NET-3 — documentation only (RFC 5737)' },
  { range: '224.0.0.0/4',     desc: 'Class D — Multicast (RFC 5771)' },
  { range: '240.0.0.0/4',     desc: 'Class E — Reserved/Experimental (RFC 1112)' },
  { range: '255.255.255.255', desc: 'Limited broadcast — DHCP DISCOVER, stays on local segment' },
];

export default function IPClasses() {
  const { certPrepMode } = useSuite();
  const [active, setActive] = useState('A');
  const cls = CLASSES.find(c => c.cls === active);

  return (
    <div className="flex gap-0 min-h-screen" style={{background:'transparent'}}>
      {/* LEFT */}
      <div className="flex-1 min-w-0 p-6 pb-10 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden ns-glass" style={{borderColor:`${cls.glow}`}}>
          <div className="absolute right-4 top-4 text-[60px] opacity-[0.04] font-black select-none">CLASS</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{background:'rgba(59,130,246,0.15)',color:'#93c5fd',border:'1px solid rgba(59,130,246,0.3)'}}>BEGINNER</span>
            <span className="text-[9px] font-mono text-gray-500">RFC 791 · Classful Networking{certPrepMode && <CertTag obj="CCNA §1.6" />}{certPrepMode && <CertTag obj="Net+ N10-009 §2.1" />}</span>
          </div>
          <h2 className="text-lg font-black text-white mb-0.5">IP Address Classes</h2>
          <p className="text-[11px] font-mono text-gray-300 max-w-xl">The original IPv4 address space (RFC 791, 1981) was divided into five classes based on the high-order bits of the first octet. While CIDR (1993) replaced classful routing, understanding classes remains essential for reading legacy configs, understanding private ranges, and multicast design.</p>
        </div>

        {/* Class selector tabs */}
        <div className="flex gap-2 flex-wrap">
          {CLASSES.map(c => (
            <button key={c.cls} onClick={()=>setActive(c.cls)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black font-mono transition-all"
              style={{
                background: active===c.cls ? `${c.color}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active===c.cls ? c.color+'55' : 'rgba(255,255,255,0.08)'}`,
                color: active===c.cls ? c.color : '#64748b',
                boxShadow: active===c.cls ? `0 0 20px ${c.glow}` : 'none',
              }}>
              Class {c.cls}
              <span className="text-[8px] font-mono opacity-70">{c.range}</span>
            </button>
          ))}
        </div>

        <AddressSpaceRuler />
        <QuickClassifier />

        {/* Selected class detail */}
        <div className="rounded-2xl p-6 ns-glass" style={{borderColor:`${cls.color}30`}}>
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black"
                  style={{background:`${cls.color}18`,border:`2px solid ${cls.color}40`,color:cls.color}}>
                  {cls.cls}
                </div>
                <div>
                  <div className="text-lg font-black text-white">Class {cls.cls}</div>
                  <div className="text-[10px] font-mono" style={{color:cls.color}}>First octet: {cls.firstOctet} · Binary: <span className="font-black">{cls.binary}</span></div>
                </div>
              </div>
              <p className="text-[10px] font-mono text-gray-300 max-w-2xl leading-relaxed">{cls.use}</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              {label:'Default Mask', value:cls.defaultMask, color:cls.color},
              {label:'Prefix',       value:cls.prefix,       color:cls.color},
              {label:'Networks',     value:cls.networks,     color:'#22c55e'},
              {label:'Hosts/Net',    value:cls.hostsPerNet,  color:'#a855f7'},
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3.5 ns-glass">
                <div className="text-[8px] font-mono text-gray-400 uppercase tracking-widest mb-1">{s.label}</div>
                <div className="text-[13px] font-black font-mono" style={{color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Private range + quirk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {cls.private !== 'N/A' && (
              <div className="rounded-xl p-4 ns-glass">
                <div className="text-[8px] font-black font-mono uppercase tracking-widest mb-2" style={{color:cls.color}}>RFC 1918 Private Range{certPrepMode && <CertTag obj="CCNA §1.8" />}</div>
                <div className="text-sm font-black font-mono text-white">{cls.private}</div>
                <div className="text-[8px] font-mono text-gray-400 mt-1">Not routable on public internet — NAT required</div>
              </div>
            )}
            <div className="rounded-xl p-4 ns-glass">
              <div className="text-[8px] font-black font-mono uppercase tracking-widest mb-2 text-yellow-400">Quirks & Gotchas{certPrepMode && <CertTag obj="CCNA §1.7" />}</div>
              <div className="text-[9px] font-mono text-gray-300 leading-relaxed">{cls.quirks}</div>
            </div>
          </div>

          {/* Subnetting note */}
          <div className="rounded-xl p-4 ns-glass mb-5">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest mb-2 text-cyan-400">Subnetting This Class</div>
            <div className="text-[9px] font-mono text-gray-300 leading-relaxed">{cls.subnetting}</div>
          </div>

          {/* Real examples */}
          <div>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-gray-500 mb-3">Real-World Assignments</div>
            <div className="grid grid-cols-2 gap-2">
              {cls.examples.map(e => (
                <div key={e.org} className="flex items-center gap-3 rounded-xl p-3 ns-glass">
                  <div className="w-1.5 h-8 rounded-full shrink-0" style={{background:`linear-gradient(to bottom, ${cls.color}, ${cls.color}40)`}} />
                  <div>
                    <div className="text-[9px] font-bold text-white">{e.org}</div>
                    <div className="text-[8px] font-mono" style={{color:cls.color}}>{e.block}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ClassfulVsCidr />

        {/* Class comparison table */}
        <div className="rounded-2xl overflow-hidden ns-glass">
          <div className="px-5 py-3" style={{background:'rgba(255,255,255,0.03)'}}>
            <span className="text-[8px] font-black font-mono uppercase tracking-widest text-white">Full Class Comparison</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr style={{background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  {['Class','First Octet','Binary Pattern','Default Mask','Prefix','Networks','Hosts/Net','Private Range'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[8px] uppercase tracking-widest text-gray-500 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLASSES.map(c => (
                  <tr key={c.cls} onClick={()=>setActive(c.cls)}
                    className="border-t border-white/[0.04] cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{background:active===c.cls?`${c.color}0d`:undefined}}>
                    <td className="px-3 py-2 font-black text-sm" style={{color:c.color}}>{c.cls}</td>
                    <td className="px-3 py-2 text-gray-300">{c.firstOctet}</td>
                    <td className="px-3 py-2 font-mono text-yellow-400">{c.binary}</td>
                    <td className="px-3 py-2 text-orange-300">{c.defaultMask}</td>
                    <td className="px-3 py-2 text-cyan-400 font-bold">{c.prefix}</td>
                    <td className="px-3 py-2 text-gray-300">{c.networks}</td>
                    <td className="px-3 py-2 text-green-400">{c.hostsPerNet}</td>
                    <td className="px-3 py-2" style={{color:c.color}}>{c.private}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT panel */}
      <div className="w-[340px] shrink-0 border-l border-white/[0.04]" style={{background:'transparent'}}>
        <div className="p-4 space-y-4">

          {/* Binary pattern visual */}
          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest mb-3" style={{color:cls.color}}>First Octet Binary Patterns</div>
            <div className="space-y-2">
              {CLASSES.map(c => (
                <div key={c.cls} className="flex items-center gap-2">
                  <span className="text-[8px] font-black w-4" style={{color:c.color}}>{c.cls}</span>
                  <div className="flex gap-px font-mono">
                    {c.binary.split('').map((b,i) => (
                      <span key={i} className="w-5 h-5 flex items-center justify-center rounded text-[8px] font-black"
                        style={{
                          background: b==='1'?`${c.color}25`:b==='0'?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.02)',
                          color: b==='1'?c.color:b==='0'?'#ef4444':'#475569',
                          border: `1px solid ${b==='x'?'rgba(255,255,255,0.06)':b==='1'?`${c.color}40`:'rgba(239,68,68,0.3)'}`,
                        }}>
                        {b}
                      </span>
                    ))}
                  </div>
                  <span className="text-[7px] font-mono text-gray-600 ml-auto">{c.range}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[7px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:cls.color}}/> Fixed 1-bits</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-900/50"/> Fixed 0-bits</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white/5"/> Variable x</span>
            </div>
          </div>

          {/* Special addresses */}
          <div className="rounded-xl overflow-hidden ns-glass">
            <div className="px-4 py-2.5" style={{background:'rgba(255,255,255,0.03)'}}>
              <span className="text-[8px] font-black font-mono uppercase tracking-widest text-rose-400">Special & Reserved Ranges</span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto scrollbar-hide">
              {SPECIAL.map(s => (
                <div key={s.range} className="px-3 py-2 hover:bg-white/[0.02] transition-colors">
                  <div className="text-[8px] font-black font-mono text-cyan-400 mb-0.5">{s.range}</div>
                  <div className="text-[7px] font-mono text-gray-500">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* History timeline */}
          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-purple-400 mb-3">IPv4 History Timeline</div>
            <div className="space-y-2.5">
              {[
                {year:'1981', event:'RFC 791 — IPv4 published. Classful A/B/C/D/E defined'},
                {year:'1985', event:'RFC 950 — Subnet addressing. Variable masks within a class'},
                {year:'1988', event:'RFC 1009 — Supernetting first proposed'},
                {year:'1993', event:'RFC 1519 — CIDR replaces classful. Variable prefix lengths everywhere'},
                {year:'1994', event:'RFC 1631 — NAT published. Extends IPv4 address lifetime'},
                {year:'1996', event:'RFC 1918 — Private address space formalized (10/172/192.168)'},
                {year:'2011', event:'IANA exhausts all /8 blocks. Regional registries begin rationing'},
                {year:'2024', event:'IPv4 continues via NAT, shared space, IPv6 coexistence'},
              ].map(t => (
                <div key={t.year} className="flex gap-2">
                  <span className="text-[8px] font-black font-mono w-10 shrink-0 text-amber-400">{t.year}</span>
                  <span className="text-[8px] font-mono text-gray-400 leading-relaxed">{t.event}</span>
                </div>
              ))}
            </div>
          </div>

          <ArpanetMap />
          <OctetPatternTrainer />

        </div>
      </div>
    </div>
  );
}
