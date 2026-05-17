import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Globe, GitBranch, Layers, List, BookOpen,
  ArrowUpDown, Printer, Download, FileText, ChevronRight,
  Zap, Network, Wifi, GraduationCap, Map, Monitor, Database,
  Keyboard, X, Trophy, Flag, Radar, Activity, Shield, Code, Terminal
} from 'lucide-react';

import { SuiteProvider, useSuite } from './components/network-suite/SuiteContext';
import IPv4Calculator from './components/network-suite/IPv4Calculator';
import IPv6Suite from './components/network-suite/IPv6Suite';
import VLSMPlanner from './components/network-suite/VLSMPlanner';
import SubnetMasks from './components/network-suite/SubnetMasks';
import CIDRReference from './components/network-suite/CIDRReference';
import IPClasses from './components/network-suite/IPClasses';
import Supernetting from './components/network-suite/Supernetting';
import LearningPaths from './components/network-suite/LearningPaths';
import QuizMode from './components/network-suite/QuizMode';
import ConceptMap from './components/network-suite/ConceptMap';
import NetworkCanvas from './components/network-suite/NetworkCanvas';
import SubnetTracker from './components/network-suite/SubnetTracker';
import ProtocolStack from './components/network-suite/ProtocolStack';
import CertPrepHub from './components/network-suite/CertPrepHub';
import MacAnalyzer from './components/network-suite/MacAnalyzer';
import ApiDocs from './components/network-suite/ApiDocs';

// ── Tool registry ─────────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'ipv4', label: 'IPv4 Calculator', short: 'IPv4', icon: Calculator, badge: 'CORE', color: '#10b981', glow: 'rgba(16,185,129,0.25)', component: IPv4Calculator, urlSlug: 'ipv4cal' },
  { id: 'ipv6', label: 'IPv6 Suite', short: 'IPv6', icon: Globe, badge: 'CORE', color: '#3b82f6', glow: 'rgba(59,130,246,0.25)', component: IPv6Suite, urlSlug: 'ipv6' },
  { id: 'vlsm', label: 'VLSM Planner', short: 'VLSM', icon: GitBranch, badge: 'ADV', color: '#a855f7', glow: 'rgba(168,85,247,0.25)', component: VLSMPlanner, urlSlug: 'vlsm' },
  { id: 'masks', label: 'Subnet Masks', short: 'Masks', icon: Layers, badge: 'BEG', color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', component: SubnetMasks, urlSlug: 'subnet' },
  { id: 'cidr', label: 'CIDR Reference', short: 'CIDR', icon: List, badge: 'REF', color: '#06b6d4', glow: 'rgba(6,182,212,0.25)', component: CIDRReference, urlSlug: 'cidr' },
  { id: 'classes', label: 'IP Classes', short: 'Classes', icon: BookOpen, badge: 'BEG', color: '#f97316', glow: 'rgba(249,115,22,0.25)', component: IPClasses, urlSlug: 'ipclass' },
  { id: 'supernet', label: 'Supernetting', short: 'Super', icon: ArrowUpDown, badge: 'ADV', color: '#ec4899', glow: 'rgba(236,72,153,0.25)', component: Supernetting, urlSlug: 'supernet' },
  { id: 'mac', label: 'MAC Analyzer', short: 'MAC', icon: Shield, badge: 'CORE', color: '#0ea5e9', glow: 'rgba(14,165,233,0.25)', component: MacAnalyzer, urlSlug: 'mac' },
  { id: 'api', label: 'Developer API', short: 'API', icon: Code, badge: 'ADV', color: '#10b981', glow: 'rgba(16,185,129,0.25)', component: ApiDocs, urlSlug: 'api' },
];

const BADGE_META = {
  CORE: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  ADV: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  BEG: { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: 'rgba(59,130,246,0.3)' },
  REF: { bg: 'rgba(6,182,212,0.15)', color: '#67e8f9', border: 'rgba(6,182,212,0.3)' },
};

const SUITE_TOOLS = [
  { id:'learning', label:'Learning Paths', short:'Learn', icon:GraduationCap, color:'#10b981', glow:'rgba(16,185,129,0.25)' },
  { id:'quiz',     label:'Challenge Quiz', short:'Quiz',  icon:Trophy,         color:'#f59e0b', glow:'rgba(245,158,11,0.25)' },
  { id:'canvas',   label:'Network Canvas', short:'Canvas',icon:Monitor,        color:'#3b82f6', glow:'rgba(59,130,246,0.25)' },
  { id:'concepts', label:'Concept Map',    short:'Map',   icon:Map,            color:'#8b5cf6', glow:'rgba(139,92,246,0.25)' },
  { id:'tracker',  label:'Subnet Tracker', short:'Track', icon:Database,       color:'#06b6d4', glow:'rgba(6,182,212,0.25)' },
  { id:'ostack',   label:'OSI Stack',      short:'OSI',   icon:Layers,         color:'#a855f7', glow:'rgba(168,85,247,0.25)' },
  { id:'certhub',  label:'Cert Prep Hub',  short:'Certs', icon:Flag,           color:'#ef4444', glow:'rgba(239,68,68,0.25)' },
];

const DID_YOU_KNOW = [
  {cat:'IPv4',icon:'🌐',f:'IPv4 has ~4.3 billion addresses — fewer than the world\'s population!'},
  {cat:'IPv4',icon:'🌐',f:'The internet ran out of IPv4 addresses in 2011 (IANA pool exhausted).'},
  {cat:'IPv4',icon:'🌐',f:'IPv4 has ~4.3 billion addresses — IANA assigned the last /8 block in 2011.'},
  {cat:'IPv6',icon:'🚀',f:'IPv6 has 2¹²⁸ addresses — enough for every grain of sand on Earth, many times over.'},
  {cat:'CIDR',icon:'📐',f:'CIDR was introduced in 1993 (RFC 1518) to slow IPv4 exhaustion.'},
  {cat:'Masks',icon:'🔢',f:'A /31 subnet (RFC 3021) uses just 2 IPs — perfect for point-to-point links.'},
  {cat:'BGP',icon:'🗺️',f:'BGP (RFC 4271) is how the 70,000+ internet Autonomous Systems exchange routes.'},
  {cat:'BGP',icon:'🗺️',f:'The longest valid BGP prefix most ISPs accept is /24.'},
  {cat:'Classes',icon:'📚',f:'Class D (224–239) is entirely reserved for multicast — never used as unicast.'},
  {cat:'Routing',icon:'🔄',f:'OSPF uses Dijkstra\'s shortest-path algorithm, invented in 1956.'},
  {cat:'IPv4',icon:'🌐',f:'127.0.0.0/8 is entirely loopback — RFC 990 reserved the whole /8.'},
  {cat:'IPv4',icon:'🌐',f:'10.0.0.0/8 alone holds 16.7 million private addresses.'},
  {cat:'L2',icon:'🔗',f:'ARP (RFC 826) was defined in 1982 — it\'s still running on your LAN right now.'},
  {cat:'IPv4',icon:'🌐',f:'TTL was originally measured in seconds; today it\'s just a hop counter.'},
  {cat:'TCP',icon:'📦',f:'TCP\'s 3-way handshake (SYN, SYN-ACK, ACK) was designed in 1973.'},
  {cat:'UDP',icon:'⚡',f:'UDP has no error recovery — apps like DNS and DHCP handle retries themselves.'},
  {cat:'IPv4',icon:'🌐',f:'The 169.254.0.0/16 range is APIPA — your PC uses it when DHCP fails.'},
  {cat:'IPv6',icon:'🚀',f:'fe80::/10 is the IPv6 link-local prefix — auto-assigned to every interface.'},
  {cat:'IPv6',icon:'🚀',f:'::1 is the IPv6 loopback, equivalent to IPv4\'s 127.0.0.1.'},
  {cat:'IPv6',icon:'🚀',f:'EUI-64 builds an IPv6 address from your 48-bit MAC + FF:FE inserted in the middle.'},
  {cat:'VLSM',icon:'🌿',f:'VLSM was adopted by OSPF and EIGRP in the early 1990s, killing RIPv1\'s dominance.'},
  {cat:'Routing',icon:'🔄',f:'The 0.0.0.0/0 route is the "default route" — the internet\'s catch-all.'},
  {cat:'Supernet',icon:'🔗',f:'Supernetting aggregates contiguous networks — ISPs use it to keep BGP tables small.'},
  {cat:'IPv4',icon:'🌐',f:'RFC 1918 (1996) defined private address space: 10/8, 172.16/12, 192.168/16.'},
  {cat:'DNS',icon:'📖',f:'DNS runs on UDP port 53 for queries and TCP port 53 for zone transfers.'},
  {cat:'Security',icon:'🔒',f:'HTTPS (port 443) encrypts HTTP using TLS — designed by Netscape in 1994.'},
  {cat:'Security',icon:'🔒',f:'SSH (port 22) replaced Telnet (port 23) — because Telnet sends passwords in plaintext!'},
  {cat:'ICMP',icon:'📡',f:'ICMP is Layer 3 — ping does NOT use TCP or UDP.'},
  {cat:'IPv4',icon:'🌐',f:'The Class B range 172.16–172.31 is often called "VPN space" in enterprises.'},
  {cat:'Masks',icon:'🔢',f:'A /30 subnet wastes 2 IPs (network + broadcast) for only 2 usable hosts.'},
  {cat:'NAT',icon:'🔁',f:'NAT (RFC 1631) was a temporary fix for IPv4 exhaustion — from 1994. Still here!'},
  {cat:'IPv6',icon:'🚀',f:'IPv6 was standardised in RFC 2460 (1998) — but only surpassed 35% internet traffic in 2022.'},
  {cat:'TCP',icon:'📦',f:'TCP\'s sliding window allows up to 65,535 bytes in flight without acknowledgment.'},
  {cat:'L2',icon:'🔗',f:'Ethernet frames have a minimum size of 64 bytes to allow collision detection on half-duplex.'},
  {cat:'Routing',icon:'🔄',f:'EIGRP uses DUAL (Diffusing Update Algorithm) to compute loop-free successors.'},
  {cat:'Security',icon:'🔒',f:'SNMPv1 and v2c send community strings in plaintext — always use SNMPv3 AuthPriv.'},
  {cat:'IPv6',icon:'🚀',f:'SLAAC (Stateless Address Autoconfiguration) lets IPv6 hosts configure themselves using RA messages.'},
  {cat:'BGP',icon:'🗺️',f:'BGP route reflectors eliminate the need for a full iBGP mesh within an AS.'},
  {cat:'CIDR',icon:'📐',f:'Before CIDR, a Class B had to be assigned even if you only needed 300 hosts — wasting ~65,000 IPs.'},
  {cat:'TCP',icon:'📦',f:'TIME_WAIT state in TCP lasts 2×MSL (Maximum Segment Lifetime) — typically 4 minutes.'},
  {cat:'Routing',icon:'🔄',f:'Administrative Distance (AD) breaks ties when multiple routing protocols know the same route.'},
  {cat:'L2',icon:'🔗',f:'802.1Q VLAN tags are 4 bytes: 2-byte TPID (0x8100) + 2-byte TCI (PCP + DEI + VID).'},
  {cat:'Security',icon:'🔒',f:'TLS 1.3 removed RSA key exchange — perfect forward secrecy (ECDHE) is now mandatory.'},
  {cat:'IPv4',icon:'🌐',f:'The broadcast address of 255.255.255.255 is "limited broadcast" — never forwarded by routers.'},
  {cat:'DNS',icon:'📖',f:'A DNS AAAA record holds an IPv6 address — "AAAA" because it\'s 4× larger than an A record.'},
  {cat:'Routing',icon:'🔄',f:'OSPF areas reduce LSA flooding — area 0 (backbone) must connect all other areas.'},
  {cat:'IPv6',icon:'🚀',f:'IPv6 Unique Local Addresses (fc00::/7) are the IPv6 equivalent of RFC 1918 private space.'},
  {cat:'TCP',icon:'📦',f:'Nagle\'s algorithm buffers small TCP segments to reduce overhead — disabled with TCP_NODELAY.'},
  {cat:'Security',icon:'🔒',f:'ARP Poisoning (gratuitous ARP) is a classic MitM attack — mitigated by Dynamic ARP Inspection (DAI).'},
  {cat:'VLSM',icon:'🌿',f:'Variable-length masks require classless routing — RIPv1 and IGRP cannot carry mask information.'},
  {cat:'BGP',icon:'🗺️',f:'BGP NEXT_HOP, AS_PATH, LOCAL_PREF and MED are the four most critical BGP path attributes.'},
  {cat:'L2',icon:'🔗',f:'STP (802.1D) takes up to 50 seconds to converge — RSTP (802.1w) converges in under 1 second.'},
  {cat:'IPv4',icon:'🌐',f:'IP fragmentation (RFC 791) splits oversized packets at intermediate routers — TCP Path MTU Discovery avoids it.'},
  {cat:'Security',icon:'🔒',f:'WPA3 uses SAE (Simultaneous Authentication of Equals) instead of PSK handshake — eliminates offline dictionary attacks.'},
  {cat:'Routing',icon:'🔄',f:'Longest Prefix Match (LPM) always wins routing decisions — a /28 beats a /24 for matching traffic.'},
  {cat:'DNS',icon:'📖',f:'DNS TTL (Time To Live) controls how long resolvers cache records — set too high and changes propagate slowly.'},
  {cat:'IPv6',icon:'🚀',f:'IPv6 Neighbor Discovery Protocol (NDP) replaces both ARP and ICMP Router Discovery from IPv4.'},
  {cat:'TCP',icon:'📦',f:'TCP Fast Open (TFO) lets data be sent in the SYN packet, saving one RTT on repeat connections.'},
  {cat:'Security',icon:'🔒',f:'RPKI (Resource Public Key Infrastructure) cryptographically validates BGP route origins — prevents route hijacking.'},
  {cat:'CIDR',icon:'📐',f:'The global BGP routing table hit 1,000,000 prefixes in 2022 — CIDR aggregation keeps it manageable.'},
  {cat:'Routing',icon:'🔄',f:'IS-IS uses TLV (Type-Length-Value) encoded LSPs — it can run native IPv6 without any extensions.'},
  {cat:'Masks',icon:'🔢',f:'Wildcard masks in Cisco ACLs are the bitwise inverse of subnet masks — 0 bits must match, 1 bits are ignored.'},
];


// ── Cert Prep Tag ─────────────────────────────────────────────────────────────
export function CertTag({ obj }) {
  return (
    <span style={{ background:'rgba(245,158,11,0.13)', border:'1px solid rgba(245,158,11,0.38)', color:'#fbbf24', fontSize:7, fontWeight:700, padding:'1px 6px', borderRadius:999, fontFamily:'monospace', display:'inline-block', marginLeft:4 }}>
      🎓 {obj}
    </span>
  );
}

// ── Did You Know Toast ────────────────────────────────────────────────────────
function DidYouKnowToast({ fact, onClose }) {
  const [progress, setProgress] = React.useState(100);
  useEffect(() => {
    const start = Date.now();
    const dur = 6000;
    const t = setInterval(() => { setProgress(Math.max(0, 100 - ((Date.now()-start)/dur)*100)); }, 50);
    const close = setTimeout(onClose, dur);
    return () => { clearInterval(t); clearTimeout(close); };
  }, [fact, onClose]);
  const item = typeof fact === 'object' ? fact : { f: fact, cat: null, icon: '💡' };
  return (
    <div className="fixed top-4 right-4 z-50 max-w-xs" style={{ animation:'fadeSlideUp 0.3s ease forwards' }}>
      <div className="ns-glass-cyan rounded-2xl p-4 shadow-2xl" style={{ boxShadow:'0 8px 40px rgba(6,182,212,0.25)' }}>
        <div className="flex items-start gap-2">
          <span className="text-base shrink-0">{item.icon || '💡'}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-widest">Did You Know?</span>
              {item.cat && <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full" style={{background:'rgba(6,182,212,0.15)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.3)'}}>{item.cat}</span>}
            </div>
            <p className="text-[9px] text-gray-200 leading-relaxed">{item.f}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 shrink-0 mt-0.5"><X size={11}/></button>
        </div>
        <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
          <div className="h-full rounded-full transition-none" style={{width:`${progress}%`,background:'rgba(6,182,212,0.6)'}}/>
        </div>
      </div>
    </div>
  );
}

// ── Keyboard Shortcuts Bar ────────────────────────────────────────────────────
function ShortcutsBar({ onClose }) {
  const shortcuts = [
    ['1–7','Switch IP Tool'],['Tab','Next Tool'],['Shift+Tab','Prev Tool'],
    ['L','Learning Paths'],['Q','Quiz'],['C','Canvas'],['M','Concept Map'],
    ['T','Tracker'],['P','OSI Stack'],['?','Toggle This Bar'],['Esc','Close Panel'],
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-2" style={{animation:'fadeSlideUp 0.3s ease forwards'}}>
      <div className="ns-glass rounded-2xl px-4 py-2.5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 shrink-0">
          <Keyboard size={12} className="text-cyan-400"/>
          <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-widest">Shortcuts</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 flex-1">
          {shortcuts.map(([key,desc]) => (
            <span key={key} className="text-[8px] font-mono text-gray-400 whitespace-nowrap">
              <kbd className="px-1 py-0.5 rounded" style={{background:'rgba(255,255,255,0.1)',color:'#e2e8f0',fontFamily:'monospace',border:'1px solid rgba(255,255,255,0.15)'}}>{key}</kbd>
              {' '}{desc}
            </span>
          ))}
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 shrink-0"><X size={11}/></button>
      </div>
    </div>
  );
}

// ── URL hash sync ─────────────────────────────────────────────────────────────
function getToolFromHash() {
  const hash = window.location.hash.replace('#', '');
  const slug = hash.split('/')[1];
  if (!slug) return 'ipv4';
  return TOOLS.find(t => t.urlSlug === slug)?.id || 'ipv4';
}

function setHashForTool(toolId) {
  const tool = TOOLS.find(t => t.id === toolId);
  if (tool) {
    window.history.replaceState(null, '', `#NetworkSuite/${tool.urlSlug}`);
  }
}

// ── Export helpers ────────────────────────────────────────────────────────────
function handlePrint() { window.print(); }

function handleSaveTxt(activeTool) {
  const tool = TOOLS.find(t => t.id === activeTool);
  const content = [
    `NEXUS SNIFFERBYTE — Network Suite`,
    `Tool: ${tool?.label || activeTool}`,
    `Generated: ${new Date().toLocaleString()}`,
    `────────────────────────────────────────────────────────`,
    ``,
    `Please use the browser's Print function (Ctrl+P) to save`,
    `the full interactive content as a PDF.`,
    ``,
    `Tool URL: ${window.location.href}`,
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `NetworkSuite_${tool?.urlSlug || activeTool}_${Date.now()}.txt`;
  a.click();
}

// ── Animated Tab Bar ──────────────────────────────────────────────────────────
function HorizontalTabs({ active, onChange }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 scrollbar-hide">
      {TOOLS.map((tool, idx) => {
        const isActive = active === tool.id;
        const bm = BADGE_META[tool.badge];
        return (
          <button
            key={tool.id}
            onClick={() => onChange(tool.id)}
            className="group flex flex-col items-start gap-2 px-3 py-2 rounded-2xl transition-all duration-300 shrink-0 relative hover:-translate-y-1 hover:shadow-lg"
            style={{
              minWidth: '110px',
              background: isActive ? '#161b22' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isActive ? tool.color : 'rgba(240,246,252,0.1)'}`,
              boxShadow: isActive ? `0 8px 24px ${tool.color}30` : 'none',
              transform: isActive ? 'translateY(-2px)' : 'none',
            }}>
            
            <div className="flex justify-between w-full items-center">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300" style={{ background: isActive ? tool.color : 'rgba(240,246,252,0.05)' }}>
                    <tool.icon size={14} style={{ color: isActive ? '#fff' : '#8b949e' }} className="group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[8px] font-black font-mono px-1 py-0.5 rounded text-white shadow-sm" style={{ background: bm.bg, border: `1px solid ${bm.border}` }}>
                  {tool.badge}
                </span>
            </div>

            <span className="text-[11px] font-bold mt-0.5 tracking-tight" style={{ color: isActive ? '#e6edf3' : '#8b949e' }}>
              {tool.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
function NetworkSuiteInner() {
  const { xp, streak, unlockAchievement, achievements, certPrepMode, setCertPrepMode, theme, setTheme } = useSuite();
  const [activeTool, setActiveTool] = useState(() => getToolFromHash());
  const [activeSuite, setActiveSuite] = useState(null); // suite panel id or null
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const toastIdx = useRef(0);

  const dismissToast = useCallback(() => setToast(null), []);

  const switchTool = useCallback((id) => {
    setActiveTool(id);
    setActiveSuite(null);
    setHashForTool(id);
    // Show Did You Know on IP tool switches
    const fact = DID_YOU_KNOW[toastIdx.current % DID_YOU_KNOW.length];
    toastIdx.current++;
    setToast(fact);
  }, []);

  const switchSuite = useCallback((id) => {
    setActiveSuite(prev => prev === id ? null : id);
  }, []);

  useEffect(() => { setHashForTool(activeTool); }, []);
  useEffect(() => {
    const handler = () => setActiveTool(getToolFromHash());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const k = e.key;
      if (k === '?') { setShowShortcuts(s => !s); return; }
      if (k === 'Escape') { setActiveSuite(null); setShowShortcuts(false); return; }
      if (k === 'l' || k === 'L') { switchSuite('learning'); return; }
      if (k === 'q' || k === 'Q') { switchSuite('quiz'); return; }
      if (k === 'c' || k === 'C') { switchSuite('canvas'); return; }
      if (k === 'm' || k === 'M') { switchSuite('concepts'); return; }
      if (k === 't' || k === 'T') { switchSuite('tracker'); return; }
      if (k === 'p' || k === 'P') { switchSuite('ostack'); return; }
      if (k >= '1' && k <= '7') { switchTool(TOOLS[parseInt(k)-1]?.id); return; }
      if (k === 'Tab') {
        e.preventDefault();
        const idx = TOOLS.findIndex(t => t.id === activeTool);
        const next = e.shiftKey ? (idx - 1 + TOOLS.length) % TOOLS.length : (idx + 1) % TOOLS.length;
        switchTool(TOOLS[next].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTool, switchTool, switchSuite]);

  const tool = TOOLS.find(t => t.id === activeTool);
  const suitePanel = SUITE_TOOLS.find(s => s.id === activeSuite);

  // Suite panel content renderer
  const renderSuitePanel = () => {
    switch(activeSuite) {
      case 'learning': return <LearningPaths onNavigateTool={switchTool} />;
      case 'quiz':     return <QuizMode />;
      case 'canvas':   return <NetworkCanvas />;
      case 'concepts': return <ConceptMap onNavigateTool={switchTool} />;
      case 'tracker':  return <SubnetTracker />;
      case 'ostack':   return <ProtocolStack />;
      case 'certhub':  return <CertPrepHub onNavigateTool={switchSuite} />;
      default:         return null;
    }
  };

  const ActiveComponent = tool?.component || IPv4Calculator;

  return (
    <>
      {toast && <DidYouKnowToast key={toast.f || toast} fact={toast} onClose={dismissToast} />}
      {showShortcuts && <ShortcutsBar onClose={() => setShowShortcuts(false)} />}

      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spinSlow { 100% { transform: rotate(360deg); } }
        
        /* Box Animations */
        .ns-glass,.ns-glass-cyan,.ns-glass-green,.ns-glass-purple,.ns-glass-blue,.ns-glass-amber { 
            position:relative !important; 
            overflow:hidden !important; 
            background: linear-gradient(180deg, #161b22 0%, #0d1117 100%) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(240,246,252,0.1) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }
        
        .ns-glass:hover,.ns-glass-cyan:hover,.ns-glass-green:hover,.ns-glass-purple:hover,.ns-glass-blue:hover,.ns-glass-amber:hover {
            transform: translateY(-4px) scale(1.01) !important;
            box-shadow: 0 12px 30px rgba(0,0,0,0.7) !important;
            border-color: rgba(240,246,252,0.2) !important;
            z-index: 10 !important;
        }
        
        /* Icon Bounce Animation */
        @keyframes bounceIcon {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
        }
        .group:hover .lucide { animation: bounceIcon 1s ease-in-out infinite; }
        
        /* Subtle top border accents */
        .ns-glass::before,.ns-glass-cyan::before,.ns-glass-green::before,.ns-glass-purple::before,.ns-glass-blue::before,.ns-glass-amber::before {
            content: '' !important;
            position: absolute !important;
            top: 0 !important; left: 0 !important; right: 0 !important; height: 2px !important;
            pointer-events: none !important;
            border-radius: inherit !important;
            transition: all 0.3s ease !important;
        }

        .ns-glass::before        { background: rgba(255,255,255,0.1) !important; }
        .ns-glass-cyan::before   { background: #06b6d4 !important; box-shadow: 0 0 12px #06b6d4 !important; }
        .ns-glass-green::before  { background: #10b981 !important; box-shadow: 0 0 12px #10b981 !important; }
        .ns-glass-purple::before { background: #a855f7 !important; box-shadow: 0 0 12px #a855f7 !important; }
        .ns-glass-blue::before   { background: #3b82f6 !important; box-shadow: 0 0 12px #3b82f6 !important; }
        .ns-glass-amber::before  { background: #f59e0b !important; box-shadow: 0 0 12px #f59e0b !important; }
        
        .ns-glass:hover::before, .ns-glass-cyan:hover::before, .ns-glass-green:hover::before, .ns-glass-purple:hover::before, .ns-glass-blue:hover::before, .ns-glass-amber:hover::before {
            opacity: 1 !important;
            filter: brightness(1.3) !important;
        }
        
        /* Enlarged High Contrast Texts */
        .ns-val { color:#ffffff !important; font-size:18px !important; font-weight:800 !important; font-variant-numeric:tabular-nums !important; letter-spacing: 0.02em !important; text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important; }
        .ns-label { color:#a3b3cc !important; font-size:11px !important; font-weight:800 !important; letter-spacing:0.08em !important; text-transform: uppercase !important; }
        .ns-muted { color:#8b949e !important; font-weight:500 !important; font-size:12px !important; }
        .ns-mono  { font-family:'JetBrains Mono','Fira Code',monospace !important; }
        .ns-glass p,.ns-glass-cyan p,.ns-glass-green p,.ns-glass-purple p,.ns-glass-blue p,.ns-glass-amber p { color:#e6edf3 !important; font-size:13px !important; line-height:1.6 !important; }
        
        /* Moving Background Grid Effect */
        .bg-grid-fx {
            position: fixed; inset: 0; z-index: 0; pointer-events: none;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            transform: perspective(600px) rotateX(60deg) translateY(-100px) translateZ(-200px);
            animation: gridMove 20s linear infinite;
        }
        .bg-glow-fx {
            position: fixed; inset: 0; z-index: 0; pointer-events: none;
            background: radial-gradient(circle at 15% 50%, rgba(6, 182, 212, 0.08), transparent 40%),
                        radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.08), transparent 40%);
            animation: pulseGlowFx 10s ease-in-out infinite alternate;
        }
        @keyframes gridMove {
            0% { transform: perspective(600px) rotateX(60deg) translateY(0) translateZ(-200px); }
            100% { transform: perspective(600px) rotateX(60deg) translateY(40px) translateZ(-200px); }
        }
        @keyframes pulseGlowFx {
            0% { opacity: 0.6; }
            100% { opacity: 1; filter: brightness(1.2); }
        }
        
        .topo-node { background:#161b22; border:1px solid rgba(240,246,252,0.1); border-top:2px solid #06b6d4; box-shadow:0 4px 12px rgba(0,0,0,0.5); border-radius:8px; padding:8px 12px; font-family:monospace; font-size:10px; color:#e6edf3; white-space:nowrap; position:relative; }
        .topo-ip-input { background:rgba(0,0,0,0.2); border:1px solid rgba(240,246,252,0.1); color:#3b82f6; font-family:monospace; font-size:10px; text-align:center; outline:none; width:100px; padding:2px; border-radius:4px; }
        .topo-ip-input:focus { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,0.2); }
        .ns-content { animation:fadeSlideUp 0.3s ease forwards; }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
        @media print { .ns-no-print{display:none !important;} .ns-print{background:white !important;color:black !important;} }
        
        /* THEME OVERRIDES */

        [data-theme="cyberpunk"] {
            background: #0f0f1b !important;
        }
        [data-theme="cyberpunk"] .ns-glass, [data-theme="cyberpunk"] .ns-glass-cyan, [data-theme="cyberpunk"] .ns-glass-green, [data-theme="cyberpunk"] .ns-glass-purple, [data-theme="cyberpunk"] .ns-glass-blue, [data-theme="cyberpunk"] .ns-glass-amber {
            background: rgba(20, 10, 30, 0.8) !important;
            border: 1px solid #ec4899 !important;
            box-shadow: 0 0 15px rgba(236, 72, 153, 0.2) !important;
            backdrop-filter: blur(10px);
        }
        [data-theme="cyberpunk"] .text-white { color: #fdf2f8 !important; text-shadow: 0 0 5px rgba(255,255,255,0.5) !important; }
        [data-theme="cyberpunk"] input { background: rgba(236, 72, 153, 0.1) !important; border-color: #ec4899 !important; }
        [data-theme="cyberpunk"] .bg-grid-fx {
            background-image: 
                linear-gradient(rgba(236, 72, 153, 0.2) 1px, transparent 1px),
                linear-gradient(90deg, rgba(236, 72, 153, 0.2) 1px, transparent 1px) !important;
            animation: gridMove 5s linear infinite !important;
            filter: drop-shadow(0 0 10px rgba(236, 72, 153, 0.8)) !important;
        }

      `}</style>

      <div className="flex flex-col h-full min-h-screen relative overflow-hidden transition-colors duration-500" style={{ background: theme === 'cyberpunk' ? '#0f0f1b' : '#0d1117' }} data-theme={theme}>
        {/* Background Effects */}
        <div className="bg-glow-fx" />
        <div className="bg-grid-fx" />

        {/* ── TOP HEADER ── */}
        <header className="ns-no-print shrink-0 px-8 pt-4 pb-0 relative z-10" style={{ background: 'linear-gradient(to bottom, #0d1117 80%, transparent)' }}>
          
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center relative shrink-0"
                style={{ background: '#161b22', border: '1px solid rgba(240,246,252,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                {/* Spinning scanning ring for the loading icon effect */}
                <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 opacity-90" style={{ animation: 'spinSlow 1.5s linear infinite' }} />
                <div className="absolute inset-2 rounded-full border-b-2 border-purple-500 opacity-50" style={{ animation: 'spinSlow 3s linear infinite reverse' }} />
                <Radar size={28} className="text-cyan-400" style={{ animation: 'bounceIcon 2s ease-in-out infinite' }} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black text-[#ffffff] tracking-tight drop-shadow-md">Network Suite</h1>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700 shadow-[0_0_10px_rgba(6,182,212,0.3)]">PRO</span>
                </div>
                <div className="text-[13px] font-mono font-bold text-[#a3b3cc]">
                  Professional Grade Interactive IP Tooling & Security
                </div>
              </div>
            </div>

            {/* Header controls */}
            <div className="flex items-center gap-3 ns-no-print relative z-10">
              {/* Theme Switcher */}
              <div className="flex items-center gap-1 bg-[#161b22] rounded-xl p-1.5 border border-white/5 mr-2">
                <button onClick={()=>setTheme('hacker')} className={`p-1.5 rounded-lg transition-all ${theme==='hacker'?'bg-emerald-500/20 text-emerald-400':'text-gray-500 hover:text-gray-300'}`} title="Hacker Theme"><Terminal size={14}/></button>
                <button onClick={()=>setTheme('cyberpunk')} className={`p-1.5 rounded-lg transition-all ${theme==='cyberpunk'?'bg-pink-500/20 text-pink-400':'text-gray-500 hover:text-gray-300'}`} title="Cyberpunk Theme"><Zap size={14}/></button>
              </div>
              <button onClick={() => setCertPrepMode(m => !m)}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-mono font-bold transition-all shadow-md"
                style={{ background: certPrepMode ? '#f59e0b' : '#161b22', border: `1px solid ${certPrepMode ? '#f59e0b' : 'rgba(240,246,252,0.1)'}`, color: certPrepMode ? '#000' : '#a3b3cc' }}>
                <span className="group-hover:scale-110 transition-transform">🎓</span> Cert Prep {certPrepMode ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => setShowShortcuts(s => !s)}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-mono font-bold transition-all hover:bg-[#21262d] shadow-md hover:-translate-y-0.5"
                style={{ background: '#161b22', border: '1px solid rgba(240,246,252,0.1)', color: '#a3b3cc' }}>
                <Keyboard size={16} className="group-hover:text-white transition-colors" /> ?
              </button>
              <div className="relative">
                <button onClick={() => setShowExport(e => !e)}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-mono font-bold transition-all hover:bg-[#21262d] shadow-md hover:-translate-y-0.5"
                  style={{ background: '#161b22', border: '1px solid rgba(240,246,252,0.1)', color: '#a3b3cc' }}>
                  <Download size={16} className="group-hover:text-white transition-colors" /> Export
                </button>
                {showExport && (
                  <div className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-50 min-w-[160px]"
                    style={{ background: '#161b22', border: '1px solid rgba(240,246,252,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                    {[{ icon: Printer, label: 'Print / Save PDF', action: handlePrint },
                      { icon: FileText, label: 'Save as TXT', action: () => handleSaveTxt(activeTool) }].map(e => (
                      <button key={e.label} onClick={() => { e.action(); setShowExport(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[12px] font-mono text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors">
                        <e.icon size={14} />{e.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-6 pb-6 relative z-10" style={{ borderBottom: '1px solid rgba(240,246,252,0.1)' }}>
              {/* ── IP TOOL TABS ── */}
              <div className="flex-1 overflow-hidden border-r-0 lg:border-r border-[rgba(240,246,252,0.1)] pr-0 lg:pr-6">
                <HorizontalTabs active={activeSuite ? null : activeTool} onChange={switchTool} />
              </div>

              {/* ── SUITE TOOLS ROW ── */}
              <div className="flex flex-wrap gap-4 pb-2 lg:pb-0">
                {SUITE_TOOLS.map(st => {
                  const isActive = activeSuite === st.id;
                  return (
                    <button key={st.id} onClick={() => switchSuite(st.id)}
                      className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 shrink-0 hover:-translate-y-1 hover:shadow-lg"
                      style={{
                        background: isActive ? st.color : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isActive ? st.color : 'rgba(240,246,252,0.1)'}`,
                        color: isActive ? '#fff' : '#a3b3cc',
                        boxShadow: isActive ? `0 6px 20px ${st.color}50` : 'none',
                      }}>
                      <st.icon size={16} className="group-hover:scale-110 transition-transform" />{st.short}
                    </button>
                  );
                })}
              </div>
          </div>

        </header>

        {/* ── CONTENT AREA ── */}
        <main className="flex-1 overflow-y-auto px-4 py-6 relative z-10" style={{ background: 'transparent' }}>
          
          {/* Breadcrumb */}
          <div className="ns-no-print flex items-center gap-2 px-6 py-2 text-[12px] font-mono text-[#a3b3cc] mb-4">
            <Radar size={14} className="text-[#a3b3cc]" />
            <span className="font-bold">NEXUS PRO</span>
            <ChevronRight size={12} />
            <span className="text-[#8b949e]">{activeSuite ? 'Suite Features' : 'Internet Protocol Tools'}</span>
            <ChevronRight size={12} />
            <span className="font-extrabold" style={{ color: suitePanel?.color || tool?.color }}>{suitePanel?.label || tool?.label}</span>
          </div>

          {/* Panel content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {activeSuite ? (
                <motion.div
                  key={activeSuite}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="ns-content"
                >
                  {renderSuitePanel()}
                </motion.div>
              ) : (
                <motion.div
                  key={activeTool}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="ns-content"
                >
                  <ActiveComponent />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}

export default function NetworkSuiteView() {
  return <SuiteProvider><NetworkSuiteInner /></SuiteProvider>;
}
