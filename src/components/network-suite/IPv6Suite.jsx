import React, { useState } from 'react';
import { useSuite, CertTag } from './SuiteContext';
import { Copy, CheckCircle, Info } from 'lucide-react';
import { Eui64Calculator, PrivacyAddressGenerator, SolicitedNodeMulticast, DualStackViewer, ScopeClassifier, Ipv6AddressBuilder, TransitionExplorer, DhcpVsSlaac } from './IPv6Extras';

// ── IPv6 Logic ────────────────────────────────────────────────────────────────
function expandIPv6(addr) {
  if (!addr || addr.trim() === '') return null;
  let a = addr.trim().toLowerCase();
  // Handle ::
  if (a.includes('::')) {
    const sides = a.split('::');
    const left  = sides[0] ? sides[0].split(':') : [];
    const right = sides[1] ? sides[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0000');
    const groups = [...left, ...middle, ...right];
    return groups.map(g => g.padStart(4, '0'));
  }
  const groups = a.split(':');
  if (groups.length !== 8) return null;
  return groups.map(g => g.padStart(4, '0'));
}

function compressIPv6(groups) {
  if (!groups) return null;
  // Step 1: remove leading zeros
  const stripped = groups.map(g => parseInt(g, 16).toString(16));
  // Step 2: find longest run of zeros
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  stripped.forEach((g, i) => {
    if (g === '0') {
      if (curStart === -1) { curStart = i; curLen = 1; }
      else curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else { curStart = -1; curLen = 0; }
  });
  if (bestLen > 1) {
    const result = [
      ...stripped.slice(0, bestStart),
      null,
      ...stripped.slice(bestStart + bestLen),
    ];
    const parts = result.map(x => x === null ? '' : x);
    return parts.join(':').replace(/^:/, '::').replace(/:$/, '::').replace(/:::+/, '::');
  }
  return stripped.join(':');
}

function detectIPv6Type(groups) {
  if (!groups) return [];
  const types = [];
  const g = groups.map(x => parseInt(x, 16));
  const first = g[0];
  if (g.every(x => x === 0)) { types.push({ label: '::  Unspecified', color: '#6b7280', desc: 'The unspecified address — used as source before IP configuration (RFC 4291).' }); return types; }
  if (g.slice(0,7).every(x=>x===0) && g[7]===1) { types.push({ label: '::1  Loopback', color: '#22c55e', desc: 'The IPv6 loopback address. Equivalent to 127.0.0.1 in IPv4 (RFC 4291).' }); return types; }
  if (first === 0xfe80) types.push({ label: 'fe80::/10  Link-Local', color: '#f97316', desc: 'Link-local addresses are only valid within a single network link. They are automatically configured by all IPv6-capable interfaces (RFC 4291).' });
  if (first >= 0xfc00 && first <= 0xfdff) types.push({ label: 'fc00::/7  ULA (Unique Local)', color: '#a855f7', desc: 'Unique Local Addresses (ULA) are the IPv6 equivalent of RFC 1918 private IPv4 addresses. They are not routable on the global internet (RFC 4193).' });
  if ((first & 0xff00) === 0xff00) types.push({ label: 'ff00::/8  Multicast', color: '#eab308', desc: 'IPv6 multicast addresses are used to send packets to a group of interfaces simultaneously. IPv6 has no broadcast — multicast is used instead (RFC 4291).' });
  if (first >= 0x2000 && first <= 0x3fff) types.push({ label: '2000::/3  Global Unicast', color: '#06b6d4', desc: 'Globally routable unicast addresses. These are the public IPv6 addresses assigned by RIRs (IANA, RIPE, ARIN, etc.) and routable on the internet (RFC 4291).' });
  if (g.slice(0,5).every(x=>x===0) && g[5]===0xffff) types.push({ label: '::ffff:0:0/96  IPv4-Mapped', color: '#3b82f6', desc: 'IPv4-mapped IPv6 addresses embed a 32-bit IPv4 address in 128 bits. Used by dual-stack implementations to represent IPv4 connections in IPv6 sockets (RFC 4291).' });
  if (first === 0x2002) types.push({ label: '2002::/16  6to4', color: '#f43f5e', desc: '6to4 addresses embed a public IPv4 address to allow IPv6 connectivity over IPv4 infrastructure without explicit tunnels (RFC 3056). Now largely deprecated.' });
  if (types.length === 0) types.push({ label: 'Unknown / Reserved', color: '#6b7280', desc: 'This address does not match any well-known IPv6 address type category.' });
  return types;
}

function buildPTR(groups) {
  if (!groups) return null;
  return groups.join('').split('').reverse().join('.') + '.ip6.arpa';
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <button onClick={copy} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {copied ? <CheckCircle size={11} className="text-green-400"/> : <Copy size={11} className="text-gray-600 hover:text-gray-300"/>}
    </button>
  );
}

const EXAMPLES_IPV6 = ['2001:0db8:85a3::8a2e:0370:7334','fe80::1','::1','ff02::1','fc00::1','2002:c0a8:0101::','::ffff:192.168.1.1'];

function InteractiveCompressor({ groups, expanded, compressed }) {
  const [step, setStep] = useState(0); // 0: Start, 1: Remove leading zeros, 2: Collapse longest zero sequence

  // Find longest zero sequence to highlight
  const stripped = groups.map(g => parseInt(g, 16).toString(16));
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  stripped.forEach((g, i) => {
    if (g === '0') {
      if (curStart === -1) { curStart = i; curLen = 1; }
      else curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else { curStart = -1; curLen = 0; }
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setStep(0)} className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono ${step === 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/5 text-gray-400'}`}>1. Full Expansion</button>
        <button onClick={() => setStep(1)} className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono ${step === 1 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 text-gray-400'}`}>2. Trim Leading Zeros</button>
        <button onClick={() => setStep(2)} className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono ${step === 2 ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-white/5 text-gray-400'}`}>3. Collapse to ::</button>
      </div>

      <div className="rounded-xl p-6 bg-black/30 border border-white/10 flex items-center justify-center min-h-[120px]">
        <div className="flex items-center text-lg md:text-2xl font-mono font-black tracking-widest relative">
          {groups.map((group, i) => {
            const isZeroSequence = bestLen > 1 && i >= bestStart && i < bestStart + bestLen;
            const strippedVal = parseInt(group, 16).toString(16);
            
            // Animation states
            let displayVal = group;
            let opacityClass = "opacity-100";
            let colorClass = "text-white";
            let widthClass = "w-[4ch] text-center";
            
            if (step >= 1) {
               displayVal = strippedVal;
               colorClass = "text-purple-400";
               widthClass = "w-auto text-center px-1";
            }
            if (step >= 2 && isZeroSequence) {
               opacityClass = "opacity-0 scale-50 absolute"; // Hide the actual zeros
            }

            return (
              <React.Fragment key={i}>
                <div className={`transition-all duration-500 ease-in-out ${opacityClass} ${colorClass} ${widthClass}`}>
                  {step === 0 && (
                     // Show leading zeros as dim if step 0
                     <>
                       {group.split('').map((char, charIdx) => {
                         const firstNonZero = group.search(/[^0]/);
                         const isLeading = char === '0' && (firstNonZero === -1 ? charIdx < 3 : charIdx < firstNonZero);
                         return <span key={charIdx} className={isLeading ? 'text-gray-600' : 'text-blue-300'}>{char}</span>;
                       })}
                     </>
                  )}
                  {step >= 1 && displayVal}
                </div>
                {/* Colons */}
                {i < 7 && (
                  <span className={`mx-0.5 md:mx-1 text-gray-600 transition-all duration-500 ${step >= 2 && isZeroSequence && i >= bestStart && i < bestStart + bestLen - 1 ? 'opacity-0 scale-50 absolute' : 'opacity-100'}`}>
                    :
                  </span>
                )}
                
                {/* The :: replacement */}
                {step === 2 && i === Math.floor(bestStart + bestLen / 2) && bestLen > 1 && (
                  <span className="text-green-400 animate-pulse mx-2 font-bold text-3xl">::</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 mt-4">
        <div className="text-[9px] font-mono text-gray-400 mb-1">FINAL CANONICAL FORM (RFC 5952)</div>
        <code className="text-lg font-black font-mono text-green-400">{compressed}</code>
      </div>
    </div>
  );
}

export default function IPv6Suite() {
  const { certPrepMode } = useSuite();
  const [addr, setAddr] = useState('2001:0db8::1');
  const [tab, setTab] = useState('analyzer');

  const groups = expandIPv6(addr);
  const expanded = groups ? groups.join(':') : null;
  const compressed = groups ? compressIPv6(groups) : null;
  const types = detectIPv6Type(groups);
  const ptr = buildPTR(groups);

  // Compression steps for display
  const comprSteps = groups ? [
    { step: 1, title: 'Expand all groups to 4 digits', result: groups.join(':'), color: '#3b82f6' },
    { step: 2, title: 'Remove leading zeros per group', result: groups.map(g=>parseInt(g,16).toString(16)).join(':'), color: '#a855f7' },
    { step: 3, title: 'Replace longest run of zeros with ::', result: compressed || '—', color: '#22c55e' },
  ] : [];

  const TABS = [
    { id: 'analyzer', label: 'Address Analyzer' },
    { id: 'compress', label: 'Compress / Expand' },
    { id: 'ptr',      label: 'PTR Record' },
    { id: 'tools',    label: 'Generators & Tools' },
    { id: 'visuals',  label: 'Interactive Visuals' },
    { id: 'types',    label: 'Address Types' },
    { id: 'theory',   label: 'IPv6 Theory' },
  ];

  return (
    <div className="flex gap-0 min-h-screen" style={{background:'transparent'}}>

      {/* ── LEFT COLUMN ── */}
      <div className="flex-1 min-w-0 p-6 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <span className="text-lg">🌐</span>
          </div>
          <h1 className="text-xl font-black text-white">IPv6 Suite</h1>
          <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>EXPERT</span>
        </div>
        <p className="text-xs text-gray-500 font-mono">Complete IPv6 toolkit — address expansion, RFC 5952 compression, type detection, PTR record builder, EUI-64, and transition mechanisms.</p>
      </div>

      {/* Input */}
      <div className="rounded-2xl p-5 ns-glass-blue">
        <label className="text-[9px] font-mono uppercase tracking-widest text-blue-400 block mb-2">IPv6 Address</label>
        <input value={addr} onChange={e=>setAddr(e.target.value)}
          placeholder="e.g. 2001:db8::1"
          className="w-full rounded-xl px-4 py-2.5 text-sm font-mono text-blue-200 outline-none"
          style={{background:'rgba(0,0,0,0.25)',border:'1px solid rgba(59,130,246,0.3)'}} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES_IPV6.map(ex => (
            <button key={ex} onClick={()=>setAddr(ex)}
              className="text-[8px] font-mono px-2 py-1 rounded-full transition-colors hover:bg-blue-400/10"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', color: '#93c5fd' }}>
              {ex}
            </button>
          ))}
        </div>
      </div>


      {/* Type badges */}
      {groups && (
        <div className="flex flex-wrap gap-2">
          {types.map(t => (
            <span key={t.label} className="text-[9px] font-mono font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}35` }}>
              {t.label}
            </span>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(55,65,81,0.3)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
            style={{
              background: tab === t.id ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: tab === t.id ? '#93c5fd' : '#6b7280',
              border: tab === t.id ? '1px solid rgba(59,130,246,0.35)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Analyzer */}
      {tab === 'analyzer' && groups && (
        <div className="space-y-4">
          {[
            { label: 'Expanded (Full)', value: expanded, color: '#3b82f6', desc: 'All 128 bits written out — 8 groups of 4 hex digits separated by colons. No abbreviation.' },
            { label: 'Compressed (RFC 5952)', value: compressed, color: '#22c55e', desc: 'Canonical form per RFC 5952: leading zeros removed per group, longest consecutive all-zero groups replaced with ::.' },
          ].map(r => (
            <div key={r.label} className="group rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${r.color}25` }}>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: r.color }}>{r.label}</div>
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-bold" style={{ color: r.color }}>{r.value}</code>
                <CopyBtn value={r.value} />
              </div>
              <p className="text-[10px] text-gray-600 font-mono">{r.desc}</p>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Bits', value: '128', color: '#a855f7' },
              { label: 'RFC', value: types[0]?.label?.split(' ')[0] || '—', color: '#06b6d4' },
              { label: 'Scope', value: types[0]?.label?.includes('Global') ? 'Global' : types[0]?.label?.includes('Link') ? 'Link-Local' : types[0]?.label?.includes('ULA') ? 'Site-Local' : 'Special', color: '#eab308' },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: `${c.color}0d`, border: `1px solid ${c.color}25` }}>
                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">{c.label}</div>
                <div className="text-sm font-black font-mono" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          {types.map(t => (
            <div key={t.label} className="rounded-xl p-4 flex gap-3" style={{ background: `${t.color}08`, border: `1px solid ${t.color}20` }}>
              <Info size={13} style={{ color: t.color }} className="shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] font-bold font-mono mb-1" style={{ color: t.color }}>{t.label}</div>
                <div className="text-[10px] text-gray-500 font-mono leading-relaxed">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compress/Expand */}
      {tab === 'compress' && groups && (
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500 font-mono mb-4">RFC 5952 defines canonical text representation for IPv6 addresses. The three-step process below shows how any IPv6 address is reduced to its shortest, unambiguous form.</p>
          <InteractiveCompressor groups={groups} expanded={expanded} compressed={compressed} />
        </div>
      )}

      {/* PTR */}
      {tab === 'ptr' && groups && (
        <div className="space-y-4">
          <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
            IPv6 reverse DNS (PTR records) work differently from IPv4. Each hex <em>nibble</em> (4-bit character) of the expanded address is reversed individually and appended with <code className="text-cyan-400">.ip6.arpa</code>. This means a 128-bit address produces a 64-character PTR record.
          </p>
          <div className="rounded-2xl p-5 group" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(6,182,212,0.25)' }}>
            <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest mb-2">PTR Record (ARPA Format)</div>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-cyan-300 break-all">{ptr}</code>
              <CopyBtn value={ptr} />
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <div className="text-[9px] font-black font-mono text-cyan-400 uppercase tracking-wider mb-2">How it works</div>
            <div className="text-[10px] text-gray-500 font-mono leading-relaxed space-y-1">
              <p>1. Expand the address: <code className="text-blue-400">{expanded}</code></p>
              <p>2. Remove all colons to get 32 hex characters</p>
              <p>3. Reverse the character order</p>
              <p>4. Insert a dot after each character</p>
              <p>5. Append <code className="text-cyan-400">.ip6.arpa</code></p>
            </div>
          </div>
        </div>
      )}

      {/* New Tools Tab */}
      {tab === 'tools' && (
        <div className="space-y-6">
          <Eui64Calculator />
          <PrivacyAddressGenerator />
          <SolicitedNodeMulticast />
          <DualStackViewer />
          <ScopeClassifier />
        </div>
      )}

      {/* New Visuals Tab */}
      {tab === 'visuals' && (
        <div className="space-y-6">
          <Ipv6AddressBuilder />
          <TransitionExplorer />
          <DhcpVsSlaac />
        </div>
      )}

      {/* Address Types Reference */}
      {tab === 'types' && (
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500 font-mono">IPv6 does not use broadcast. Instead, it uses a rich address type system — multicast replaces broadcast, and link-local addresses replace ARP. Below is the complete reference.</p>
          {[
            { range: '::1/128', type: 'Loopback', color: '#22c55e', rfc: 'RFC 4291', desc: 'The IPv6 loopback address (≡ 127.0.0.1). Packets sent here never leave the host.' },
            { range: '::/128', type: 'Unspecified', color: '#6b7280', rfc: 'RFC 4291', desc: 'Used as source address before a node has an address assigned. Never routed.' },
            { range: 'fe80::/10', type: 'Link-Local', color: '#f97316', rfc: 'RFC 4291', desc: 'Automatically configured on every IPv6 interface. Only valid within a single link — never forwarded by routers. Used for NDP, SLAAC, and DHCPv6.' },
            { range: 'fc00::/7', type: 'Unique Local (ULA)', color: '#a855f7', rfc: 'RFC 4193', desc: 'Equivalent of RFC 1918 private addresses. Can be used freely within organisations but not routed on the public internet.' },
            { range: '2000::/3', type: 'Global Unicast (GUA)', color: '#06b6d4', rfc: 'RFC 4291', desc: 'Publicly routable addresses assigned by IANA → RIRs → ISPs → end users. The equivalent of public IPv4 addresses.' },
            { range: 'ff00::/8', type: 'Multicast', color: '#eab308', rfc: 'RFC 4291', desc: 'Packets sent to a group of interfaces. Replaces IPv4 broadcast. ff02::1 = all nodes, ff02::2 = all routers, ff02::5 = all OSPF routers.' },
            { range: '::ffff:0:0/96', type: 'IPv4-Mapped', color: '#3b82f6', rfc: 'RFC 4291', desc: 'Represents IPv4 addresses in IPv6 sockets. e.g. ::ffff:192.168.1.1. Used by dual-stack implementations.' },
            { range: '2002::/16', type: '6to4', color: '#f43f5e', rfc: 'RFC 3056', desc: 'Automatically tunnels IPv6 over IPv4. Now deprecated in favour of native dual-stack and other mechanisms.' },
            { range: '64:ff9b::/96', type: 'NAT64 / DNS64', color: '#ec4899', rfc: 'RFC 6146', desc: 'Used by NAT64 gateways to represent IPv4 addresses in IPv6. Allows IPv6-only hosts to communicate with IPv4 servers.' },
          ].map(t => (
            <div key={t.range} className="rounded-xl p-4 grid grid-cols-[120px_80px_1fr] gap-3 items-start" style={{ background: `${t.color}07`, border: `1px solid ${t.color}20` }}>
              <code className="text-[10px] font-mono font-bold" style={{ color: t.color }}>{t.range}</code>
              <div>
                <div className="text-[9px] font-mono font-bold text-gray-300">{t.type}</div>
                <div className="text-[8px] font-mono text-gray-600">{t.rfc}</div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      )}
      {/* Theory deep-dive */}
      {tab === 'theory' && (
        <div className="space-y-3">
          {[
            { title:'Why IPv6? The IPv4 Exhaustion Crisis', color:'#06b6d4',
              body:`IPv4 uses 32-bit addresses = 4.29 billion unique addresses. IANA allocated the last /8 blocks in February 2011. APNIC (Asia-Pacific) exhausted its pool the same month. RIPE NCC (Europe) exhausted free pool in September 2012. ARIN (North America) in September 2015. Solution: IPv6 with 128-bit addresses = 340 undecillion (3.4×10³⁸) addresses — enough for every atom on Earth's surface to have millions of IPs.` },
            { title:'IPv6 Header vs IPv4 Header', color:'#a855f7',
              body:`IPv4 header: 20–60 bytes, 14 fields, variable length, includes checksum (re-computed at every router hop).
IPv6 header: Fixed 40 bytes, only 8 fields, no checksum (handled by transport layer), no fragmentation at routers (only at source).
Key new fields: Traffic Class (QoS), Flow Label (identify flows without parsing transport header), Next Header (replaces IPv4 Protocol field, supports extension headers chain).` },
            { title:'Stateless Address Auto-Configuration (SLAAC)', color:'#10b981',
              body:`RFC 4862. IPv6 interfaces can self-configure without DHCP:
1. Generate link-local address: fe80:: + EUI-64 (MAC-derived) or random (RFC 7217)
2. Duplicate Address Detection (DAD): send Neighbor Solicitation to verify uniqueness
3. Router Solicitation → Router Advertisement (RA) from default gateway
4. RA contains: prefix (e.g. 2001:db8::/64), default gateway, MTU, lifetime
5. Host builds GUA: prefix + EUI-64 or random interface ID
Privacy Extensions (RFC 4941): randomise interface ID and rotate periodically.` },
            { title:'Neighbor Discovery Protocol (NDP)', color:'#f97316',
              body:`RFC 4861. NDP replaces ARP and ICMP Router Discovery:
• Router Solicitation (RS) — host → all-routers (ff02::2): "Any routers?"
• Router Advertisement (RA) — router → all-nodes (ff02::1): prefix, MTU, lifetime
• Neighbor Solicitation (NS) — "What is the MAC for this IP?" (replaces ARP Request)
• Neighbor Advertisement (NA) — "My MAC is..." (replaces ARP Reply)
• Redirect — router tells host of a better next hop
NDP uses ICMPv6 and multicast, not broadcast. Solicited-node multicast address: ff02::1:ffXX:XXXX (last 24 bits of IP).` },
            { title:'DHCPv6 vs SLAAC vs RDNSS', color:'#eab308',
              body:`Three ways to get addressing info in IPv6:
1. SLAAC only (M=0, O=0 in RA): self-configure address, no DNS via DHCP
2. SLAAC + RDNSS (RFC 8106): DNS servers in RA options — no DHCPv6 needed
3. Stateless DHCPv6 (M=0, O=1): SLAAC for address, DHCPv6 for DNS/domain
4. Stateful DHCPv6 (M=1): full address and config from DHCPv6 server (like IPv4 DHCP)
Windows and macOS prefer DHCPv6. Android/Linux prefer SLAAC+RDNSS.` },
            { title:'IPv6 Transition Mechanisms', color:'#f43f5e',
              body:`Getting from IPv4-only to dual-stack to IPv6-only:
• Dual-stack (RFC 4213): both protocols simultaneously — preferred approach
• 6to4 (RFC 3056): 2002::/16, embed IPv4 in IPv6, deprecated (security issues)
• Teredo (RFC 4380): tunnel IPv6 through IPv4 NAT, deprecated
• ISATAP: intra-site tunnel, deprecated
• 6rd (RFC 5969): ISP-grade 6to4 with custom prefix — widely deployed
• DS-Lite (RFC 6333): IPv4-in-IPv6 for ISP CGNAT environments
• MAP-E/MAP-T (RFC 7597/7599): latest stateless IPv4-over-IPv6 for ISPs
• NAT64+DNS64 (RFC 6146/6147): IPv6-only clients talk to IPv4 servers` },
          ].map(s => (
            <div key={s.title} className="rounded-xl p-4" style={{ background:`${s.color}06`, border:`1px solid ${s.color}18` }}>
              <div className="text-[10px] font-black font-mono uppercase tracking-wider mb-2" style={{ color:s.color }}>{s.title}</div>
              <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color:'#9ca3af' }}>{s.body}</pre>
            </div>
          ))}
        </div>
      )}
      </div>{/* end left column */}

      {/* ── RIGHT COLUMN: IPv6 Knowledge Panel ── */}
      <div className="w-[360px] shrink-0 border-l border-white/[0.04]" style={{background:'transparent'}}>
        <div className="p-4 space-y-4">

          {/* Quick address facts */}
          <div className="rounded-xl p-4" style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)'}}>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-blue-400 mb-3">IPv6 Key Facts{certPrepMode && <CertTag obj="CCNA §25.6" />}{certPrepMode && <CertTag obj="Net+ N10-009 §2.2" />}</div>
            <div className="space-y-1.5">
              {[
                {k:'Address Size',   v:'128 bits (16 bytes)'},
                {k:'Notation',       v:'8 groups of 4 hex digits'},
                {k:'Total Addresses',v:'3.4 × 10³⁸'},
                {k:'Header Size',    v:'Fixed 40 bytes (vs IPv4 variable 20–60)'},
                {k:'No Broadcast',   v:'Replaced by multicast (ff02::1)'},
                {k:'No ARP',         v:'Replaced by NDP (RFC 4861)'},
                {k:'Auto-config',    v:'SLAAC (RFC 4862) — no DHCP needed'},
                {k:'Checksum',       v:'Removed from header (transport handles it)'},
                {k:'Fragmentation',  v:'Only at source — not intermediate routers'},
                {k:'IPsec',          v:'Built-in (optional in IPv4, mandatory in IPv6)'},
              ].map(r=>(
                <div key={r.k} className="flex gap-2">
                  <span className="text-[8px] font-mono text-gray-600 w-28 shrink-0">{r.k}</span>
                  <span className="text-[8px] font-mono text-blue-300">{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment Scenarios */}
          <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="px-4 py-2.5" style={{background:'rgba(255,255,255,0.03)'}}>
              <span className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400">IPv6 Deployment Scenarios{certPrepMode && <CertTag obj="CCNA §25.7" />}</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                {icon:'🏢', name:'Enterprise Dual-Stack', prefix:'2001:db8:a::/48', desc:'ISP assigns /48. Enterprise splits into /64 per VLAN. Routers run OSPFv3 or IS-IS for IPv6. Hosts use SLAAC or DHCPv6.',
                 tags:['OSPFv3','DHCPv6','RA Guard','SLAAC']},
                {icon:'☁️', name:'Cloud / Data Center', prefix:'2001:db8::/32', desc:'AWS, Azure, GCP all support IPv6. EC2 instances can get /128 from subnet /64. LB accepts IPv6, backend can be IPv4 via NAT64.',
                 tags:['NAT64','DNS64','Dual-Stack LB','ELB']},
                {icon:'📱', name:'Mobile Networks (5G)', prefix:'2001::/16', desc:'3GPP mandates IPv6-only for 5G PDU sessions. UE gets /64 from P-GW. IMS (VoLTE) uses IPv6 exclusively.',
                 tags:['PDU Session','/64 per UE','IMS','VoLTE']},
                {icon:'🌐', name:'ISP Customer Prefix', prefix:'2001:db8:1234::/48', desc:'RIPE/ARIN allocate /32 to ISPs. ISPs assign /48 to business, /56 to SMB, /64 to residential. Prefix delegation via DHCPv6-PD.',
                 tags:['DHCPv6-PD','/48 Biz','/56 SMB','/64 Home']},
                {icon:'🏠', name:'Home Network', prefix:'2001:db8::/56', desc:'Router gets /56 from ISP via DHCPv6-PD. Splits into /64 per LAN segment. Hosts self-configure with SLAAC+RDNSS.',
                 tags:['SLAAC','RDNSS','RA','Privacy Ext']},
              ].map(s=>(
                <div key={s.name} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-[9px] font-bold text-white">{s.name}</span>
                  </div>
                  <code className="text-[8px] font-mono text-blue-400 block mb-1">{s.prefix}</code>
                  <p className="text-[8px] font-mono text-gray-600 leading-relaxed mb-1.5">{s.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map(t=>(
                      <span key={t} className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(59,130,246,0.1)',color:'#93c5fd',border:'1px solid rgba(59,130,246,0.2)'}}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Protocol Stack */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-purple-400 mb-3">IPv6 Protocol Family</div>
            <div className="space-y-1.5">
              {[
                {name:'ICMPv6',   color:'#06b6d4', desc:'Replaces ARP, ICMP, IGMP. Types: NS/NA (NDP), RS/RA (SLAAC), Echo, MLD (multicast). Cannot be blocked.'},
                {name:'OSPFv3',   color:'#10b981', desc:'IGP for IPv6. Runs per link (not per address). Uses link-local as next-hop. Area 0 backbone same concept as OSPFv2.'},
                {name:'IS-IS',    color:'#a855f7', desc:'TLV-based IGP. Natively supports IPv6 via TLV 236. Preferred in large ISP/DC networks over OSPFv3.'},
                {name:'BGP-4+',   color:'#f97316', desc:'RFC 4760 multiprotocol extensions add IPv6 NLRI. Same BGP session can carry both IPv4 and IPv6 routes.'},
                {name:'DHCPv6',   color:'#eab308', desc:'RFC 3315. Stateful (M-flag) or stateless (O-flag). DHCPv6-PD (RFC 3633) delegates prefixes to CPE routers.'},
                {name:'MLD v2',   color:'#f43f5e', desc:'Multicast Listener Discovery. Replaces IGMP. Nodes report group membership to routers. Used for ff02:: groups.'},
              ].map(p=>(
                <div key={p.name} className="rounded-lg p-2.5" style={{background:`${p.color}08`,border:`1px solid ${p.color}18`}}>
                  <div className="text-[9px] font-black font-mono mb-0.5" style={{color:p.color}}>{p.name}</div>
                  <div className="text-[8px] font-mono text-gray-600 leading-relaxed">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Addressing Plan Guide */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-amber-400 mb-3">Address Planning Guide</div>
            <div className="space-y-1.5 text-[8px] font-mono">
              {[
                {prefix:'/32',  who:'ISP allocation from RIR', hosts:'65,536 /48s'},
                {prefix:'/48',  who:'Enterprise customer',      hosts:'65,536 /64s'},
                {prefix:'/56',  who:'SMB / home business',      hosts:'256 /64s'},
                {prefix:'/64',  who:'Single network segment',   hosts:'1 subnet (SLAAC)'},
                {prefix:'/128', who:'Single host / loopback',   hosts:'1 address'},
              ].map(r=>(
                <div key={r.prefix} className="flex items-center gap-2 rounded px-2 py-1.5" style={{background:'rgba(0,0,0,0.15)'}}>
                  <code className="text-amber-400 w-10 shrink-0 font-bold">{r.prefix}</code>
                  <span className="text-gray-500 flex-1">{r.who}</span>
                  <span className="text-gray-700 text-[7px]">{r.hosts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RFC Reference */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-rose-400 mb-3">IPv6 Essential RFCs</div>
            <div className="space-y-1.5">
              {[
                {rfc:'RFC 2460', title:'IPv6 Specification',                    year:1998},
                {rfc:'RFC 4291', title:'IPv6 Addressing Architecture',           year:2006},
                {rfc:'RFC 4861', title:'Neighbor Discovery Protocol (NDP)',       year:2007},
                {rfc:'RFC 4862', title:'SLAAC — IPv6 Stateless Autoconfiguration',year:2007},
                {rfc:'RFC 4193', title:'Unique Local IPv6 Addresses (ULA)',       year:2005},
                {rfc:'RFC 4941', title:'Privacy Extensions for SLAAC',           year:2007},
                {rfc:'RFC 5952', title:'Text Representation (Canonical Form)',    year:2010},
                {rfc:'RFC 6146', title:'NAT64 — IPv6/IPv4 Translation',          year:2011},
                {rfc:'RFC 6147', title:'DNS64 — DNS Extensions for NAT64',        year:2011},
                {rfc:'RFC 8106', title:'RDNSS/DNSSL in RA (no DHCPv6 for DNS)',  year:2017},
              ].map(r=>(
                <div key={r.rfc} className="flex items-center gap-2">
                  <span className="text-[8px] font-black font-mono w-16 shrink-0" style={{color:'#fb7185'}}>{r.rfc}</span>
                  <span className="text-[8px] font-mono text-gray-500 flex-1">{r.title}</span>
                  <span className="text-[7px] font-mono text-gray-700">{r.year}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>{/* end right column */}
    </div>
  );
}
