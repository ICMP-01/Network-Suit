import React, { useState, useRef } from 'react';
import { Map } from 'lucide-react';

const NODES = [
  { id:'ipv4',      label:'IPv4',          x:220, y:280, color:'#10b981', toolId:'ipv4',     desc:'32-bit addressing, subnetting, CIDR notation. Foundation of modern networking.', rfcs:['RFC 791','RFC 1918','RFC 4632'] },
  { id:'ipv6',      label:'IPv6',          x:420, y:130, color:'#3b82f6', toolId:'ipv6',     desc:'128-bit addressing with simplified headers, no NAT, built-in security (IPsec).', rfcs:['RFC 8200','RFC 4291','RFC 4862'] },
  { id:'cidr',      label:'CIDR',          x:480, y:290, color:'#06b6d4', toolId:'cidr',     desc:'Classless Inter-Domain Routing. Replaced classful addressing in 1993.', rfcs:['RFC 1518','RFC 1519','RFC 4632'] },
  { id:'subnet',    label:'Subnetting',    x:280, y:400, color:'#10b981', toolId:'ipv4',     desc:'Dividing a network into smaller logical groups. Key enterprise skill.', rfcs:['RFC 950','RFC 1812'] },
  { id:'vlsm',      label:'VLSM',          x:120, y:430, color:'#a855f7', toolId:'vlsm',     desc:'Variable Length Subnet Masking — different prefix lengths per subnet.', rfcs:['RFC 1009','RFC 1817'] },
  { id:'supernet',  label:'Supernetting',  x:620, y:330, color:'#ec4899', toolId:'supernet', desc:'Route aggregation — combining multiple networks into one summary route.', rfcs:['RFC 1338','RFC 1518'] },
  { id:'classes',   label:'IP Classes',    x:90,  y:190, color:'#f97316', toolId:'classes',  desc:'Classful A/B/C/D/E system, predecessor to CIDR. Still tested on CCNA.', rfcs:['RFC 790','RFC 1700'] },
  { id:'bgp',       label:'BGP',           x:740, y:150, color:'#8b5cf6', toolId:null,       desc:'Border Gateway Protocol — the routing protocol of the internet. Uses CIDR prefixes.', rfcs:['RFC 4271','RFC 1997','RFC 4760'] },
  { id:'ospf',      label:'OSPF',          x:700, y:290, color:'#6366f1', toolId:null,       desc:'Open Shortest Path First — link-state IGP. Uses Dijkstra\'s algorithm.', rfcs:['RFC 2328','RFC 5340'] },
  { id:'rip',       label:'RIPv2',         x:660, y:430, color:'#f59e0b', toolId:null,       desc:'Routing Information Protocol v2 — first classless distance-vector protocol.', rfcs:['RFC 2453'] },
  { id:'nat',       label:'NAT',           x:420, y:490, color:'#ef4444', toolId:null,       desc:'Network Address Translation — maps private IPs to public. Extends IPv4 life.', rfcs:['RFC 1631','RFC 3022'] },
  { id:'vpn',       label:'VPN',           x:580, y:500, color:'#8b5cf6', toolId:null,       desc:'Virtual Private Network — encrypted tunnel over public internet using IP.', rfcs:['RFC 2764','RFC 4301'] },
  { id:'dhcp',      label:'DHCP',          x:180, y:520, color:'#06b6d4', toolId:null,       desc:'Dynamic Host Configuration Protocol — auto-assigns IP, mask, gateway, DNS.', rfcs:['RFC 2131','RFC 3315'] },
  { id:'dns',       label:'DNS',           x:400, y:560, color:'#10b981', toolId:null,       desc:'Domain Name System — resolves hostnames to IP addresses. UDP port 53.', rfcs:['RFC 1034','RFC 1035'] },
  { id:'arp',       label:'ARP',           x:300, y:240, color:'#f59e0b', toolId:null,       desc:'Address Resolution Protocol — maps Layer 3 IP to Layer 2 MAC addresses.', rfcs:['RFC 826','RFC 5227'] },
  { id:'tcp',       label:'TCP',           x:540, y:140, color:'#3b82f6', toolId:null,       desc:'Transmission Control Protocol — reliable, ordered delivery. Three-way handshake.', rfcs:['RFC 793','RFC 9293'] },
  { id:'udp',       label:'UDP',           x:660, y:90,  color:'#06b6d4', toolId:null,       desc:'User Datagram Protocol — fast, connectionless. Used by DNS, DHCP, streaming.', rfcs:['RFC 768'] },
  { id:'osi',       label:'OSI Model',     x:80,  y:350, color:'#94a3b8', toolId:null,       desc:'7-layer reference model: Physical, Data Link, Network, Transport, Session, Presentation, Application.', rfcs:['ISO 7498'] },
  { id:'mac',       label:'MAC Addr',      x:230, y:150, color:'#f97316', toolId:null,       desc:'48-bit hardware address. Layer 2 identifier, used in ARP and Ethernet frames.', rfcs:['IEEE 802.3'] },
  { id:'ethernet',  label:'Ethernet',      x:90,  y:290, color:'#64748b', toolId:null,       desc:'Layer 1/2 standard. 802.3. Carries IP packets in frames with MAC addresses.', rfcs:['IEEE 802.3'] },
];

const EDGES = [
  ['ipv4','cidr'],['ipv4','subnet'],['ipv4','classes'],['ipv4','arp'],['ipv4','nat'],['ipv4','dhcp'],
  ['ipv6','cidr'],['ipv6','tcp'],['ipv6','nat'],
  ['cidr','supernet'],['cidr','bgp'],['cidr','ospf'],
  ['subnet','vlsm'],['subnet','classes'],
  ['supernet','bgp'],['supernet','ospf'],
  ['ospf','rip'],['ospf','bgp'],
  ['nat','vpn'],['nat','dhcp'],
  ['dhcp','dns'],
  ['arp','mac'],['arp','ethernet'],
  ['mac','ethernet'],
  ['tcp','udp'],['tcp','dns'],['tcp','bgp'],
  ['osi','ethernet'],['osi','tcp'],['osi','arp'],
  ['vlsm','nat'],
];

export default function ConceptMap({ onNavigateTool }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const W = 860, H = 620;

  const handleWheel = (e) => {
    e.preventDefault();
    setScale(s => Math.max(0.5, Math.min(2, s - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect' && e.target.className?.baseVal?.includes('bg')) {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };
  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    setTranslate(t => ({ x: t.x + (e.clientX - lastPos.current.x), y: t.y + (e.clientY - lastPos.current.y) }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { dragging.current = false; };

  const sel = selectedNode ? NODES.find(n => n.id === selectedNode) : null;

  return (
    <div className="p-6 ns-content">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(168,85,247,0.25))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Map size={18} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-white font-black text-base">Concept Map</h2>
          <p className="text-[9px] font-mono text-gray-500">Click nodes to explore · scroll to zoom · drag to pan</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[['blue','Addressing'],['purple','Routing'],['green','Protocol'],['amber','Service']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1 text-[7px] font-mono text-gray-500">
              <div className="w-2 h-2 rounded-full" style={{ background: c === 'blue' ? '#3b82f6' : c === 'purple' ? '#8b5cf6' : c === 'green' ? '#10b981' : '#f59e0b' }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* SVG Canvas */}
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.10)', cursor: 'grab', height: 520 }}
          onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ userSelect: 'none' }}>
            <g transform={`translate(${translate.x},${translate.y}) scale(${scale})`}>
              {/* Edges */}
              {EDGES.map(([a, b]) => {
                const na = NODES.find(n => n.id === a);
                const nb = NODES.find(n => n.id === b);
                if (!na || !nb) return null;
                const isHl = selectedNode && (a === selectedNode || b === selectedNode);
                return (
                  <line key={`${a}-${b}`}
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke={isHl ? (NODES.find(n => n.id === selectedNode)?.color || '#06b6d4') : 'rgba(255,255,255,0.10)'}
                    strokeWidth={isHl ? 1.5 : 1}
                    strokeDasharray={isHl ? '0' : '4 4'}
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }} />
                );
              })}
              {/* Nodes */}
              {NODES.map(node => {
                const isSel = selectedNode === node.id;
                const isRel = selectedNode && EDGES.some(([a, b]) => (a === selectedNode && b === node.id) || (b === selectedNode && a === node.id));
                const w = Math.max(node.label.length * 7 + 24, 72);
                return (
                  <g key={node.id} transform={`translate(${node.x},${node.y})`}
                    style={{ cursor: 'pointer', opacity: selectedNode && !isSel && !isRel ? 0.35 : 1, transition: 'opacity 0.2s' }}
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}>
                    <rect x={-w/2} y={-14} width={w} height={28} rx={8}
                      fill={isSel ? node.color + '40' : 'rgba(8,12,28,0.85)'}
                      stroke={isSel ? node.color : isRel ? node.color + '80' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={isSel ? 2 : 1} />
                    <text x={0} y={1} textAnchor="middle" dominantBaseline="middle"
                      style={{ fill: isSel ? '#fff' : '#cbd5e1', fontSize: 9, fontWeight: isSel ? 800 : 600, fontFamily: 'monospace', pointerEvents: 'none' }}>
                      {node.label}
                    </text>
                    {isSel && <circle cx={w/2 - 4} cy={-14} r={4} fill={node.color} />}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Detail panel */}
        <div className="w-64 shrink-0">
          {sel ? (
            <div className="rounded-2xl p-4 h-full" style={{ background: `linear-gradient(135deg,${sel.color}20 0%,${sel.color}08 100%)`, border: `1px solid ${sel.color}45`, borderTop: `2px solid ${sel.color}` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: sel.color }} />
                <span className="font-black text-white text-sm">{sel.label}</span>
              </div>
              <p className="text-[9px] text-gray-300 leading-relaxed mb-3">{sel.desc}</p>
              <div className="mb-3">
                <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mb-1">RFCs / Standards</div>
                {sel.rfcs.map(r => (
                  <div key={r} className="text-[8px] font-mono px-2 py-0.5 rounded-full inline-block mr-1 mb-1" style={{ background: `${sel.color}15`, color: sel.color, border: `1px solid ${sel.color}30` }}>{r}</div>
                ))}
              </div>
              {/* Connected nodes */}
              <div className="mb-3">
                <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mb-1">Connected Concepts</div>
                {EDGES.filter(([a,b]) => a === sel.id || b === sel.id).map(([a,b]) => {
                  const otherId = a === sel.id ? b : a;
                  const other = NODES.find(n => n.id === otherId);
                  return <div key={otherId} onClick={() => setSelectedNode(otherId)} className="text-[8px] font-mono cursor-pointer hover:opacity-80 transition-opacity mb-0.5 flex items-center gap-1" style={{ color: other?.color }}>
                    <span>→</span>{other?.label}
                  </div>;
                })}
              </div>
              {sel.toolId && (
                <button onClick={() => onNavigateTool(sel.toolId)} className="w-full py-2 rounded-xl text-[9px] font-bold font-mono transition-all"
                  style={{ background: `${sel.color}20`, color: sel.color, border: `1px solid ${sel.color}40` }}>
                  Open Tool →
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-4 h-full flex flex-col items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-3xl mb-2">🗺️</div>
              <div className="text-[10px] font-mono text-gray-500 text-center">Click any node<br/>to see details and connections</div>
              <div className="mt-4 text-[8px] font-mono text-gray-700 text-center">{NODES.length} concepts · {EDGES.length} connections</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
