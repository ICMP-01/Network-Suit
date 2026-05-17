import React, { useState, useMemo, useRef } from 'react';
import { Database, Trash2, AlertTriangle, Download, Filter, ArrowUpDown, Plus, Upload, CheckCircle, PieChart } from 'lucide-react';
import { useSuite } from './SuiteContext';

function ipToInt(ip) {
  const p = ip.trim().split('/')[0].split('.');
  if (p.length !== 4 || p.some(x => isNaN(+x))) return null;
  return p.reduce((a, b) => (a << 8) | (+b), 0) >>> 0;
}

function cidrToRange(cidr) {
  try {
    const [ip, prefStr] = cidr.split('/');
    const pref = parseInt(prefStr, 10);
    if (isNaN(pref) || pref < 0 || pref > 32) return null;
    const ipInt = ipToInt(ip);
    if (ipInt === null) return null;
    const mask = pref === 0 ? 0 : (0xffffffff << (32 - pref)) >>> 0;
    const net = (ipInt & mask) >>> 0;
    const bcast = (net | (~mask >>> 0)) >>> 0;
    const oct = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
    return { net, bcast, netStr: oct(net), bcastStr: oct(bcast), pref, hosts: pref >= 31 ? (pref===32?1:2) : Math.pow(2,32-pref)-2 };
  } catch { return null; }
}

function overlaps(a, b) {
  if (!a || !b) return false;
  return a.net <= b.bcast && b.net <= a.bcast;
}

export default function SubnetTracker() {
  const { trackerEntries, addToTracker, removeFromTracker, updateTrackerNote } = useSuite();
  const [inputCidr, setInputCidr] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [error, setError] = useState('');
  const [editNoteId, setEditNoteId] = useState(null);
  const [sortCol, setSortCol] = useState('cidr');
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef(null);

  const entries = useMemo(() => {
    let e = trackerEntries.map(e => ({ ...e, range: cidrToRange(e.cidr) }));
    if (filter) e = e.filter(x => x.label.toLowerCase().includes(filter.toLowerCase()) || x.cidr.includes(filter));
    e = [...e].sort((a, b) => {
      let av, bv;
      if (sortCol === 'hosts') { av = a.range?.hosts || 0; bv = b.range?.hosts || 0; }
      else if (sortCol === 'cidr') { av = a.range?.net || 0; bv = b.range?.net || 0; }
      else { av = (a[sortCol]||'').toString(); bv = (b[sortCol]||'').toString(); }
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return e;
  }, [trackerEntries, filter, sortCol, sortAsc]);

  const overlapMap = {};
  entries.forEach((a, i) => {
    entries.forEach((b, j) => {
      if (i !== j && overlaps(a.range, b.range)) {
        overlapMap[a.id] = true;
        overlapMap[b.id] = true;
      }
    });
  });

  // Stats
  const totalHosts = entries.reduce((s, e) => s + (e.range?.hosts || 0), 0);
  const overlapCount = Object.keys(overlapMap).length / 2;
  const prefixes = entries.map(e => e.range?.pref).filter(Boolean);
  const smallestPfx = prefixes.length ? Math.max(...prefixes) : null;
  const largestPfx = prefixes.length ? Math.min(...prefixes) : null;


  const handleAdd = () => {
    const cidr = inputCidr.trim();
    if (!cidr.includes('/')) { setError('Enter CIDR notation (e.g. 192.168.1.0/24)'); return; }
    const r = cidrToRange(cidr);
    if (!r) { setError('Invalid CIDR'); return; }
    addToTracker({ cidr, label: inputLabel || cidr, source: 'Manual', network: r.netStr, broadcast: r.bcastStr, hosts: r.hosts });
    setInputCidr(''); setInputLabel(''); setError('');
  };

  const handleBulkImport = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      const parts = line.split(/[,\t ]/);
      const cidr = parts.find(p => p.includes('/'));
      const label = parts.find(p => !p.includes('/')) || cidr;
      if (!cidr) return;
      const r = cidrToRange(cidr);
      if (r) addToTracker({ cidr, label: label || cidr, source: 'Bulk', network: r.netStr, broadcast: r.bcastStr, hosts: r.hosts });
    });
    setBulkText(''); setShowBulk(false);
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  };

  const exportCSV = () => {
    const header = 'Label,CIDR,Network,Broadcast,Hosts,Source,Notes';
    const rows = entries.map(e => `"${e.label}","${e.cidr}","${e.range?.netStr||''}","${e.range?.bcastStr||''}","${e.range?.hosts||''}","${e.source||''}","${e.notes||''}"`);
    const csv = [header, ...rows].join('\n');
    downloadFile(csv, 'subnet_tracker.csv', 'text/csv');
  };

  const exportJSON = () => {
    const json = JSON.stringify(trackerEntries, null, 2);
    downloadFile(json, 'subnet_tracker.json', 'application/json');
  };

  const downloadFile = (content, filename, type) => {
    const a = document.createElement('a');
    a.href = `data:${type};charset=utf-8,` + encodeURIComponent(content);
    a.download = filename; 
    a.click();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.cidr) addToTracker(item);
          });
        }
      } catch (err) {
        console.error('Invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Visual address space bar
  const allNets = entries.filter(e => e.range).map(e => e.range.net);
  const minNet = allNets.length ? Math.min(...allNets) : 0;
  const maxBcast = entries.filter(e => e.range).reduce((m, e) => Math.max(m, e.range?.bcast||0), 0);
  const total = maxBcast - minNet || 1;

  return (
    <div className="p-6 ns-content">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,rgba(6,182,212,0.25),rgba(59,130,246,0.25))', border:'1px solid rgba(6,182,212,0.3)' }}>
          <Database size={18} className="text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-white font-black text-base">Multi-Subnet Tracker</h2>
          <p className="text-[9px] font-mono text-gray-500">Global workspace · overlap detection · gap analysis</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowBulk(b => !b)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-mono" style={{background:'rgba(168,85,247,0.08)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.2)'}}><Plus size={9}/>Bulk Import</button>
          <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-mono hover:bg-white/5 transition-colors" style={{color:'#94a3b8',border:'1px solid rgba(255,255,255,0.1)'}}><Upload size={9}/>JSON</button>
          
          {entries.length > 0 && (
            <div className="flex bg-black/40 rounded-lg overflow-hidden border border-cyan-500/20">
               <button onClick={exportCSV} className="flex items-center gap-1 px-2.5 py-1 text-[8px] font-mono transition-colors hover:bg-cyan-500/20" style={{color:'#67e8f9', borderRight:'1px solid rgba(6,182,212,0.2)'}}><Download size={9}/>CSV</button>
               <button onClick={exportJSON} className="flex items-center gap-1 px-2.5 py-1 text-[8px] font-mono transition-colors hover:bg-cyan-500/20" style={{color:'#67e8f9'}}><Download size={9}/>JSON</button>
            </div>
          )}
        </div>
      </div>

      {/* Stats dashboard */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            {l:'Subnets',v:entries.length,c:'#06b6d4'},
            {l:'Total Hosts',v:totalHosts.toLocaleString(),c:'#10b981'},
            {l:'Overlaps',v:overlapCount||'None',c:overlapCount?'#ef4444':'#10b981'},
            {l:'Range',v:prefixes.length?`/${largestPfx}–/${smallestPfx}`:'—',c:'#a855f7'},
          ].map(({l,v,c}) => (
            <div key={l} className="rounded-xl p-3 text-center" style={{background:`${c}10`,border:`1px solid ${c}25`}}>
              <div className="text-[8px] font-mono text-gray-500 mb-0.5">{l}</div>
              <div className="text-[12px] font-black" style={{color:c}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk import */}
      {showBulk && (
        <div className="ns-glass-purple rounded-2xl p-4 mb-4">
          <div className="text-[8px] font-mono text-purple-400 uppercase tracking-widest mb-2">Bulk Import — one CIDR per line</div>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={4} placeholder={"10.0.0.0/24\n172.16.0.0/16\n192.168.1.0/28"}
            className="w-full rounded-xl px-3 py-2 text-[10px] font-mono text-purple-200 outline-none resize-none" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(168,85,247,0.3)'}} />
          <div className="flex gap-2 mt-2">
            <button onClick={handleBulkImport} className="px-4 py-1.5 rounded-xl text-[9px] font-bold font-mono" style={{background:'rgba(168,85,247,0.2)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.4)'}}>Import</button>
            <button onClick={() => setShowBulk(false)} className="px-4 py-1.5 rounded-xl text-[9px] font-mono text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Add form + filter */}
      <div className="ns-glass-cyan rounded-2xl p-4 mb-4">
        <div className="flex gap-2 flex-wrap mb-2">
          <input value={inputLabel} onChange={e=>setInputLabel(e.target.value)} placeholder="Label (optional)"
            className="flex-1 min-w-24 rounded-xl px-3 py-2 text-[11px] font-mono text-gray-200 outline-none" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(6,182,212,0.25)'}} />
          <input value={inputCidr} onChange={e=>{setInputCidr(e.target.value);setError('');}} placeholder="CIDR e.g. 10.0.0.0/24"
            onKeyDown={e=>e.key==='Enter'&&handleAdd()}
            className="flex-[2] min-w-36 rounded-xl px-3 py-2 text-[11px] font-mono text-cyan-300 outline-none" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(6,182,212,0.25)'}} />
          <button onClick={handleAdd} className="px-4 py-2 rounded-xl text-[10px] font-bold font-mono transition-all hover:scale-105 active:scale-95" style={{background:'rgba(6,182,212,0.2)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.4)'}}>+ Add</button>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={10} className="text-gray-600" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by label or CIDR…"
            className="flex-1 rounded-lg px-2 py-1 text-[10px] font-mono text-gray-300 outline-none" style={{background:'rgba(0,0,0,0.2)',border:'1px solid rgba(255,255,255,0.06)'}} />
          {filter && <button onClick={() => setFilter('')} className="text-gray-600 hover:text-gray-400 text-[8px] font-mono">✕ clear</button>}
        </div>
        {error && <p className="text-[8px] font-mono text-red-400 mt-2">{error}</p>}
      </div>

      {/* Overlap Resolver */}
      {Object.keys(overlapMap).length > 0 && (
        <div className="ns-glass rounded-2xl p-4 mb-4 border border-rose-500/30 bg-rose-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-rose-400" />
            <span className="text-[10px] font-black font-mono uppercase tracking-widest text-rose-400">Overlap Resolver</span>
          </div>
          <p className="text-[9px] font-mono text-gray-400 mb-3">The following subnets have overlapping address spaces. This will cause routing issues. Please delete or re-IP the conflicting entries.</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {entries.filter(e => overlapMap[e.id]).map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded bg-black/40 border border-rose-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white">{e.label}</span>
                  <span className="text-[9px] font-mono text-rose-300">{e.cidr}</span>
                </div>
                <button onClick={()=>removeFromTracker(e.id)} className="px-3 py-1 rounded bg-rose-500/20 text-rose-400 text-[8px] font-bold font-mono hover:bg-rose-500/40 transition-colors">Delete Entry</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Address space visualisation */}
      {entries.length > 1 && (
        <div className="ns-glass rounded-xl p-3 mb-4">
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">Address Space</div>
          <div className="flex h-5 rounded-full overflow-hidden gap-px" style={{background:'rgba(255,255,255,0.04)'}}>
            {entries.filter(e=>e.range).map((e, i) => {
              const w = ((e.range.bcast - e.range.net + 1) / total) * 100;
              return <div key={e.id} title={`${e.label}: ${e.cidr}`}
                style={{width:`${Math.max(w,0.5)}%`,background:overlapMap[e.id]?'#ef4444':`hsl(${i*47%360},70%,55%)`,opacity:0.8}} />;
            })}
          </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-[7px] font-mono text-gray-500"><PieChart size={10} className="text-emerald-400"/> Total Space: {total.toLocaleString()} IPs</div>
              <div className="flex items-center gap-1 text-[7px] font-mono text-gray-500"><div className="w-2 h-2 rounded-sm bg-blue-500/40"/> Allocated: {totalHosts.toLocaleString()} IPs ({Math.round((totalHosts/total)*100) || 0}%)</div>
              <div className="flex items-center gap-1 text-[7px] font-mono text-gray-600"><div className="w-2 h-2 rounded-sm bg-red-500"/> Overlap</div>
              {Object.keys(overlapMap).length > 0 && <div className="flex items-center gap-1 text-[7px] font-mono text-red-400"><AlertTriangle size={8}/> {Object.keys(overlapMap).length/2} overlapping pair(s) detected</div>}
            </div>
          </div>
        )}

      {/* Table */}
      {entries.length === 0 ? (
        <div className="ns-glass rounded-2xl p-8 text-center">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-[10px] font-mono text-gray-500">No subnets tracked yet.<br/>Add CIDRs above or use "Track Subnet" in any IP tool.</div>
        </div>
      ) : (
        <div className="ns-glass rounded-2xl overflow-hidden">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr style={{background:'rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                {[['label','Label'],['cidr','CIDR'],['network','Network'],['broadcast','Broadcast'],['hosts','Hosts'],['source','Source'],['notes','Notes'],['','']].map(([col,h]) => (
                  <th key={h} onClick={() => col && handleSort(col)}
                    className={`text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-widest text-[7px] ${col ? 'cursor-pointer hover:text-gray-300' : ''} transition-colors`}>
                    {h}{col && sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} style={{
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                  background: overlapMap[e.id] ? 'rgba(239,68,68,0.08)' : i%2===0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {overlapMap[e.id] && <AlertTriangle size={9} className="text-red-400 shrink-0"/>}
                      <span className="font-bold text-white truncate max-w-20">{e.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-cyan-400 font-bold">{e.cidr}</td>
                  <td className="px-3 py-2 text-gray-300">{e.range?.netStr || '—'}</td>
                  <td className="px-3 py-2 text-gray-300">{e.range?.bcastStr || '—'}</td>
                  <td className="px-3 py-2 text-emerald-400">{e.range?.hosts?.toLocaleString() || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{e.source || 'Manual'}</td>
                  <td className="px-3 py-2">
                    {editNoteId === e.id ? (
                      <input autoFocus defaultValue={e.notes} onBlur={ev=>{updateTrackerNote(e.id,ev.target.value);setEditNoteId(null);}}
                        className="bg-transparent border-b border-cyan-500/50 text-gray-300 outline-none w-24" />
                    ) : (
                      <span onClick={()=>setEditNoteId(e.id)} className="text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">{e.notes||<span className="opacity-40">+ note</span>}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={()=>removeFromTracker(e.id)} className="text-gray-700 hover:text-red-400 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
