import React, { useState, useEffect } from 'react';
import { useSuite, CertTag } from './SuiteContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { InteractiveBitGrid, ReverseCalculator, SpecialMasksExplainer, MaskUseCaseMap, MaskBinaryComparison } from './SubnetMasksExtras';
import { Download } from 'lucide-react';

function maskFromPrefix(p) {
  const m = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  const w = (~m) >>> 0;
  const octets = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
  const hosts = p === 32 ? 1 : p === 31 ? 2 : Math.pow(2, 32 - p) - 2;
  const total = Math.pow(2, 32 - p);
  return { mask: octets(m), wildcard: octets(w), hosts, total, hostBits: 32-p, maskInt: m };
}

// Topology that changes with prefix
function MaskTopology({ prefix, info }) {
  const example = '192.168.1';
  const gw = `${example}.1`;
  const host1 = `${example}.10`;
  const host2 = `${example}.20`;
  const bcast = prefix >= 24 ? `${example}.${Math.pow(2,32-prefix)-1}` : `${example}.255`;

  const zones = prefix <= 8 ? 'Class A — Millions of hosts across a flat /8'
    : prefix <= 16 ? 'Class B range — Thousands of hosts, typically split with VLSM'
    : prefix <= 24 ? 'Class C range — Up to 254 hosts, single LAN segment'
    : prefix <= 28 ? 'Small segment — Ideal for server groups or DMZs'
    : prefix <= 30 ? 'Tiny — WAN point-to-point link (2 hosts)'
    : prefix === 31 ? 'RFC 3021 P2P — No net/broadcast, 2 hosts only'
    : 'Host route — Single device, loopback or BGP next-hop';

  const Node = ({ icon, label, ip, color }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="topo-node flex flex-col items-center gap-0.5" style={{ borderColor:`${color}40`, minWidth:82 }}>
        <span className="text-[11px]">{icon}</span>
        <span className="text-[8px] font-bold" style={{color}}>{label}</span>
        <span className="text-[7px] text-cyan-400 font-mono">{ip}</span>
        <span className="text-[6px] text-gray-600 font-mono">/{prefix}</span>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl p-5 ns-glass-amber">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[8px] font-black font-mono uppercase tracking-widest text-amber-400">Live Topology — /{prefix}</span>
      </div>
      <p className="text-[8px] font-mono text-gray-500 mb-4">{zones}</p>
      <div className="flex items-center gap-0 overflow-x-auto pb-2 scrollbar-hide">
        <Node icon="🌐" label="Internet" ip="8.8.8.8" color="#6b7280" />
        <div style={{width:24,borderTop:'1.5px dashed rgba(107,114,128,0.4)'}} />
        {prefix <= 28 && <>
          <Node icon="📡" label="Router/GW" ip={gw} color="#10b981" />
          <div style={{width:24,borderTop:'1.5px dashed rgba(6,182,212,0.5)'}} />
        </>}
        {prefix <= 30 && <>
          <Node icon="🔀" label="Switch" ip={`${example}.2`} color="#a855f7" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <div style={{width:24,borderTop:'1.5px dashed rgba(249,115,22,0.5)'}} />
              <Node icon="💻" label="Host A" ip={host1} color="#f97316" />
            </div>
            {info.hosts >= 2 && (
              <div className="flex items-center">
                <div style={{width:24,borderTop:'1.5px dashed rgba(249,115,22,0.3)'}} />
                <Node icon="📱" label="Host B" ip={host2} color="#f97316" />
              </div>
            )}
          </div>
        </>}
        {prefix === 31 && <>
          <Node icon="📡" label="Router A" ip={`${example}.0`} color="#10b981" />
          <div style={{width:24,borderTop:'2px dashed rgba(6,182,212,0.6)'}} />
          <Node icon="📡" label="Router B" ip={`${example}.1`} color="#3b82f6" />
        </>}
        {prefix === 32 && <Node icon="💻" label="Host Route" ip={`${example}.5`} color="#a855f7" />}
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-[8px] font-mono">
        <div><span className="text-gray-600">Mask: </span><span className="text-amber-300 font-bold">{info.mask}</span></div>
        <div><span className="text-gray-600">Wildcard: </span><span className="text-cyan-400 font-bold">{info.wildcard}</span></div>
        <div><span className="text-gray-600">Usable: </span><span className="text-green-400 font-bold">{info.hosts.toLocaleString()}</span></div>
      </div>
    </div>
  );
}

// Interactive CIDR Tree Visualizer
function CIDRTreeVisualizer({ prefix }) {
  // We'll use a base IP of 10.0.0.0 to visualize splitting.
  // To avoid massive math, we'll just demonstrate the principle of the current prefix splitting into two.
  
  const getSubnetStr = (p) => {
    if (p < 0 || p > 32) return 'N/A';
    if (p === 0) return '0.0.0.0/0';
    // Simplified representation for visual purposes
    if (p <= 8) return `10.${p-1}.0.0/${p}`;
    if (p <= 16) return `10.0.${p-9}.0/${p}`;
    if (p <= 24) return `10.0.0.${p-17}/${p}`;
    return `10.0.0.${Math.pow(2, 32-p)}/${p}`;
  };

  const hostsForPrefix = (p) => p > 32 ? 0 : p === 32 ? 1 : p === 31 ? 2 : Math.pow(2, 32 - p) - 2;

  // We show 3 levels: Parent (prefix - 1), Current (prefix), Children (prefix + 1)
  const parentPrefix = Math.max(0, prefix - 1);
  const childPrefix = Math.min(32, prefix + 1);
  const grandChildPrefix = Math.min(32, prefix + 2);

  const TreeNode = ({ label, hosts, active, size = 'md' }) => (
    <div className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 ${active ? 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-[#161b22] border-white/10 opacity-70'} border`}
      style={{ minWidth: size === 'lg' ? 140 : size === 'md' ? 100 : 80 }}>
      <div className={`font-mono font-bold ${active ? 'text-amber-400' : 'text-gray-300'} ${size === 'lg' ? 'text-[12px]' : size === 'md' ? 'text-[10px]' : 'text-[8px]'}`}>
        {label}
      </div>
      <div className="text-[7px] font-mono text-gray-500 mt-0.5">
        {hosts.toLocaleString()} hosts
      </div>
    </div>
  );

  const Line = ({ active }) => (
    <div className={`h-8 w-px ${active ? 'bg-amber-500/50' : 'bg-gray-700/50'}`} />
  );
  
  const HLine = ({ active, width }) => (
    <div className={`h-px ${active ? 'bg-amber-500/50' : 'bg-gray-700/50'}`} style={{ width }} />
  );

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 flex flex-col items-center overflow-hidden relative">
      <div className="absolute left-4 top-4 text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">CIDR Binary Split Tree</div>
      
      {/* Level 1: Parent */}
      {prefix > 0 && (
        <>
          <TreeNode label={`Block /${parentPrefix}`} hosts={hostsForPrefix(parentPrefix)} size="lg" />
          <Line active={true} />
        </>
      )}

      {/* Level 2: Current */}
      <div className="flex flex-col items-center">
        <div className="flex items-center">
          {prefix > 0 && <HLine active={true} width="120px" />}
        </div>
        <div className="flex gap-[120px] relative">
          <div className="absolute top-0 left-1/2 w-[120px] h-px bg-amber-500/50 -translate-x-full" />
          <div className="absolute top-0 left-1/2 w-[120px] h-px bg-gray-700/50" />
          
          {/* Active branch */}
          <div className="flex flex-col items-center">
            <div className="h-4 w-px bg-amber-500/50" />
            <TreeNode label={`Subnet /${prefix}`} hosts={hostsForPrefix(prefix)} active={true} size="lg" />
            
            {/* Children of active branch */}
            {prefix < 32 && (
              <>
                <div className="h-4 w-px bg-amber-500/50" />
                <div className="flex gap-4 relative">
                  <div className="absolute top-0 left-1/2 w-8 h-px bg-amber-500/50 -translate-x-full" />
                  <div className="absolute top-0 left-1/2 w-8 h-px bg-amber-500/50" />
                  
                  <div className="flex flex-col items-center">
                    <div className="h-4 w-px bg-amber-500/50" />
                    <TreeNode label={`/${childPrefix} (A)`} hosts={hostsForPrefix(childPrefix)} size="md" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-4 w-px bg-amber-500/50" />
                    <TreeNode label={`/${childPrefix} (B)`} hosts={hostsForPrefix(childPrefix)} size="md" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Inactive sibling branch */}
          {prefix > 0 && (
             <div className="flex flex-col items-center opacity-50">
               <div className="h-4 w-px bg-gray-700/50" />
               <TreeNode label={`Sibling /${prefix}`} hosts={hostsForPrefix(prefix)} size="lg" />
             </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default function SubnetMasks() {
  const { certPrepMode } = useSuite();
  const [prefix, setPrefix] = useState(24);
  const info = maskFromPrefix(prefix);
  const maskBin = (prefix === 0 ? 0 : (0xffffffff << (32-prefix)) >>> 0).toString(2).padStart(32,'0');
  const bits = maskBin.split('');

  const deepDive = [
    { q:'What is a subnet mask?', a:'A 32-bit number with consecutive 1s followed by consecutive 0s. The 1-bits identify the network portion; 0-bits identify the host portion. Written as dotted-decimal (255.255.255.0) or CIDR (/24). The AND of any IP with its mask gives the network address.' },
    { q:'Why do masks have to be contiguous?', a:'Non-contiguous masks (e.g. 255.0.255.0) were valid in early routing but eliminated by CIDR (RFC 1519). Modern routers require contiguous masks to support longest-prefix matching. Cisco IOS will accept them in ACLs as wildcard masks only.' },
    { q:'How does a router use the mask?', a:'Destination IP AND subnet mask = network address. Router looks up network address in FIB. Longest prefix wins. Example: 192.168.1.50 AND 255.255.255.0 = 192.168.1.0/24. Router sends packet to next-hop for /24.' },
    { q:'Wildcard mask in OSPF & ACLs', a:'Wildcard = inverse of subnet mask. Bits that are 0 must match; bits that are 1 are "don\'t care". OSPF "network 10.0.0.0 0.0.255.255 area 0" matches any 10.0.x.x address. ACL "permit 192.168.1.0 0.0.0.255" matches .0–.255.' },
    { q:'/31 and /32 special cases', a:'/31 (RFC 3021): 2 hosts, no network or broadcast addresses. Used on P2P WAN links to save 2 addresses per link. /32 is a host route — a single address. Used for loopbacks, BGP next-hops, and host-specific ACLs. Both are common in service-provider networks.' },
    { q:'Supernetting vs subnetting', a:'Subnetting: divide a block into smaller pieces (longer prefix). Supernetting: combine multiple blocks into one route (shorter prefix). BGP uses supernetting to advertise aggregate prefixes. ISPs give customers a /48 and advertise a /32 aggregate upstream.' },
  ];

  const commonMasks = [
    {p:8,  mask:'255.0.0.0',     wc:'0.255.255.255', hosts:'16,777,214', use:'Class A — entire organization'},
    {p:16, mask:'255.255.0.0',   wc:'0.0.255.255',   hosts:'65,534',     use:'Class B — large campus'},
    {p:24, mask:'255.255.255.0', wc:'0.0.0.255',     hosts:'254',        use:'Class C — standard LAN'},
    {p:25, mask:'255.255.255.128',wc:'0.0.0.127',    hosts:'126',        use:'Half a /24 — 2 VLANs'},
    {p:26, mask:'255.255.255.192',wc:'0.0.0.63',     hosts:'62',         use:'Quarter /24 — small team'},
    {p:27, mask:'255.255.255.224',wc:'0.0.0.31',     hosts:'30',         use:'8th of /24 — small dept'},
    {p:28, mask:'255.255.255.240',wc:'0.0.0.15',     hosts:'14',         use:'DMZ or server segment'},
    {p:29, mask:'255.255.255.248',wc:'0.0.0.7',      hosts:'6',          use:'Very small segment'},
    {p:30, mask:'255.255.255.252',wc:'0.0.0.3',      hosts:'2',          use:'WAN P2P link'},
    {p:31, mask:'255.255.255.254',wc:'0.0.0.1',      hosts:'2',          use:'RFC 3021 P2P'},
    {p:32, mask:'255.255.255.255',wc:'0.0.0.0',      hosts:'1',          use:'Host route / loopback'},
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Subnet Mask Reference Cheat Sheet', 14, 22);
    doc.setFontSize(10);
    doc.text('IPv4 CIDR Prefix, Subnet Masks, Wildcard Masks, and Host Capacities', 14, 30);
    
    // We can generate all prefixes from 8 to 32 for a comprehensive cheatsheet
    const tableData = [];
    for(let i=8; i<=32; i++) {
      const info = maskFromPrefix(i);
      tableData.push([`/${i}`, info.mask, info.wildcard, info.hosts.toLocaleString(), Math.pow(2, 32-i).toLocaleString()]);
    }

    doc.autoTable({
      startY: 38,
      head: [['Prefix', 'Subnet Mask', 'Wildcard Mask', 'Usable Hosts', 'Total IPs']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [245, 158, 11] }
    });

    doc.save(`Subnet_Mask_Cheatsheet.pdf`);
  };

  return (
    <div className="flex gap-0 min-h-screen" style={{background:'transparent'}}>
      {/* LEFT */}
      <div className="flex-1 min-w-0 p-6 pb-10 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden ns-glass-amber">
          <div className="absolute right-4 top-4 text-[60px] opacity-[0.04] font-black select-none">MASK</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{background:'rgba(249,115,22,0.15)',color:'#fb923c',border:'1px solid rgba(249,115,22,0.3)'}}>BEGINNER</span>
            <span className="text-[9px] font-mono text-gray-600">RFC 950 · Subnet Addressing</span>
          </div>
          <h2 className="text-lg font-black text-white mb-0.5">Subnet Masks</h2>
          <p className="text-[11px] font-mono text-gray-400 max-w-xl">Drag the slider to see exactly how the subnet mask, wildcard, host counts, and live topology change with each prefix length. A subnet mask is a 32-bit number where 1-bits identify the network and 0-bits identify the host.</p>
        </div>

        {/* Slider */}
        <div className="rounded-2xl p-6 ns-glass-amber">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-gray-400">Prefix Length</span>
            <span className="text-3xl font-black font-mono text-amber-400">/{prefix}</span>
          </div>
          <input type="range" min="0" max="32" value={prefix} onChange={e=>setPrefix(+e.target.value)}
            className="w-full accent-orange-400 mb-4" />
          <div className="flex justify-between text-[8px] font-mono text-gray-600">
            <span>/0</span><span>/8</span><span>/16</span><span>/24</span><span>/32</span>
          </div>
        </div>

        <ReverseCalculator setPrefix={setPrefix} />

        {/* Bit visualizer */}
        <InteractiveBitGrid prefix={prefix} setPrefix={setPrefix} info={info} />
        {/* Bit visualizer */}
        {/* Replaced by InteractiveBitGrid */}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {label:'Subnet Mask', value:info.mask,              color:'#f97316'},
            {label:'Wildcard Mask', value:info.wildcard,        color:'#06b6d4'},
            {label:'Usable Hosts', value:info.hosts.toLocaleString(), color:'#22c55e'},
            {label:'Total IPs', value:info.total.toLocaleString(),    color:'#a855f7'},
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3.5 ns-glass">
              <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1">{c.label}</div>
              <div className="text-sm font-black font-mono" style={{color:c.color}}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Live Topology */}
        <MaskTopology prefix={prefix} info={info} />

        {/* Interactive CIDR Tree */}
        <CIDRTreeVisualizer prefix={prefix} />

        <MaskBinaryComparison />
        <MaskUseCaseMap />
        <SpecialMasksExplainer />

        {/* Deep dive */}
        <div className="rounded-xl p-5 ns-glass-amber">
          <div className="text-[10px] font-black font-mono text-amber-400 uppercase tracking-wider mb-4">Deep Dive: Understanding Subnet Masks{certPrepMode && <CertTag obj="CCNA §22.1" />}{certPrepMode && <CertTag obj="Net+ N10-009 §2.3" />}</div>
          <div className="space-y-3">
            {deepDive.map(d => (
              <div key={d.q} className="rounded-lg p-3" style={{background:'rgba(0,0,0,0.2)'}}>
                <div className="text-[9px] font-black text-amber-300 mb-1">{d.q}</div>
                <div className="text-[9px] font-mono text-gray-400 leading-relaxed">{d.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-[340px] shrink-0 border-l border-white/[0.04]" style={{background:'transparent'}}>
        <div className="p-4 space-y-4">

          {/* Common masks reference */}
          <div className="rounded-xl overflow-hidden ns-glass">
            <div className="px-4 py-3 flex items-center justify-between" style={{background:'rgba(255,255,255,0.03)'}}>
              <span className="text-[8px] font-black font-mono uppercase tracking-widest text-amber-400">Common Subnet Masks</span>
              <button onClick={exportPDF} className="flex items-center gap-1 text-[8px] font-mono text-amber-300 transition-colors hover:text-amber-200 bg-amber-500/10 px-2 py-1 rounded" style={{border:'1px solid rgba(245,158,11,0.2)'}}>
                <Download size={10} /> Print Card
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {commonMasks.map(m => (
                <div key={m.p} className={`px-3 py-2 transition-colors ${m.p === prefix ? 'bg-amber-500/10' : 'hover:bg-white/[0.02]'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-black font-mono ${m.p === prefix ? 'text-amber-400' : 'text-gray-400'}`}>/{m.p}</span>
                    <span className="text-[8px] font-mono text-orange-300">{m.mask}</span>
                    <button onClick={()=>setPrefix(m.p)} className="ml-auto text-[6px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(249,115,22,0.1)',color:'#fb923c',border:'1px solid rgba(249,115,22,0.2)'}}>select</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] font-mono text-gray-600">WC: {m.wc}</span>
                    <span className="text-[7px] font-mono text-green-600 ml-auto">{m.hosts} hosts</span>
                  </div>
                  <div className="text-[7px] font-mono text-gray-700 mt-0.5">{m.use}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cisco notation guide */}
          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400 mb-3">Cisco IOS Notation Guide</div>
            <div className="space-y-2 text-[8px] font-mono">
              {[
                {cmd:'ip address 192.168.1.1 255.255.255.0', desc:'Interface config — subnet mask format'},
                {cmd:'network 10.0.0.0 0.255.255.255 area 0', desc:'OSPF — wildcard mask format'},
                {cmd:'permit 192.168.0.0 0.0.0.255', desc:'ACL — wildcard mask, matches /24'},
                {cmd:'ip route 0.0.0.0 0.0.0.0 10.0.0.1', desc:'Default route — /0 mask = all IPs'},
                {cmd:'host 192.168.1.5', desc:'ACL keyword = 0.0.0.0 wildcard = /32'},
                {cmd:'any', desc:'ACL keyword = 0.0.0.0 255.255.255.255 = all'},
              ].map(c => (
                <div key={c.cmd} className="rounded-lg p-2" style={{background:'rgba(0,0,0,0.2)'}}>
                  <code className="text-cyan-400 text-[7px] block mb-0.5">{c.cmd}</code>
                  <span className="text-gray-600">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Protocols using masks */}
          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-purple-400 mb-3">Where Masks Are Used</div>
            <div className="space-y-1.5">
              {[
                {proto:'Interface', color:'#10b981', use:'Subnet mask defines broadcast domain on L3 interface'},
                {proto:'OSPF',      color:'#06b6d4', use:'Wildcard mask selects interfaces to run OSPF on'},
                {proto:'ACL',       color:'#f97316', use:'Wildcard mask matches IP ranges for permit/deny'},
                {proto:'NAT',       color:'#a855f7', use:'ip nat inside source list matches private range'},
                {proto:'BGP',       color:'#eab308', use:'Prefix + mask in network statement advertises route'},
                {proto:'DHCP',      color:'#f43f5e', use:'Subnet mask given to clients in OFFER message (DORA)'},
              ].map(p => (
                <div key={p.proto} className="flex gap-2">
                  <span className="text-[8px] font-black font-mono w-16 shrink-0" style={{color:p.color}}>{p.proto}</span>
                  <span className="text-[8px] font-mono text-gray-500">{p.use}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
