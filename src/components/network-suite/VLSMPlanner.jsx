import React, { useState } from 'react';
import { useSuite, CertTag } from './SuiteContext';
import { Plus, Trash2, Play, Info, AlertTriangle, BookOpen, Download, Activity, CheckCircle, XCircle, Router, Wand2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { VisualTreeView, IpUtilizationHeatmap, TrunkConfigGenerator } from './VLSMExtras';

function parseNetwork(str) {
  const [ip, pre] = str.trim().split('/');
  const p = parseInt(pre, 10);
  if (isNaN(p) || p < 0 || p > 30) return null;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(x => isNaN(x) || x < 0 || x > 255)) return null;
  const ipInt = parts.reduce((a, b) => (a << 8) | b, 0) >>> 0;
  const maskInt = (0xffffffff << (32 - p)) >>> 0;
  const netInt = (ipInt & maskInt) >>> 0;
  const toOctets = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
  return { p, netInt, netStr: toOctets(netInt), totalHosts: Math.pow(2, 32 - p) - 2, toOctets };
}

function planVLSM(baseNetwork, requirements) {
  const base = parseNetwork(baseNetwork);
  if (!base) return { error: 'Invalid base network' };
  
  // Calculate hosts including growth projection before sorting
  const withGrowth = requirements.map(r => ({
    ...r,
    effectiveHosts: Math.ceil(r.hosts * (1 + (r.growth || 0) / 100))
  }));
  
  const sorted = [...withGrowth].filter(r => r.effectiveHosts > 0).sort((a, b) => b.effectiveHosts - a.effectiveHosts);
  const results = [];
  let cursor = base.netInt;
  const baseEnd = (base.netInt | (~((0xffffffff << (32 - base.p)) >>> 0))) >>> 0;
  for (const req of sorted) {
    let hostBits = Math.ceil(Math.log2(req.effectiveHosts + 2));
    if (hostBits < 1) hostBits = 1;
    const prefix = 32 - hostBits;
    if (prefix < base.p) return { error: `Subnet for "${req.name}" (/${prefix}) is larger than the base (/${base.p})` };
    const subnetSize = Math.pow(2, hostBits);
    const aligned = (Math.ceil(cursor / subnetSize) * subnetSize) >>> 0;
    const subnetEnd = (aligned + subnetSize - 1) >>> 0;
    if (subnetEnd > baseEnd) return { error: `Address space exhausted for "${req.name}"` };
    const toOctets = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
    const maskInt = (0xffffffff << hostBits) >>> 0;
    results.push({
      name: req.name, required: req.hosts, effectiveHosts: req.effectiveHosts, prefix, subnetSize,
      network: toOctets(aligned), broadcast: toOctets(subnetEnd),
      firstHost: toOctets(aligned + 1), lastHost: toOctets(subnetEnd - 1),
      usable: subnetSize - 2, mask: toOctets(maskInt),
      waste: subnetSize - 2 - req.effectiveHosts, aligned, vlan: req.vlan
    });
    cursor = subnetEnd + 1;
  }
  const used = cursor - base.netInt;
  const total = Math.pow(2, 32 - base.p);
  return { results, used, total, utilisation: ((used / total) * 100).toFixed(1) };
}

const COLORS = ['#06b6d4','#a855f7','#22c55e','#f97316','#eab308','#f43f5e','#3b82f6','#ec4899'];

// Topology: draw subnet blocks with devices
function VLSMTopology({ plan, baseNet }) {
  if (!plan || plan.error || !plan.results?.length) return null;
  return (
    <div className="rounded-2xl p-5 ns-glass-cyan mt-4">
      <div className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400 mb-4">
        Live VLSM Topology — {baseNet}
      </div>
      <div className="space-y-3">
        {/* Parent network bar */}
        <div className="flex items-center gap-3 mb-2">
          <div className="topo-node" style={{ borderColor:'rgba(255,255,255,0.15)', minWidth:120 }}>
            <span className="text-[8px] font-bold text-white">🌐 Core Router</span>
            <div className="text-[7px] text-gray-500 font-mono">{baseNet}</div>
          </div>
          <div style={{ flex:1, borderTop:'2px dashed rgba(255,255,255,0.15)' }} />
          <span className="text-[7px] font-mono text-gray-600">aggregated backbone</span>
        </div>
        {/* Each subnet row */}
        {plan.results.map((r, i) => (
          <div key={r.name} className="flex items-start gap-3">
            {/* Vertical trunk */}
            <div className="flex flex-col items-center" style={{ width: 16, paddingTop: 8 }}>
              <div style={{ width: 2, height: 16, background: `${COLORS[i%COLORS.length]}60` }} />
              <div style={{ width: 12, height: 2, background: `${COLORS[i%COLORS.length]}60` }} />
            </div>
            {/* Switch */}
            <div className="topo-node shrink-0" style={{ borderColor:`${COLORS[i%COLORS.length]}40`, minWidth:90 }}>
              <div className="text-[8px] font-bold" style={{ color: COLORS[i%COLORS.length] }}>🔀 {r.name}</div>
              <div className="text-[7px] text-cyan-400 font-mono">{r.network}/{r.prefix}</div>
              <div className="text-[6px] text-gray-600 font-mono">{r.mask}</div>
            </div>
            <div style={{ width:20, borderTop:`1.5px dashed ${COLORS[i%COLORS.length]}50`, marginTop:12, flexShrink:0 }} />
            {/* Host devices */}
            <div className="flex gap-2 flex-wrap">
              {[...Array(Math.min(3, r.required))].map((_,j) => (
                <div key={j} className="topo-node" style={{ borderColor:`${COLORS[i%COLORS.length]}25`, minWidth:78 }}>
                  <div className="text-[9px]">{j===0?'💻':j===1?'📱':'🖨️'}</div>
                  <div className="text-[7px] font-mono" style={{ color: COLORS[i%COLORS.length] }}>
                    {r.firstHost.split('.').slice(0,-1).join('.')}.{parseInt(r.firstHost.split('.').pop())+j}
                  </div>
                  <div className="text-[6px] text-gray-600">/{r.prefix}</div>
                </div>
              ))}
              {r.required > 3 && (
                <div className="topo-node text-gray-600" style={{ minWidth:70 }}>
                  <div className="text-[7px] text-center">+{r.required-3} hosts</div>
                  <div className="text-[6px] text-gray-700 text-center">{r.firstHost}→{r.lastHost}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-1.5">
        {plan.results.map((r,i) => (
          <div key={r.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: COLORS[i%COLORS.length] }} />
            <span className="text-[7px] font-mono" style={{ color: COLORS[i%COLORS.length] }}>{r.name}</span>
            <span className="text-[7px] font-mono text-gray-600 ml-auto">{r.network}/{r.prefix} · {r.usable} usable</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PingSimulator({ plan }) {
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('');
  const [result, setResult] = useState(null);

  if (!plan || !plan.results) return null;

  const ipToInt = (ipStr) => {
    const parts = ipStr.trim().split('.');
    if (parts.length !== 4) return null;
    let res = 0;
    for (let i=0; i<4; i++) {
      const p = parseInt(parts[i], 10);
      if (isNaN(p) || p<0 || p>255) return null;
      res = (res << 8) | p;
    }
    return res >>> 0;
  };

  const findSubnet = (ipInt) => {
    for (const r of plan.results) {
      const netInt = ipToInt(r.network);
      const bcastInt = ipToInt(r.broadcast);
      if (ipInt >= netInt && ipInt <= bcastInt) return r;
    }
    return null;
  };

  const simulate = () => {
    const sInt = ipToInt(src);
    const dInt = ipToInt(dst);
    if (sInt === null || dInt === null) {
      setResult({ type: 'error', msg: 'Invalid IP address format.' });
      return;
    }
    
    const srcSubnet = findSubnet(sInt);
    const dstSubnet = findSubnet(dInt);

    if (!srcSubnet) {
      setResult({ type: 'error', msg: `Source IP ${src} is not within any allocated subnet.` });
      return;
    }

    if (srcSubnet === dstSubnet) {
      setResult({ 
        type: 'success', 
        msg: `Direct connection (Layer 2). Both IPs are in ${srcSubnet.name} (${srcSubnet.network}/${srcSubnet.prefix}).` 
      });
    } else if (dstSubnet) {
      setResult({ 
        type: 'routed', 
        msg: `Routed connection (Layer 3). Packet will go to default gateway. Destination is in ${dstSubnet.name} (${dstSubnet.network}/${dstSubnet.prefix}).` 
      });
    } else {
      setResult({ 
        type: 'external', 
        msg: `Routed connection. Destination ${dst} is outside the local VLSM topology. Packet sent to default gateway.` 
      });
    }
  };

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4 border border-blue-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} className="text-blue-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-blue-400">Ping Simulator Sandbox</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="text-[8px] font-mono text-gray-400 block mb-1">Source IP</label>
          <input value={src} onChange={e=>setSrc(e.target.value)} placeholder="192.168.10.10"
            className="w-full rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
            style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)'}} />
        </div>
        <div className="flex-1">
          <label className="text-[8px] font-mono text-gray-400 block mb-1">Destination IP</label>
          <input value={dst} onChange={e=>setDst(e.target.value)} placeholder="192.168.10.200"
            className="w-full rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
            style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)'}} />
        </div>
        <button onClick={simulate} className="px-4 py-2 rounded-lg text-xs font-bold font-mono text-blue-300 transition-colors"
          style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)'}}>
          Ping
        </button>
      </div>
      
      {result && (
        <div className={`mt-4 p-3 rounded-xl flex gap-3 text-[10px] font-mono ${
          result.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
          result.type === 'routed' || result.type === 'external' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
          'bg-red-500/10 text-red-300 border border-red-500/20'
        }`}>
          {result.type === 'success' && <CheckCircle size={14} className="shrink-0 mt-0.5 text-green-400"/>}
          {(result.type === 'routed' || result.type === 'external') && <Router size={14} className="shrink-0 mt-0.5 text-amber-400"/>}
          {result.type === 'error' && <XCircle size={14} className="shrink-0 mt-0.5 text-red-400"/>}
          <div className="leading-relaxed">{result.msg}</div>
        </div>
      )}
    </div>
  );
}

function CollisionDetector() {
  const [input, setInput] = useState("10.0.0.0/24\n10.0.0.128/25\n192.168.1.0/24");
  const [results, setResults] = useState(null);

  const checkCollisions = () => {
    const lines = input.split('\n').map(l => l.trim()).filter(l => l);
    const parsed = lines.map(l => {
      const p = parseNetwork(l);
      if (!p) return { original: l, error: true };
      const startInt = p.netInt;
      const endInt = (p.netInt | (~((0xffffffff << (32 - p.p)) >>> 0))) >>> 0;
      return { original: l, startInt, endInt, p };
    });

    const valid = parsed.filter(p => !p.error).sort((a, b) => a.startInt - b.startInt);
    const collisions = [];

    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const A = valid[i];
        const B = valid[j];
        if (B.startInt <= A.endInt) {
           collisions.push({ net1: A.original, net2: B.original });
        }
      }
    }

    setResults({ parsed, collisions, validCount: valid.length });
  };

  return (
    <div className="rounded-2xl p-5 ns-glass mt-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={14} className="text-amber-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-amber-400">Subnet Collision Detector</span>
      </div>
      <p className="text-[10px] font-mono text-gray-400 mb-4">Paste multiple CIDR blocks (one per line) to check for overlapping IP space.</p>
      
      <textarea 
        value={input}
        onChange={e=>setInput(e.target.value)}
        className="w-full h-32 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none resize-none"
        style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(245,158,11,0.2)'}}
      />
      <button onClick={checkCollisions} className="w-full mt-3 py-2.5 rounded-lg text-xs font-black font-mono uppercase tracking-widest text-amber-400 transition-all hover:brightness-125"
        style={{background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)'}}>
        Detect Overlaps
      </button>

      {results && (
        <div className="mt-6 space-y-4">
           {results.collisions.length === 0 ? (
             <div className="rounded-xl p-4 flex gap-2 text-green-300 text-xs font-mono bg-green-500/10 border border-green-500/20">
               <CheckCircle size={14} className="shrink-0 mt-0.5"/>
               No collisions detected among {results.validCount} valid subnets. Safe to route!
             </div>
           ) : (
             <div className="rounded-xl p-4 flex flex-col gap-3 text-red-300 text-xs font-mono bg-red-500/10 border border-red-500/20">
               <div className="flex items-center gap-2 font-bold"><AlertTriangle size={14}/> {results.collisions.length} Overlapping Subnet Pairs Detected:</div>
               <div className="space-y-2">
                 {results.collisions.map((c, i) => (
                   <div key={i} className="bg-red-500/20 p-2 rounded flex justify-between items-center">
                     <span className="font-bold">{c.net1}</span>
                     <span className="text-gray-400 text-[10px]">overlaps with</span>
                     <span className="font-bold">{c.net2}</span>
                   </div>
                 ))}
               </div>
               <p className="text-[10px] text-red-400/80 mt-2">Overlapping subnets will cause routing blackholes or asymmetric routing loops.</p>
             </div>
           )}

           {results.parsed.some(p => p.error) && (
             <div className="text-[10px] font-mono text-amber-500 mt-2">
               Warning: Some lines could not be parsed as valid CIDR blocks.
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default function VLSMPlanner() {
  const { certPrepMode } = useSuite();
  const [baseNet, setBaseNet] = useState('192.168.10.0/24');
  const [reqs, setReqs] = useState([
    { id:1, name:'Engineering', hosts:60, vlan:10, growth:0 },
    { id:2, name:'Sales', hosts:30, vlan:20, growth:20 },
    { id:3, name:'HR', hosts:14, vlan:30, growth:0 },
    { id:4, name:'Management', hosts:6, vlan:40, growth:50 },
  ]);
  const [plan, setPlan] = useState(null);
  const [nextId, setNextId] = useState(5);
  const [showTheory, setShowTheory] = useState(false);
  const [activeTab, setActiveTab] = useState('planner'); // 'planner' or 'collision'

  const addReq = () => { setReqs(r => [...r, { id:nextId, name:`VLAN ${nextId*10}`, hosts:10, vlan:nextId*10, growth:0 }]); setNextId(n=>n+1); };
  const removeReq = (id) => setReqs(r => r.filter(x => x.id !== id));
  const updateReq = (id, field, val) => setReqs(r => r.map(x => x.id===id ? {...x,[field]:val} : x));
  const run = () => setPlan(planVLSM(baseNet, reqs));
  const optimizeWaste = () => {
    // Requirements are inherently sorted by the planVLSM function
    // But this button makes it explicit and runs the plan.
    // It also zeros out growth to show the most optimal dense packing.
    const optimized = reqs.map(r => ({...r, growth: 0}));
    setReqs(optimized);
    setPlan(planVLSM(baseNet, optimized));
  };

  const theory = [
    { q:'Why VLSM over fixed-length?', a:'Fixed subnets waste addresses. A /24 gives 254 hosts; if you only need 6, 248 are wasted. VLSM allocates exactly what each department needs, preserving address space.' },
    { q:'The greedy algorithm explained', a:'Sort subnets largest-first. Allocate the smallest prefix (= largest block) that covers required+2 (network+broadcast). Move cursor to next aligned boundary. Repeat.' },
    { q:'Natural boundary alignment', a:'Every subnet must start at an address divisible by its block size. A /26 (64 addresses) must start at .0, .64, .128, or .192. Misaligned subnets cause routing issues.' },
    { q:'2ⁿ host slots', a:'Host bits n = ⌈log₂(required+2)⌉. The +2 reserves network and broadcast. A /26 gives 2⁶=64 total, 62 usable. Always round up to the next power of 2.' },
    { q:'VLSM in practice (OSPF)', a:'OSPF area 0 summary addresses must cover all VLSM subnets. Use area range command. Each OSPF ABR advertises the aggregate, not individual subnets, reducing routing table size.' },
    { q:'Waste metric', a:'Waste = allocated – required. A department needing 50 hosts gets a /26 (62 usable). Waste = 12. Acceptable; a /25 would waste 76. VLSM minimises this systematically.' },
  ];

  const exportPDF = () => {
    if (!plan || !plan.results) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('VLSM Planner Cheat Sheet', 14, 22);
    doc.setFontSize(11);
    doc.text(`Base Network: ${baseNet}`, 14, 30);
    doc.text(`Utilisation: ${plan.utilisation}% (${plan.used} / ${plan.total} addresses used)`, 14, 36);
    
    const tableData = plan.results.map(r => [
      r.name, r.required, `/${r.prefix}`, r.network, r.firstHost, r.lastHost, r.broadcast, r.mask, r.usable
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Subnet', 'Required', 'Prefix', 'Network', 'First Host', 'Last Host', 'Broadcast', 'Mask', 'Usable']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [168, 85, 247] }
    });

    doc.save(`VLSM_Plan_${baseNet.replace('/', '_')}.pdf`);
  };

  return (
    <div className="flex gap-0 min-h-screen" style={{background:'transparent'}}>
      {/* LEFT */}
      <div className="flex-1 min-w-0 p-6 pb-10 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden ns-glass-purple">
          <div className="absolute right-4 top-4 text-[60px] opacity-[0.04] font-black select-none">VLSM</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full" style={{background:'rgba(168,85,247,0.15)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.3)'}}>ADVANCED</span>
            <span className="text-[9px] font-mono text-gray-600">RFC 1519 · Variable-Length Subnet Masking</span>
          </div>
          <h2 className="text-lg font-black text-white mb-0.5">VLSM Planner & Analyzer</h2>
          <p className="text-[11px] font-mono text-gray-400 max-w-xl">Variable Length Subnet Masking allocates address blocks of different sizes from one parent network — eliminating waste. Used by every modern enterprise, ISP, and cloud provider.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(55,65,81,0.3)' }}>
          {[
            { id: 'planner', label: 'VLSM Planner' },
            { id: 'collision', label: 'Collision Detector' }
          ].map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className="flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
              style={{
                background: activeTab === t.id ? 'rgba(168,85,247,0.2)' : 'transparent',
                color: activeTab === t.id ? '#c084fc' : '#6b7280',
                border: activeTab === t.id ? '1px solid rgba(168,85,247,0.35)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'collision' && <CollisionDetector />}

        {activeTab === 'planner' && (
          <>
            {/* Algorithm callout */}
            <div className="rounded-xl p-4 ns-glass-purple flex gap-3">
              <Info size={13} className="text-purple-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-gray-300 font-mono leading-relaxed">
                <span className="text-purple-400 font-bold">VLSM algorithm: </span>
                Sort subnets largest→smallest. Allocate smallest prefix first, aligning each to its natural 2ⁿ boundary. The planner uses <span className="text-cyan-400">2ⁿ host slots</span> where n = ⌈log₂(required+2)⌉.
              </div>
            </div>

        {/* Inputs */}
        <div className="rounded-2xl p-5 space-y-4 ns-glass-purple">
          <div>
            <label className="text-[9px] font-mono uppercase tracking-widest text-purple-400 block mb-1.5">Base Network (CIDR)</label>
            <input value={baseNet} onChange={e=>setBaseNet(e.target.value)} placeholder="192.168.10.0/24"
              className="w-full rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
              style={{background:'rgba(0,0,0,0.35)',border:'1px solid rgba(168,85,247,0.3)'}} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-mono uppercase tracking-widest text-purple-400">Subnet Requirements</label>
              <button onClick={addReq} className="flex items-center gap-1 text-[9px] font-mono font-bold px-2.5 py-1 rounded-full"
                style={{background:'rgba(168,85,247,0.15)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.3)'}}>
                <Plus size={10}/> Add Subnet
              </button>
            </div>
            <div className="space-y-2">
              {/* Table Header for inputs */}
              <div className="flex text-[8px] font-mono text-purple-400 uppercase tracking-widest px-2 mb-1">
                <div className="w-4 shrink-0"></div>
                <div className="flex-1 min-w-[80px]">Name</div>
                <div className="w-20">Hosts</div>
                <div className="w-16">Growth %</div>
                <div className="w-16">VLAN ID</div>
                <div className="w-6"></div>
              </div>

              {reqs.map((r, idx) => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{background:COLORS[idx%COLORS.length]}} />
                  <input value={r.name} onChange={e=>updateReq(r.id,'name',e.target.value)} placeholder="Name"
                    className="flex-1 min-w-[80px] rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
                    style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}} />
                  
                  <input type="number" min="1" max="65000" value={r.hosts} onChange={e=>updateReq(r.id,'hosts',parseInt(e.target.value)||1)}
                    className="w-20 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
                    style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}} />
                  
                  <input type="number" min="0" max="1000" value={r.growth} onChange={e=>updateReq(r.id,'growth',parseInt(e.target.value)||0)}
                    placeholder="%" title="Growth Projection %"
                    className="w-16 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
                    style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}} />

                  <input type="number" min="1" max="4094" value={r.vlan} onChange={e=>updateReq(r.id,'vlan',parseInt(e.target.value)||'')}
                    placeholder="VLAN" title="VLAN ID"
                    className="w-16 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
                    style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}} />

                  <button onClick={()=>removeReq(r.id)} className="text-gray-700 hover:text-red-400 transition-colors w-6"><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={run} className="flex-1 py-3 rounded-xl text-xs font-black font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-125"
              style={{background:'linear-gradient(135deg,rgba(168,85,247,0.25),rgba(59,130,246,0.25))',border:'1px solid rgba(168,85,247,0.4)',color:'#c084fc'}}>
              <Play size={12}/> Plan Subnets
            </button>
            <button onClick={optimizeWaste} className="px-4 py-3 rounded-xl text-xs font-black font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-125 group relative"
              style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',color:'#4ade80'}} title="Reset growth and pack densely">
              <Wand2 size={12} className="group-hover:rotate-12 transition-transform"/> Optimize
            </button>
          </div>
        </div>

        {/* Results */}
        {plan && !plan.error && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-400">Utilisation: <span className="text-purple-400 font-bold">{plan.utilisation}%</span> of {baseNet}</span>
                <span className="text-[10px] font-mono text-gray-500 ml-4">Used: <span className="text-green-400">{plan.used}</span> / {plan.total} addresses</span>
              </div>
              <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-colors"
                style={{background:'rgba(255,255,255,0.05)', color:'#fff', border:'1px solid rgba(255,255,255,0.1)'}}>
                <Download size={12}/> Export PDF
              </button>
            </div>
            
            <IpUtilizationHeatmap plan={plan} />

            <div className="overflow-x-auto rounded-2xl ns-glass mt-4">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr style={{background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(55,65,81,0.4)'}}>
                    {['Subnet','Req','Prefix','Network','First Host','Last Host','Broadcast','Mask','Usable','Waste'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] uppercase tracking-widest text-gray-500 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.results.map((r,i) => (
                    <tr key={r.name} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-2 font-bold" style={{color:COLORS[i%COLORS.length]}}>
                        {r.name} {r.vlan && <span className="text-[7px] text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded ml-1">VLAN {r.vlan}</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {r.required}
                        {r.effectiveHosts > r.required && <span className="text-green-400 text-[8px] ml-1">(+{r.effectiveHosts - r.required})</span>}
                      </td>
                      <td className="px-3 py-2 text-cyan-400 font-bold">/{r.prefix}</td>
                      <td className="px-3 py-2 text-blue-300">{r.network}</td>
                      <td className="px-3 py-2 text-green-400">{r.firstHost}</td>
                      <td className="px-3 py-2 text-green-400">{r.lastHost}</td>
                      <td className="px-3 py-2 text-red-400">{r.broadcast}</td>
                      <td className="px-3 py-2 text-orange-300">{r.mask}</td>
                      <td className="px-3 py-2 text-purple-400 font-bold">{r.usable}</td>
                      <td className="px-3 py-2" style={{color:r.waste>r.required?'#f97316':'#6b7280'}}>{r.waste}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <VisualTreeView plan={plan} baseNet={baseNet} />
            <PingSimulator plan={plan} />
            <VLSMTopology plan={plan} baseNet={baseNet} />
            <TrunkConfigGenerator plan={plan} />
          </div>
        )}

        {plan?.error && (
          <div className="rounded-xl p-4 flex gap-2 text-red-300 text-xs font-mono" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)'}}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5"/>{plan.error}
          </div>
        )}

        {/* Theory accordion */}
        <div className="rounded-2xl overflow-hidden ns-glass">
          <button onClick={()=>setShowTheory(t=>!t)} className="w-full flex items-center gap-2 px-5 py-3">
            <BookOpen size={12} className="text-purple-400"/>
            <span className="text-[9px] font-black font-mono uppercase tracking-widest text-purple-400">VLSM Theory Deep-Dive{certPrepMode && <CertTag obj="CCNA §22.4" />}{certPrepMode && <CertTag obj="Net+ N10-009 §2.3" />}</span>
            <span className="ml-auto text-gray-600 text-xs">{showTheory?'▲':'▼'}</span>
          </button>
          {showTheory && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/[0.05]">
              {theory.map(t => (
                <div key={t.q} className="rounded-lg p-3" style={{background:'rgba(0,0,0,0.2)'}}>
                  <div className="text-[9px] font-black text-purple-300 mb-1">{t.q}</div>
                  <div className="text-[9px] font-mono text-gray-400 leading-relaxed">{t.a}</div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* RIGHT knowledge panel */}
      <div className="w-[340px] shrink-0 border-l border-white/[0.04]" style={{background:'transparent'}}>
        <div className="p-4 space-y-4">

          <div className="rounded-xl p-4 ns-glass-purple">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-purple-400 mb-3">VLSM Quick Cheatsheet</div>
            <div className="space-y-1.5 text-[8px] font-mono">
              {[
                {hosts:'2',    prefix:'/30', block:4,   usable:2},
                {hosts:'6',    prefix:'/29', block:8,   usable:6},
                {hosts:'14',   prefix:'/28', block:16,  usable:14},
                {hosts:'30',   prefix:'/27', block:32,  usable:30},
                {hosts:'62',   prefix:'/26', block:64,  usable:62},
                {hosts:'126',  prefix:'/25', block:128, usable:126},
                {hosts:'254',  prefix:'/24', block:256, usable:254},
                {hosts:'510',  prefix:'/23', block:512, usable:510},
                {hosts:'1022', prefix:'/22', block:1024,usable:1022},
              ].map(r => (
                <div key={r.prefix} className="flex items-center gap-2 rounded px-2 py-1" style={{background:'rgba(0,0,0,0.2)'}}>
                  <span className="text-purple-400 font-bold w-10">{r.prefix}</span>
                  <span className="text-gray-500 flex-1">up to {r.hosts} hosts</span>
                  <span className="text-gray-600">{r.block} addrs</span>
                  <span className="text-green-400 w-14 text-right">{r.usable} usable</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="px-4 py-2.5" style={{background:'rgba(255,255,255,0.03)'}}>
              <span className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400">Real Enterprise Scenarios</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                {icon:'🏢', name:'Campus Network', desc:'HQ uses 10.0.0.0/8 parent. Each building gets /16. Each floor gets /24. Each VLAN gets /26 or /27 based on device count.', tags:['OSPF Areas','Hierarchical','Building blocks']},
                {icon:'🏭', name:'Factory OT Network', desc:'Control systems (PLCs) need isolation. Management VLAN /28 (14 devices), OT VLAN /25 (126 devices), Safety zone /30 (P2P to firewall).', tags:['Air-gap','DMZ','/30 P2P']},
                {icon:'📡', name:'ISP Edge PoPs', desc:'Each PoP gets a /24 from the ISP pool. WAN links between PoPs use /30. Loopbacks use /32. BGP peering uses separate /30 per session.', tags:['BGP','/32 loopback','iBGP mesh']},
                {icon:'☁️', name:'Cloud VPC Design', desc:'AWS VPC typically /16. Subnets /24 per AZ per tier (public/private/data). NAT Gateway in public subnet routes private traffic. VPN uses /30.', tags:['VPC','AZ isolation','NAT GW']},
              ].map(s => (
                <div key={s.name} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-[9px] font-bold text-white">{s.name}</span>
                  </div>
                  <p className="text-[8px] font-mono text-gray-500 leading-relaxed mb-1.5">{s.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map(t => (
                      <span key={t} className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(168,85,247,0.1)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.2)'}}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-amber-400 mb-3">Common Mistakes</div>
            <div className="space-y-2">
              {[
                {bad:'Not sorting subnets first', fix:'Always plan largest subnet first, or alignment gaps waste entire blocks'},
                {bad:'Forgetting +2 overhead', fix:'Network addr + broadcast = 2 reserved. A /28 gives 16-2=14 usable, not 16'},
                {bad:'Misaligned start address', fix:'A /25 (128 block) must start at .0 or .128, never .10 or .64'},
                {bad:'Overlapping ranges', fix:'VLSM planners must track cursor position — each subnet starts after the previous broadcast'},
              ].map(m => (
                <div key={m.bad} className="rounded-lg p-2.5" style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.1)'}}>
                  <div className="text-[8px] font-bold text-red-400 mb-0.5">✗ {m.bad}</div>
                  <div className="text-[8px] font-mono text-gray-500">{m.fix}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 ns-glass">
            <div className="text-[8px] font-black font-mono uppercase tracking-widest text-rose-400 mb-3">VLSM RFCs</div>
            <div className="space-y-1.5">
              {[
                {rfc:'RFC 1519', title:'CIDR: Address Assignment Strategy', year:1993},
                {rfc:'RFC 1812', title:'Router Requirements — VLSM support', year:1995},
                {rfc:'RFC 4632', title:'CIDR: The Internet Address Architecture', year:2006},
              ].map(r => (
                <div key={r.rfc} className="flex items-center gap-2">
                  <span className="text-[8px] font-black font-mono w-16 shrink-0" style={{color:'#fb7185'}}>{r.rfc}</span>
                  <span className="text-[8px] font-mono text-gray-500 flex-1">{r.title}</span>
                  <span className="text-[7px] font-mono text-gray-700">{r.year}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
