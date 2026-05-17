import React, { useState, useRef, useCallback } from 'react';
import { Monitor, Trash2, Plus } from 'lucide-react';
import { useSuite } from './SuiteContext';

const DEVICE_TYPES = [
  { type:'router',   icon:'📡', label:'Router',   color:'#10b981' },
  { type:'switch',   icon:'🔀', label:'Switch',   color:'#a855f7' },
  { type:'firewall', icon:'🛡️', label:'Firewall', color:'#ef4444' },
  { type:'server',   icon:'🖥️',  label:'Server',   color:'#3b82f6' },
  { type:'host',     icon:'💻', label:'Host',     color:'#06b6d4' },
  { type:'phone',    icon:'📱', label:'Phone',    color:'#f59e0b' },
  { type:'cloud',    icon:'🌐', label:'Internet', color:'#6b7280' },
  { type:'vlan',     icon:'🏷️', label:'VLAN',     color:'#f97316' },
];

let nodeCounter = 1;

export default function NetworkCanvas() {
  const { addToTracker } = useSuite();
  const [nodes, setNodes] = useState([
    { id:1, type:'router',  icon:'📡', label:'Router-1',  ip:'192.168.1.1', color:'#10b981', x:200, y:200 },
    { id:2, type:'switch',  icon:'🔀', label:'Switch-1',  ip:'192.168.1.2', color:'#a855f7', x:400, y:200 },
    { id:3, type:'host',    icon:'💻', label:'PC-1',      ip:'192.168.1.10',color:'#06b6d4', x:550, y:120 },
    { id:4, type:'host',    icon:'💻', label:'PC-2',      ip:'192.168.1.11',color:'#06b6d4', x:550, y:280 },
  ]);
  const [edges, setEdges] = useState([
    { id:1, from:1, to:2 }, { id:2, from:2, to:3 }, { id:3, from:2, to:4 },
  ]);
  const [connecting, setConnecting] = useState(null); // id of node being connected
  const [editId, setEditId] = useState(null);
  const canvasRef = useRef(null);
  const draggingNode = useRef(null);
  const dragOffset = useRef({ x:0, y:0 });

  const addDevice = (type) => {
    const dt = DEVICE_TYPES.find(d => d.type === type);
    nodeCounter++;
    setNodes(prev => [...prev, {
      id: Date.now(), type, icon: dt.icon, label: `${dt.label}-${nodeCounter}`,
      ip:'0.0.0.0', color: dt.color, x: 150 + Math.random() * 400, y: 150 + Math.random() * 250,
    }]);
  };

  const removeNode = (id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    if (editId === id) setEditId(null);
  };

  const removeEdge = (id) => setEdges(prev => prev.filter(e => e.id !== id));

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    if (connecting !== null) {
      if (connecting !== node.id) {
        const exists = edges.find(e => (e.from===connecting&&e.to===node.id)||(e.from===node.id&&e.to===connecting));
        if (!exists) setEdges(prev => [...prev, { id: Date.now(), from: connecting, to: node.id }]);
      }
      setConnecting(null);
      return;
    }
    draggingNode.current = node.id;
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y };
  };

  const handleCanvasMouseMove = useCallback((e) => {
    if (!draggingNode.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.current.x;
    const y = e.clientY - rect.top - dragOffset.current.y;
    setNodes(prev => prev.map(n => n.id === draggingNode.current ? { ...n, x: Math.max(60,Math.min(rect.width-60,x)), y: Math.max(40,Math.min(rect.height-40,y)) } : n));
  }, []);

  const handleCanvasMouseUp = () => { draggingNode.current = null; };

  const updateNode = (id, field, val) => setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: val } : n));

  const addSubnetFromIp = (ip) => {
    const parts = ip.split('.');
    if (parts.length === 4) {
      const net = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      addToTracker({ cidr: net, label: `From Canvas (${ip})`, source: 'Canvas' });
    }
  };

  const clearCanvas = () => { setNodes([]); setEdges([]); setConnecting(null); setEditId(null); };

  const exportAscii = () => {
    let lines = ['Network Canvas Export', '='.repeat(40)];
    nodes.forEach(n => lines.push(`[${n.icon} ${n.label}] IP: ${n.ip}`));
    lines.push('', 'Connections:');
    edges.forEach(e => {
      const a = nodes.find(n=>n.id===e.from), b = nodes.find(n=>n.id===e.to);
      if (a && b) lines.push(`  ${a.label} ──── ${b.label}`);
    });
    navigator.clipboard?.writeText(lines.join('\n'));
  };

  return (
    <div className="p-4 ns-content flex flex-col gap-3" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(16,185,129,0.25))', border: '1px solid rgba(59,130,246,0.3)' }}>
          <Monitor size={15} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-white font-black text-sm">Network Design Canvas</h2>
          <p className="text-[8px] font-mono text-gray-600">Drag devices · click a device then another to connect · click node to edit</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={exportAscii} className="px-2.5 py-1 rounded-lg text-[8px] font-mono" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#9ca3af' }}>📋 Copy ASCII</button>
          <button onClick={clearCanvas} className="px-2.5 py-1 rounded-lg text-[8px] font-mono text-red-400 hover:text-red-300" style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)' }}><Trash2 size={9} className="inline mr-1"/>Clear</button>
        </div>
      </div>

      {/* Device palette */}
      <div className="flex gap-1.5 flex-wrap">
        {DEVICE_TYPES.map(dt => (
          <button key={dt.type} onClick={() => addDevice(dt.type)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-mono font-bold transition-all hover:scale-105 active:scale-95"
            style={{ background: `${dt.color}12`, border: `1px solid ${dt.color}35`, color: dt.color }}>
            <span>{dt.icon}</span>{dt.label}
          </button>
        ))}
        {connecting !== null && (
          <div className="px-2.5 py-1.5 rounded-xl text-[9px] font-mono animate-pulse" style={{ background:'rgba(6,182,212,0.15)', border:'1px solid rgba(6,182,212,0.5)', color:'#67e8f9' }}>
            🔗 Click target node to connect... (or click here to cancel)
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Canvas */}
        <div ref={canvasRef} className="flex-1 rounded-2xl relative overflow-hidden"
          style={{ background:'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))', border:'1px solid rgba(255,255,255,0.10)', cursor: connecting ? 'crosshair' : 'default', minHeight: 440 }}
          onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp}
          onClick={() => { if (connecting) setConnecting(null); }}>
          
          {/* Grid dots */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity:0.12 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.5)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* SVG edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map(edge => {
              const a = nodes.find(n=>n.id===edge.from), b = nodes.find(n=>n.id===edge.to);
              if (!a || !b) return null;
              return (
                <g key={edge.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(6,182,212,0.35)" strokeWidth={1.5} strokeDasharray="6 4" />
                  <circle cx={(a.x+b.x)/2} cy={(a.y+b.y)/2} r={5} fill="rgba(6,182,212,0.12)" stroke="rgba(6,182,212,0.35)" strokeWidth={1}
                    style={{ cursor:'pointer', pointerEvents:'all' }} onClick={() => removeEdge(edge.id)} />
                </g>
              );
            })}
          </svg>

          {/* Device nodes */}
          {nodes.map(node => (
            <div key={node.id}
              style={{ position:'absolute', left: node.x, top: node.y, transform:'translate(-50%,-50%)', zIndex: editId===node.id ? 10 : 1 }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}>
              <div className="topo-node flex flex-col items-center gap-0.5 select-none"
                style={{ borderColor:`${node.color}50`, minWidth:90, cursor: connecting ? 'crosshair' : draggingNode.current === node.id ? 'grabbing' : 'grab',
                  boxShadow: connecting === node.id ? `0 0 0 2px ${node.color}` : editId===node.id ? `0 0 0 2px rgba(255,255,255,0.3)` : undefined }}>
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="text-[11px]">{node.icon}</span>
                  <div className="flex gap-0.5">
                    <button onClick={(e)=>{e.stopPropagation();setConnecting(node.id);}} className="text-[7px] px-1 rounded" style={{background:`${node.color}20`,color:node.color}} title="Connect">🔗</button>
                    <button onClick={(e)=>{e.stopPropagation();setEditId(editId===node.id?null:node.id);}} className="text-[7px] px-1 rounded" style={{background:'rgba(255,255,255,0.05)',color:'#9ca3af'}} title="Edit">✏️</button>
                    <button onClick={(e)=>{e.stopPropagation();removeNode(node.id);}} className="text-[7px] px-1 rounded" style={{background:'rgba(239,68,68,0.1)',color:'#f87171'}} title="Delete">✕</button>
                  </div>
                </div>
                {editId === node.id ? (
                  <>
                    <input value={node.label} onChange={e=>updateNode(node.id,'label',e.target.value)} onMouseDown={e=>e.stopPropagation()}
                      className="text-[7px] font-mono bg-transparent text-center w-full border-0 outline-none text-gray-200" />
                    <input value={node.ip} onChange={e=>updateNode(node.id,'ip',e.target.value)} onMouseDown={e=>e.stopPropagation()}
                      className="topo-ip-input" placeholder="x.x.x.x" />
                    <button onClick={(e)=>{e.stopPropagation();addSubnetFromIp(node.ip);}} className="text-[6px] font-mono mt-0.5 px-1.5 py-0.5 rounded-full" style={{background:'rgba(6,182,212,0.1)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.2)'}}>+ Track Subnet</button>
                  </>
                ) : (
                  <>
                    <span className="text-[7px] font-mono font-bold" style={{color:node.color}}>{node.label}</span>
                    <span className="text-[7px] font-mono text-cyan-400">{node.ip}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats sidebar */}
        <div className="w-44 shrink-0 flex flex-col gap-2">
          <div className="ns-glass rounded-xl p-3">
            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">Canvas Stats</div>
            {[['Devices', nodes.length],['Connections', edges.length],['Node Types', new Set(nodes.map(n=>n.type)).size]].map(([l,v])=>(
              <div key={l} className="flex justify-between mb-1">
                <span className="text-[8px] font-mono text-gray-500">{l}</span>
                <span className="text-[9px] font-mono font-bold text-white">{v}</span>
              </div>
            ))}
          </div>
          <div className="ns-glass rounded-xl p-3 flex-1">
            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">Devices</div>
            {nodes.map(n => (
              <div key={n.id} className="flex items-center gap-1.5 mb-1.5 cursor-pointer" onClick={() => setEditId(editId===n.id?null:n.id)}>
                <span className="text-[9px]">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[7px] font-mono font-bold truncate" style={{color:n.color}}>{n.label}</div>
                  <div className="text-[6px] font-mono text-gray-600">{n.ip}</div>
                </div>
              </div>
            ))}
            {nodes.length === 0 && <div className="text-[8px] text-gray-600 text-center mt-4">Add devices from the palette above</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
