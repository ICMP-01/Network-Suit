import React, { useState, useEffect, useRef } from 'react';
import { useSuite, CertTag } from './SuiteContext';
import { Copy, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, BookOpen, Cpu, Layers, Router, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AnimatedBitMap, SubnetSplitTool, OverlapDetector, AddressTimeline } from './IPv4Extras';

// ── Network Diagram (Editable IPs, Multi-device) ─────────────────────────────
function ipToInt(ip) {
  const p = ip.trim().split('.');
  if (p.length !== 4 || p.some(x => isNaN(+x))) return null;
  return p.reduce((a, b) => (a << 8) | (+b), 0) >>> 0;
}

function NetworkDiagram({ info }) {
  const [nodes, setNodes] = useState([]);
  const [nextId, setNextId] = useState(4);

  useEffect(() => {
    if (!info) return;
    const [a, b, c] = info.network.split('.');
    const h = n => `${a}.${b}.${c}.${n}`;
    setNodes([
      { id: 1, icon: '💻', label: 'Workstation', ip: h(10) },
      { id: 2, icon: '📱', label: 'Phone',        ip: h(20) },
      { id: 3, icon: '🖥️',  label: 'Server',      ip: h(100) },
    ]);
  }, [info?.network, info?.prefix]);

  if (!info) return null;

  const inSubnet = (testIp) => {
    const i = ipToInt(testIp);
    if (i === null) return false;
    return (i & info.maskInt) >>> 0 === info.networkInt;
  };

  const [a0, b0, c0] = info.network.split('.');
  const gw   = `${a0}.${b0}.${c0}.1`;
  const sw   = `${a0}.${b0}.${c0}.2`;
  const fw   = `${a0}.${b0}.${c0}.254`;
  const showFW = info.hostBits >= 4;

  const updNode    = (id, k, v) => setNodes(p => p.map(n => n.id === id ? { ...n, [k]: v } : n));
  const removeNode = id => setNodes(p => p.filter(n => n.id !== id));
  const addNode    = () => {
    setNodes(p => [...p, { id: nextId, icon: '💡', label: `Device ${nextId}`, ip: `${a0}.${b0}.${c0}.${nextId * 5}` }]);
    setNextId(n => n + 1);
  };

  const HLine = ({ color = 'rgba(6,182,212,0.4)' }) => (
    <div style={{ width: 24, borderTop: `1.5px dashed ${color}`, alignSelf: 'center', flexShrink: 0 }} />
  );

  const FixedNode = ({ icon, label, ip, color, sub }) => (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="topo-node flex flex-col items-center gap-0.5" style={{ borderColor: `${color}45`, minWidth: 84 }}>
        <span className="text-[11px]">{icon}</span>
        <span className="text-[8px] font-bold" style={{ color }}>{label}</span>
        <span className="text-[7px] font-mono" style={{ color: '#67e8f9' }}>{ip}</span>
        {sub && <span className="text-[6px] text-gray-500 font-mono">{sub}</span>}
      </div>
    </div>
  );

  const EditNode = ({ node }) => {
    const [localIp,    setLocalIp]    = useState(node.ip);
    const [localLabel, setLocalLabel] = useState(node.label);
    const valid = inSubnet(localIp);
    return (
      <div className="topo-node flex flex-col items-center gap-0.5"
        style={{ borderColor: valid ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)', minWidth: 104 }}>
        <div className="flex items-center w-full justify-between">
          <span className="text-[10px]">{node.icon}</span>
          <button onClick={() => removeNode(node.id)} className="text-[7px] text-gray-600 hover:text-red-400 transition-colors">✕</button>
        </div>
        <input value={localLabel} onChange={e => setLocalLabel(e.target.value)}
          onBlur={() => updNode(node.id, 'label', localLabel)}
          className="text-[7px] font-mono text-gray-300 bg-transparent text-center w-full border-0 outline-none" />
        <input value={localIp} onChange={e => setLocalIp(e.target.value)}
          onBlur={() => updNode(node.id, 'ip', localIp)}
          onKeyDown={e => e.key === 'Enter' && updNode(node.id, 'ip', localIp)}
          className="topo-ip-input" placeholder="x.x.x.x" />
        <span className="text-[6px] font-bold font-mono" style={{ color: valid ? '#22c55e' : '#ef4444' }}>
          {valid ? '✓ in subnet' : '✗ out of range'}
        </span>
      </div>
    );
  };

  return (
    <div className="ns-glass-cyan rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400">Subnet Diagram</span>
        <span className="text-[7px] font-mono text-gray-500">click any IP field to edit · {info.cidr}</span>
        <button onClick={addNode} className="ml-auto text-[7px] font-mono font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(6,182,212,0.12)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.35)' }}>
          + Add Device
        </button>
      </div>
      <div className="flex items-center overflow-x-auto pb-2 scrollbar-hide">
        <FixedNode icon="🌐" label="Internet"  ip="8.8.8.8" color="#6b7280" sub="Public" />
        <HLine color="rgba(107,114,128,0.4)" />
        {showFW && <>
          <FixedNode icon="🛡️" label="Firewall" ip={fw} color="#ef4444" sub={`/${info.prefix}`} />
          <HLine color="rgba(239,68,68,0.4)" />
        </>}
        <FixedNode icon="📡" label="Router/GW" ip={gw} color="#10b981" sub={`GW /${info.prefix}`} />
        <HLine />
        <FixedNode icon="🔀" label="Switch" ip={sw} color="#a855f7" sub={info.mask} />
        <div className="flex flex-col gap-2">
          {nodes.map((node, i) => (
            <div key={node.id} className="flex items-center">
              <HLine color={i === 0 ? 'rgba(6,182,212,0.5)' : 'rgba(6,182,212,0.22)'} />
              <EditNode node={node} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap gap-3">
        {[
          { label: 'Network',   val: info.network,   color: '#06b6d4' },
          { label: 'Gateway',   val: gw,             color: '#10b981' },
          { label: 'Broadcast', val: info.broadcast, color: '#ef4444' },
          { label: 'Mask',      val: info.mask,      color: '#f97316' },
          { label: 'Wildcard',  val: info.wildcard,  color: '#eab308' },
          { label: 'Range',     val: `${info.firstHost} → ${info.lastHost}`, color: '#a855f7' },
        ].map(r => (
          <div key={r.label} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
            <span className="text-[8px] font-mono text-gray-400">{r.label}:</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: r.color }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calculation core ─────────────────────────────────────────────────────────
function calcSubnet(ip, prefix) {
  const p = parseInt(prefix, 10);
  if (isNaN(p) || p < 0 || p > 32) return null;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(x => isNaN(x) || x < 0 || x > 255)) return null;
  const ipInt   = parts.reduce((a, b) => (a << 8) | b, 0) >>> 0;
  const maskInt = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  const wildInt = (~maskInt) >>> 0;
  const netInt  = (ipInt & maskInt) >>> 0;
  const bcastInt= (netInt | wildInt) >>> 0;
  const firstInt= p === 32 ? netInt  : (netInt + 1) >>> 0;
  const lastInt = p === 32 ? bcastInt: (bcastInt - 1) >>> 0;
  const total   = p === 32 ? 1 : p === 31 ? 2 : Math.pow(2, 32 - p);
  const usable  = p >= 31 ? (p === 32 ? 1 : 2) : total - 2;
  const oct = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
  const bin = n => (n>>>0).toString(2).padStart(32,'0');
  const f = parts[0];
  const cls = f >= 240 ? 'E' : f >= 224 ? 'D' : f >= 192 ? 'C' : f >= 128 ? 'B' : 'A';
  const priv = (f===10)||( f===172 && parts[1]>=16 && parts[1]<=31)||(f===192&&parts[1]===168);
  return {
    prefix: p, ipStr: ip, ipInt,
    network: oct(netInt), networkInt: netInt,
    broadcast: oct(bcastInt), broadcastInt: bcastInt,
    firstHost: oct(firstInt), lastHost: oct(lastInt),
    mask: oct(maskInt), maskInt, wildcard: oct(wildInt),
    totalIPs: total, usableHosts: usable,
    cidr: `${oct(netInt)}/${p}`, ipClass: cls, isPrivate: priv,
    ipBin: bin(ipInt), maskBin: bin(maskInt), netBin: bin(netInt), bcastBin: bin(bcastInt),
    networkBits: p, hostBits: 32 - p,
  };
}

function CopyBtn({ value }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setC(true); setTimeout(()=>setC(false),2000); }}
      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {c ? <CheckCircle size={11} className="text-emerald-400"/> : <Copy size={11} className="text-gray-600 hover:text-gray-400"/>}
    </button>
  );
}

// ── Card component with glass ─────────────────────────────────────────────────
function Card({ label, value, sub, color, copyable }) {
  return (
    <div className="group relative rounded-xl p-4 overflow-hidden flex flex-col gap-1.5 ns-glass">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${color}60,transparent)` }}/>
      <span className="text-[8px] font-mono uppercase tracking-[0.2em] ns-label">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[14px] font-black font-mono leading-none ns-val" style={{ color }}>{value}</span>
        {copyable && <CopyBtn value={value}/>}
      </div>
      {sub && <span className="text-[9px] font-mono ns-muted">{sub}</span>}
    </div>
  );
}

// ── 32-bit visual bit map ─────────────────────────────────────────────────────
function BitMap({ info, setIp }) {
  if (!info) return null;
  const bits = info.ipBin.split('');

  const handleBitClick = (index) => {
    if (!setIp) return;
    const newBits = [...bits];
    newBits[index] = newBits[index] === '0' ? '1' : '0';
    const binStr = newBits.join('');
    const o1 = parseInt(binStr.slice(0, 8), 2);
    const o2 = parseInt(binStr.slice(8, 16), 2);
    const o3 = parseInt(binStr.slice(16, 24), 2);
    const o4 = parseInt(binStr.slice(24, 32), 2);
    setIp(`${o1}.${o2}.${o3}.${o4}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[9px] font-mono mb-1">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background:'rgba(16,185,129,0.5)', border:'1px solid #10b981' }}/>Network ({info.networkBits} bits)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background:'rgba(245,158,11,0.4)', border:'1px solid #f59e0b' }}/>Host ({info.hostBits} bits)</span>
        </div>
        <span className="text-emerald-400 opacity-70 animate-pulse">Click any bit to flip it!</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[0,8,16,24].map(start => (
          <div key={start} className="flex flex-col items-center gap-1">
            <div className="text-[8px] font-mono text-gray-700 mb-0.5">Octet {start/8+1}</div>
            <div className="flex gap-[2px]">
              {bits.slice(start, start+8).map((b, i) => {
                const pos = start+i, isNet = pos < info.networkBits;
                return (
                  <button key={i} onClick={() => handleBitClick(pos)} className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[8px] font-black font-mono transition-transform hover:scale-110 active:scale-95 cursor-pointer hover:brightness-150"
                    style={{
                      background: isNet ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${isNet ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)'}`,
                      color: isNet ? '#34d399' : '#fbbf24',
                    }}>{b}</button>
                );
              })}
            </div>
            <div className="text-[9px] font-mono font-bold" style={{ color:'#6b7280' }}>
              {parseInt(info.ipBin.slice(start,start+8),2)}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg p-3 space-y-1 font-mono text-[9px]" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
        {[['IP  ', info.ipBin,   '#34d399'],['MASK', info.maskBin, '#fb923c'],['NET ', info.netBin,  '#60a5fa'],['BCAST',info.bcastBin,'#f87171']].map(([k,v,c])=>(
          <div key={k} className="flex items-center gap-2">
            <span className="text-gray-700 w-10 shrink-0">{k}</span>
            <span className="font-mono tracking-wider" style={{ color:c }}>{v.match(/.{8}/g).join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Collapsible step-by-step ─────────────────────────────────────────────────
function Steps({ info }) {
  const [open, setOpen] = useState(true);
  if (!info) return null;
  const S = [
    { n:1, title:'Identify the Prefix', color:'#06b6d4',
      body:`/${info.prefix} means the leftmost ${info.networkBits} bits identify the network; the remaining ${info.hostBits} bits identify the host. The slash notation (CIDR) replaced the old A/B/C class system in 1993 via RFC 1517–1519.` },
    { n:2, title:'Convert IP to Binary', color:'#3b82f6',
      body:`${info.ipStr} → ${info.ipBin.match(/.{8}/g).join('.')}\n${info.ipStr.split('.').map((o,i)=>`Octet ${i+1}: ${o} = ${parseInt(o).toString(2).padStart(8,'0')}`).join(' | ')}` },
    { n:3, title:'Write the Subnet Mask', color:'#a855f7',
      body:`Prefix /${info.prefix} → ${info.prefix} ones followed by ${info.hostBits} zeros.\nBinary : ${info.maskBin.match(/.{8}/g).join('.')}\nDecimal: ${info.mask}\nWildcard (inverted mask): ${info.wildcard}\nThe wildcard is used in ACLs and OSPF area statements.` },
    { n:4, title:'Bitwise AND → Network Address', color:'#10b981',
      body:`IP  AND Mask = Network\n${info.ipBin.match(/.{8}/g).join('.')}\nAND ${info.maskBin.match(/.{8}/g).join('.')}\n  = ${info.netBin.match(/.{8}/g).join('.')}\n  = ${info.network}\nAND forces all host bits to 0, revealing the network address.` },
    { n:5, title:'OR all host bits → Broadcast', color:'#f97316',
      body:`Set every host bit to 1 on the network address:\n${info.netBin.match(/.{8}/g).join('.')}\nOR  ${info.maskBin.split('').map(b=>b==='0'?'1':'0').join('').match(/.{8}/g).join('.')}\n  = ${info.bcastBin.match(/.{8}/g).join('.')}\n  = ${info.broadcast}\nBroadcast frames go to all hosts on the segment (never forwarded by routers).` },
    { n:6, title:'Usable Host Range', color:'#eab308',
      body:`First host = Network + 1 = ${info.firstHost}\nLast host  = Broadcast − 1 = ${info.lastHost}\n2^${info.hostBits} = ${Math.pow(2,info.hostBits).toLocaleString()} total addresses\n2^${info.hostBits} − 2 = ${info.usableHosts.toLocaleString()} usable hosts\n(−2 reserves the network and broadcast addresses per RFC 950)` },
  ];
  return (
    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
        style={{ background:'rgba(255,255,255,0.025)' }}>
        <div className="flex items-center gap-2">
          <Cpu size={12} className="text-cyan-400"/>
          <span className="text-[10px] font-black font-mono uppercase tracking-widest text-white">Step-by-Step Mathematical Breakdown</span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-600"/> : <ChevronDown size={13} className="text-gray-600"/>}
      </button>
      {open && (
        <div className="p-4 space-y-2" style={{ background:'rgba(0,0,0,0.2)' }}>
          {S.map(s => (
            <div key={s.n} className="rounded-lg p-4" style={{ background:`${s.color}08`, border:`1px solid ${s.color}20` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black font-mono shrink-0"
                  style={{ background:`${s.color}25`, color:s.color, border:`1px solid ${s.color}40` }}>{s.n}</span>
                <span className="text-[10px] font-black font-mono uppercase tracking-wider" style={{ color:s.color }}>{s.title}</span>
              </div>
              <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color:'#9ca3af' }}>{s.body}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Theory accordion ─────────────────────────────────────────────────────────
function Theory() {
  const [open, setOpen] = useState(false);
  const { certPrepMode } = useSuite();
  const sections = [
    { title:'What is an IPv4 Address?', color:'#06b6d4', body:`An IPv4 address is a 32-bit number divided into four 8-bit octets (0–255), written in dotted-decimal notation. It has two logical parts: the network portion (identifies the subnet) and the host portion (identifies the device). IPv4 was defined in RFC 791 (1981) and remains the dominant layer-3 protocol despite IPv4 exhaustion.` },
    { title:'Classful vs CIDR Addressing', color:'#a855f7', body:`Original IPv4 used fixed classes — Class A (/8, 1–126), Class B (/16, 128–191), Class C (/24, 192–223). This was extremely wasteful: a company needing 300 hosts had to get a full Class B with 65,534 addresses. CIDR (Classless Inter-Domain Routing, RFC 1517–1519, 1993) allows any prefix length, enabling precise allocation and route aggregation.` },
    { title:'Why Subnetting Exists', color:'#10b981', body:`Subnetting divides one large network into smaller broadcast domains. Smaller broadcast domains = less broadcast traffic = better performance. Subnets also improve security (traffic between subnets passes through a router/firewall), simplify management, and enable hierarchical addressing for efficient routing table aggregation.` },
    { title:'The Subnet Mask and Wildcard', color:'#f97316', body:`A subnet mask is a 32-bit number where 1-bits mark the network portion. /24 = 255.255.255.0 = 24 ones, 8 zeros. The wildcard mask is the bitwise inverse — used in Cisco ACLs ("which bits to ignore") and OSPF network statements. Wildcard 0.0.0.255 matches any last octet.` },
    { title:'RFC 1918 — Private Address Space', color:'#f43f5e', body:`RFC 1918 (1996) reserves three blocks for private use (non-routable on the public internet):\n• 10.0.0.0/8 — Class A private (16.7M addresses)\n• 172.16.0.0/12 — Class B private (172.16.x.x – 172.31.x.x)\n• 192.168.0.0/16 — Class C private (65,536 /24 networks)\nNAT (RFC 3022) translates private ↔ public addresses at the network edge.` },
    { title:'Special Addresses to Know', color:'#eab308', body:`• 0.0.0.0/0 — Default route (matches everything)\n• 127.0.0.0/8 — Loopback (127.0.0.1 = localhost, never leaves host)\n• 169.254.0.0/16 — APIPA link-local (auto-assigned when DHCP fails, RFC 3927)\n• 224.0.0.0/4 — Multicast (Class D)\n• 255.255.255.255 — Limited broadcast (stays on local segment)` },
  ];
  return (
    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
        style={{ background:'rgba(255,255,255,0.025)' }}>
        <div className="flex items-center gap-2">
          <BookOpen size={12} className="text-purple-400"/>
          <span className="text-[10px] font-black font-mono uppercase tracking-widest text-white">IPv4 Theory & Deep Dive</span>
          {certPrepMode && <CertTag obj="CCNA §22.2" />}
          {certPrepMode && <CertTag obj="Net+ N10-009 §2.1" />}
        </div>
        {open ? <ChevronUp size={13} className="text-gray-600"/> : <ChevronDown size={13} className="text-gray-600"/>}
      </button>
      {open && (
        <div className="p-4 space-y-2" style={{ background:'rgba(0,0,0,0.2)' }}>
          {sections.map(s => (
            <div key={s.title} className="rounded-lg p-4" style={{ background:`${s.color}06`, border:`1px solid ${s.color}18` }}>
              <div className="text-[10px] font-black font-mono mb-2 uppercase tracking-wider" style={{ color:s.color }}>{s.title}</div>
              <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color:'#9ca3af' }}>{s.body}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const QUICK = ['192.168.1.0/24','10.0.0.0/8','172.16.0.0/12','192.168.100.0/26','10.10.10.0/30','203.0.113.0/25'];

export default function IPv4Calculator() {
  const { certPrepMode } = useSuite();
  const [ip, setIp] = useState('192.168.1.0');
  const [prefix, setPrefix] = useState('24');
  const prevPrefixRef = useRef(24);
  const [checkIp, setCheckIp] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(() => calcSubnet('192.168.1.0','24'));

  useEffect(() => {
    const r = calcSubnet(ip.trim(), prefix);
    if (!r) { setError('Invalid IP or prefix'); setInfo(null); }
    else { setError(''); setInfo(r); }
    prevPrefixRef.current = parseInt(prefix);
  }, [ip, prefix]);

  const load = ex => { const [i,p]=ex.split('/'); setIp(i); setPrefix(p); setCheckResult(null); };

  const check = () => {
    if (!info || !checkIp.trim()) return;
    const pts = checkIp.trim().split('.').map(Number);
    if (pts.length!==4||pts.some(x=>isNaN(x)||x<0||x>255)) { setCheckResult('invalid'); return; }
    const n = pts.reduce((a,b)=>(a<<8)|b,0)>>>0;
    setCheckResult({ inSubnet:(n&info.maskInt)===info.networkInt, isNet:checkIp.trim()===info.network, isBcast:checkIp.trim()===info.broadcast, ip:checkIp.trim() });
  };

  const exportPDF = () => {
    if (!info) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('IPv4 Subnet Cheat Sheet', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`IP Address: ${info.ipStr} /${info.prefix}`, 14, 32);
    doc.text(`Network Address: ${info.network}`, 14, 38);
    doc.text(`Broadcast Address: ${info.broadcast}`, 14, 44);
    doc.text(`Subnet Mask: ${info.mask}`, 14, 50);
    doc.text(`Wildcard Mask: ${info.wildcard}`, 14, 56);
    
    doc.text(`First Usable Host: ${info.firstHost}`, 14, 68);
    doc.text(`Last Usable Host: ${info.lastHost}`, 14, 74);
    doc.text(`Total IPs: ${info.totalIPs.toLocaleString()}`, 14, 80);
    doc.text(`Usable Hosts: ${info.usableHosts.toLocaleString()}`, 14, 86);
    
    doc.text(`IP Class: ${info.ipClass}`, 14, 98);
    doc.text(`Type: ${info.isPrivate ? 'Private (RFC 1918)' : 'Public'}`, 14, 104);

    doc.autoTable({
      startY: 115,
      head: [['Attribute', 'Binary Value']],
      body: [
        ['IP Address', info.ipBin.match(/.{8}/g).join('.')],
        ['Subnet Mask', info.maskBin.match(/.{8}/g).join('.')],
        ['Network', info.netBin.match(/.{8}/g).join('.')],
        ['Broadcast', info.bcastBin.match(/.{8}/g).join('.')]
      ],
      theme: 'grid',
      styles: { font: 'courier', fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`IPv4_Subnet_${info.ipStr}_${info.prefix}.pdf`);
  };

  const clsColor = { A:'#3b82f6', B:'#a855f7', C:'#10b981', D:'#eab308', E:'#f43f5e' };

  // Knowledge panel data
  const scenarios = [
    { name:'Home Router', icon:'🏠', net:'192.168.1.0/24', desc:'Consumer routers default to this. 254 hosts, single broadcast domain. NAT translates private→public at WAN port.', devices:['Router (192.168.1.1)','PC (.10)','Phone (.20)','TV (.30)','Printer (.50)'] },
    { name:'Enterprise LAN', icon:'🏢', net:'10.10.0.0/16', desc:'Large flat network for campus. 65,534 hosts. Usually sub-divided into VLANs per department.', devices:['Core Switch','Distribution Layer','Access Switches','VLANs 10/20/30/40'] },
    { name:'Point-to-Point Link', icon:'🔗', net:'10.0.0.0/30', desc:'Only 2 usable hosts. Used on WAN links between routers. RFC 3021 allows /31 (0 overhead).', devices:['Router A (.1)','Router B (.2)','No broadcast needed'] },
    { name:'Firewall DMZ', icon:'🛡️', net:'172.16.1.0/28', desc:'14 hosts. DMZ isolates public-facing servers from internal LAN. Firewall has 3 interfaces: WAN/DMZ/LAN.', devices:['Web Server (.2)','Mail Server (.3)','DNS Server (.4)','Firewall (.1)'] },
    { name:'Data Center /25', icon:'🖥️', net:'10.100.0.0/25', desc:'128 IPs split for east-west traffic. Servers use /25 for rack isolation. Spine-leaf topology.', devices:['Spine Switch','Leaf Switch','Servers (.10–.126)','IPMI (.200–.254)'] },
    { name:'VLAN Segments', icon:'📡', net:'192.168.0.0/22', desc:'Supernet covering 4×/24 VLANs. Each VLAN = one /24. Router-on-a-stick or L3 switch routes between.', devices:['VLAN10: 192.168.0.0/24','VLAN20: 192.168.1.0/24','VLAN30: 192.168.2.0/24','VLAN40: 192.168.3.0/24'] },
  ];
  const protocols = [
    { name:'ARP', color:'#f97316', port:'—', desc:'Resolves IP→MAC within a subnet. Only works within the broadcast domain (same /prefix). Gratuitous ARP used for failover.' },
    { name:'DHCP', color:'#06b6d4', port:'67/68 UDP', desc:'Assigns IP, mask, gateway, DNS to hosts. Server listens on :67, client on :68. DORA: Discover→Offer→Request→ACK.' },
    { name:'OSPF', color:'#10b981', port:'89 IP', desc:'Link-state IGP. Uses wildcard masks in area statements. Multicast 224.0.0.5 (all OSPF) / 224.0.0.6 (DR/BDR). /30 or /31 on P2P links.' },
    { name:'BGP', color:'#a855f7', port:'179 TCP', desc:'Path-vector EGP. Advertises CIDR prefixes. Aggregate-address summarises subnets. Requires exact prefix match for next-hop.' },
    { name:'ICMP', color:'#eab308', port:'—', desc:'Ping (Type 8/0), Traceroute (TTL exceeded Type 11). Blocked at firewall borders but needed for Path MTU Discovery.' },
    { name:'NAT/PAT', color:'#f43f5e', port:'—', desc:'Translates RFC 1918 private addresses to public. PAT (overload) maps many privates to one public IP using port numbers.' },
  ];

  return (
    <div className="flex gap-0 min-h-screen" style={{background:'transparent'}}>

      {/* ── LEFT COLUMN: Calculator ── */}
      <div className="flex-1 min-w-0 p-6 pb-10 space-y-5">

      {/* Hero strip */}
      <div className="rounded-2xl p-5 relative overflow-hidden ns-glass-green">
        <div className="absolute right-4 top-4 text-[60px] opacity-[0.04] font-black select-none pointer-events-none">IPv4</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{ background:'rgba(16,185,129,0.15)', color:'#34d399', border:'1px solid rgba(16,185,129,0.3)' }}>CORE TOOL</span>
          <span className="text-[9px] font-mono text-gray-600">RFC 950 · RFC 1519 · RFC 4632</span>
        </div>
        <h2 className="text-lg font-black text-white mb-0.5">IPv4 Subnet Calculator</h2>
        <p className="text-[11px] font-mono text-gray-500 max-w-xl">Complete IPv4 analysis — network/broadcast addresses, binary representation, 32-bit visual map, membership checking, and a full step-by-step mathematical breakdown.</p>
      </div>

      {/* Input */}
      <div className="rounded-2xl p-5 ns-glass-green">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-px h-4 rounded-full bg-emerald-400"/>
          <span className="text-[9px] font-black font-mono uppercase tracking-widest text-emerald-400">Input</span>
          <span className="text-[8px] font-mono px-2 py-0.5 rounded-full" style={{ background:'rgba(16,185,129,0.08)', color:'#6b7280', border:'1px solid rgba(16,185,129,0.12)' }}>Beginner Friendly</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-gray-600 block mb-1.5">IP Address</label>
            <input value={ip} onChange={e=>setIp(e.target.value)} placeholder="192.168.1.0"
              className="w-full rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none transition-all"
              style={{ background:'rgba(0,0,0,0.3)', border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(16,185,129,0.25)'}` }}/>
          </div>
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-gray-600 block mb-1.5">
              Prefix — <span style={{ color:'#34d399' }}>/{prefix}</span> {info && <span className="text-gray-600">({info.usableHosts.toLocaleString()} usable hosts)</span>}
            </label>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="32" value={prefix} onChange={e=>setPrefix(e.target.value)} className="flex-1 accent-emerald-400"/>
              <div className="w-14 rounded-xl px-2 py-2 text-sm font-mono text-center font-bold"
                style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(16,185,129,0.25)', color:'#34d399' }}>/{prefix}</div>
            </div>
          </div>
        </div>
        {error && <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono mb-3"><AlertTriangle size={11}/>{error}</div>}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[8px] font-mono text-gray-700 self-center">Examples:</span>
          {QUICK.map(ex => (
            <button key={ex} onClick={()=>load(ex)}
              className="text-[9px] font-mono px-2.5 py-1 rounded-full transition-colors hover:text-white"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'#6b7280' }}>{ex}</button>
          ))}
        </div>
      </div>

      {info && (<>
        {/* Results */}
        <div className="flex items-center justify-between mb-2 mt-6">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Calculated Results</span>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-colors"
            style={{background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)'}}>
            <Download size={12}/> Export PDF
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card label="Network Address"   value={info.network}                 color="#06b6d4" copyable/>
          <Card label="Broadcast Address" value={info.broadcast}               color="#f43f5e" copyable/>
          <Card label="First Host"        value={info.firstHost}               color="#10b981" copyable/>
          <Card label="Last Host"         value={info.lastHost}                color="#10b981" copyable/>
          <Card label="Usable Hosts"      value={info.usableHosts.toLocaleString()} color="#a855f7" sub={`Total: ${info.totalIPs.toLocaleString()}`}/>
          <Card label="Subnet Mask"       value={info.mask}                    color="#f97316" copyable sub={`Wildcard: ${info.wildcard}`}/>
          <Card label="CIDR"              value={info.cidr}                    color="#eab308" copyable/>
          <Card label="IP Class" value={info.ipClass} color={clsColor[info.ipClass]||'#6b7280'}
            sub={info.isPrivate?'🔒 Private (RFC 1918)':'🌐 Public'}/>
        </div>

        {/* Animated Bit map */}
        <div className="rounded-2xl p-5 ns-glass">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={12} className="text-cyan-400"/>
            <span className="text-[9px] font-black font-mono uppercase tracking-widest text-cyan-400">32-Bit Visual Map — Live Animation</span>
          </div>
          <AnimatedBitMap info={info} prevPrefix={prevPrefixRef.current} setIp={setIp}/>
        </div>

        {/* Live Topology */}
        <NetworkDiagram info={info}/>

        {/* Membership checker */}
        <div className="rounded-2xl p-5 ns-glass-blue">
          <div className="text-[9px] font-black font-mono uppercase tracking-widest text-blue-400 mb-1">Address Membership Checker</div>
          <p className="text-[9px] font-mono text-gray-600 mb-3">Verify if any IP is within <span style={{ color:'#93c5fd' }}>{info.cidr}</span>. Invaluable for ACL design and troubleshooting.</p>
          <div className="flex gap-2">
            <input value={checkIp} onChange={e=>setCheckIp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&check()}
              placeholder="e.g. 192.168.1.50"
              className="flex-1 rounded-xl px-4 py-2 text-xs font-mono text-white outline-none"
              style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(59,130,246,0.2)' }}/>
            <button onClick={check} className="px-4 py-2 rounded-xl text-[10px] font-black font-mono uppercase transition-all hover:brightness-125"
              style={{ background:'rgba(59,130,246,0.15)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.3)' }}>Check →</button>
          </div>
          {checkResult && checkResult !== 'invalid' && (
            <div className="mt-3 p-3 rounded-xl text-[10px] font-mono space-y-0.5"
              style={{ background:checkResult.inSubnet?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)', border:`1px solid ${checkResult.inSubnet?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}` }}>
              <div className="font-bold" style={{ color:checkResult.inSubnet?'#34d399':'#f87171' }}>
                {checkResult.inSubnet?'✓ IN SUBNET':'✗ NOT IN SUBNET'} — {checkResult.ip}</div>
              {checkResult.isNet && <div className="text-cyan-400">⚑ Network address — non-assignable</div>}
              {checkResult.isBcast && <div className="text-red-400">⚑ Broadcast address — non-assignable</div>}
            </div>
          )}
          {checkResult === 'invalid' && <p className="mt-2 text-red-400 text-[10px] font-mono">Invalid IP format.</p>}
        </div>

        <Steps info={info}/>

        {/* ── NEW: Subnet Split Tool ── */}
        <SubnetSplitTool info={info}/>

        {/* ── NEW: CIDR Overlap Detector ── */}
        <OverlapDetector/>

        {/* ── NEW: Address Timeline ── */}
        <AddressTimeline info={info}/>

        <Theory/>
      </>)}
      </div>{/* end left column */}

      {/* ── RIGHT COLUMN: Knowledge Panel ── */}
      <div className="w-[360px] shrink-0 border-l border-white/[0.04] overflow-y-auto" style={{background:'transparent'}}>
        <div className="p-4 space-y-4 sticky top-0">

          {/* Live stats when info exists */}
          {info && (
            <div className="rounded-xl p-4" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)'}}>
              <div className="text-[8px] font-black font-mono uppercase tracking-widest text-emerald-400 mb-3">Live Subnet Stats</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {l:'CIDR',      v:info.cidr,                         c:'#34d399'},
                  {l:'Hosts',     v:info.usableHosts.toLocaleString(), c:'#a855f7'},
                  {l:'Network',   v:info.network,                      c:'#06b6d4'},
                  {l:'Broadcast', v:info.broadcast,                    c:'#f43f5e'},
                  {l:'Mask',      v:info.mask,                         c:'#f97316'},
                  {l:'Wildcard',  v:info.wildcard,                     c:'#eab308'},
                ].map(r=>(
                  <div key={r.l} className="rounded-lg p-2" style={{background:'rgba(0,0,0,0.2)'}}>
                    <div className="text-[7px] font-mono text-gray-600 uppercase tracking-wider">{r.l}</div>
                    <div className="text-[9px] font-mono font-bold truncate" style={{color:r.c}}>{r.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="text-[7px] font-mono text-gray-600 mb-1">Address Space Used</div>
                <div className="h-1.5 rounded-full" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full" style={{width:`${Math.min(100,(info.usableHosts/info.totalIPs)*100).toFixed(0)}%`,background:'linear-gradient(to right,#10b981,#06b6d4)'}}/>
                </div>
                <div className="text-[7px] font-mono text-gray-600 mt-1">{info.networkBits} network bits · {info.hostBits} host bits · {info.isPrivate?'Private RFC1918':'Public'}</div>
              </div>
            </div>
          )}

          {/* Real-world Scenarios */}
          <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{background:'rgba(255,255,255,0.03)'}}>
              <span className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400">Real-World Scenarios</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {scenarios.map(s=>(
                <div key={s.name} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-[10px] font-bold text-white">{s.name}</span>
                    <code className="text-[8px] font-mono ml-auto" style={{color:'#06b6d4'}}>{s.net}</code>
                  </div>
                  <p className="text-[9px] font-mono text-gray-600 leading-relaxed mb-1.5">{s.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.devices.map(d=>(
                      <span key={d} className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(6,182,212,0.08)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.15)'}}>{d}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Protocol Reference */}
          <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="px-4 py-2.5" style={{background:'rgba(255,255,255,0.03)'}}>
              <span className="text-[8px] font-black font-mono uppercase tracking-widest text-purple-400">Protocols Operating at Layer 3</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {protocols.map(p=>(
                <div key={p.name} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black font-mono" style={{color:p.color}}>{p.name}</span>
                    {p.port!=='—' && <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{background:`${p.color}12`,color:p.color,border:`1px solid ${p.color}25`}}>{p.port}</span>}
                  </div>
                  <p className="text-[9px] font-mono text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Topology Topology Cheatsheet */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-amber-400 mb-3">Subnet Design Cheatsheet</div>
            <div className="space-y-2 text-[9px] font-mono">
              {[
                {q:'Need 50 hosts?',  a:'Use /26 → 62 usable hosts (next power of 2 above 52)'},
                {q:'P2P WAN link?',   a:'Use /30 (2 hosts) or /31 (RFC3021, no net/bcast)'},
                {q:'Split a /24?',    a:'Two /25 = 126 hosts each. Four /26 = 62 each'},
                {q:'Loopback iface?', a:'Use /32 — single host route, no network/broadcast'},
                {q:'VLAN per floor?', a:'Assign a /24 per VLAN. Use L3 switch for inter-VLAN'},
                {q:'Firewall zones?', a:'WAN:/30, DMZ:/28, LAN:/24. Separate broadcast domains'},
                {q:'Router interface?',a:'Assign .1 of each subnet as default gateway'},
                {q:'HSRP/VRRP?',     a:'Use .254 or .1 for VIP. Two routers share one virtual IP'},
              ].map(r=>(
                <div key={r.q} className="rounded-lg p-2.5" style={{background:'rgba(0,0,0,0.15)'}}>
                  <div className="font-bold text-amber-400 mb-0.5">{r.q}</div>
                  <div className="text-gray-500">{r.a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RFC Quick Reference */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-rose-400 mb-3">Essential RFCs</div>
            <div className="space-y-1.5">
              {[
                {rfc:'RFC 791',  title:'Internet Protocol (IPv4)',         year:1981},
                {rfc:'RFC 950',  title:'Internet Standard Subnetting',     year:1985},
                {rfc:'RFC 1517', title:'CIDR Introduction',                year:1993},
                {rfc:'RFC 1918', title:'Private Address Space',            year:1996},
                {rfc:'RFC 2317', title:'Classless IN-ADDR.ARPA Delegation',year:1998},
                {rfc:'RFC 3021', title:'Using /31 on Point-to-Point Links',year:2000},
                {rfc:'RFC 4632', title:'CIDR — Strategy and Support',      year:2006},
                {rfc:'RFC 6890', title:'Special-Purpose IP Address Registry',year:2013},
              ].map(r=>(
                <div key={r.rfc} className="flex items-center gap-2">
                  <span className="text-[8px] font-black font-mono w-16 shrink-0" style={{color:'#fb7185'}}>{r.rfc}</span>
                  <span className="text-[8px] font-mono text-gray-500 flex-1">{r.title}</span>
                  <span className="text-[7px] font-mono text-gray-700">{r.year}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OSI Context */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-indigo-400 mb-3">OSI Model Context</div>
            <div className="space-y-1">
              {[
                {l:7,name:'Application', ex:'HTTP, DNS, SMTP',       dim:true},
                {l:6,name:'Presentation',ex:'TLS, SSL, encoding',     dim:true},
                {l:5,name:'Session',     ex:'NetBIOS, RPC',           dim:true},
                {l:4,name:'Transport',   ex:'TCP (ports), UDP',       dim:true},
                {l:3,name:'Network',     ex:'IPv4 ← YOU ARE HERE',    dim:false, color:'#10b981'},
                {l:2,name:'Data Link',   ex:'Ethernet, ARP, VLANs',  dim:true},
                {l:1,name:'Physical',    ex:'Cables, fibre, radio',   dim:true},
              ].map(r=>(
                <div key={r.l} className="flex items-center gap-2 rounded px-2 py-1" style={{background:r.dim?'transparent':'rgba(16,185,129,0.08)',border:r.dim?'none':'1px solid rgba(16,185,129,0.2)'}}>
                  <span className="text-[8px] font-black font-mono w-4 text-center" style={{color:r.dim?'#374151':'#34d399'}}>{r.l}</span>
                  <span className="text-[8px] font-mono w-20" style={{color:r.dim?'#4b5563':r.color||'#34d399'}}>{r.name}</span>
                  <span className="text-[8px] font-mono" style={{color:r.dim?'#374151':'#34d399'}}>{r.ex}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>{/* end right column */}
    </div>
  );
}
