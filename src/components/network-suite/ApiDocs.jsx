import React, { useState } from 'react';
import { Terminal, Copy, CheckCircle, Code, Play } from 'lucide-react';

export default function ApiDocs() {
  const [copied, setCopied] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const testApi = async (endpoint) => {
    setTesting(true);
    setTestResult(null);
    try {
      let res;
      if (endpoint === 'subnet') {
        res = await fetch('http://localhost:5000/api/network-suite/subnet?ip=192.168.1.100&prefix=26');
      } else {
        res = await fetch('http://localhost:5000/api/network-suite/vlsm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            network: "10.0.0.0/16",
            subnets: [{ name: "Servers", size: 500 }, { name: "Clients", size: 100 }]
          })
        });
      }
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setTestResult(`Error: ${e.message}`);
    }
    setTesting(false);
  };

  const subnetCurl = `curl -X GET "http://localhost:5000/api/network-suite/subnet?ip=192.168.1.100&prefix=24" \\
  -H "Accept: application/json"`;

  const vlsmCurl = `curl -X POST "http://localhost:5000/api/network-suite/vlsm" \\
  -H "Content-Type: application/json" \\
  -d '{
    "network": "10.0.0.0/24",
    "subnets": [
      { "name": "VLAN 10", "size": 60 },
      { "name": "VLAN 20", "size": 30 }
    ]
  }'`;

  return (
    <div className="p-6 ns-content">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(5,150,105,0.25))', border: '1px solid rgba(16,185,129,0.3)' }}>
          <Code size={18} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-white font-black text-base">Network Suite API</h2>
          <p className="text-[9px] font-mono text-gray-500">Integrate real-time subnetting & VLSM into your own applications</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Subnet API */}
        <div className="ns-glass rounded-2xl p-5 border border-emerald-500/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black font-mono px-2 py-0.5 rounded">GET</span>
                <span className="text-white font-mono text-xs">/api/network-suite/subnet</span>
              </div>
              <p className="text-[10px] font-mono text-gray-400">Calculate network boundaries, masks, and host ranges from an IP/CIDR.</p>
            </div>
            <button onClick={() => testApi('subnet')} disabled={testing} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-all hover:bg-emerald-500/30">
              <Play size={12}/> {testing ? 'Testing...' : 'Live Test'}
            </button>
          </div>

          <div className="relative group">
            <div className="absolute right-2 top-2">
              <button onClick={() => copyCode(subnetCurl, 'subnet')} className="p-1.5 bg-white/10 rounded hover:bg-white/20 text-gray-400 transition-all">
                {copied === 'subnet' ? <CheckCircle size={14} className="text-green-400"/> : <Copy size={14}/>}
              </button>
            </div>
            <pre className="bg-black/50 p-4 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto border border-white/5">
              <code>{subnetCurl}</code>
            </pre>
          </div>
        </div>

        {/* VLSM API */}
        <div className="ns-glass rounded-2xl p-5 border border-emerald-500/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-green-500/20 text-green-400 text-[10px] font-black font-mono px-2 py-0.5 rounded">POST</span>
                <span className="text-white font-mono text-xs">/api/network-suite/vlsm</span>
              </div>
              <p className="text-[10px] font-mono text-gray-400">Auto-allocate variable length subnets optimally within a parent network.</p>
            </div>
            <button onClick={() => testApi('vlsm')} disabled={testing} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-all hover:bg-emerald-500/30">
              <Play size={12}/> {testing ? 'Testing...' : 'Live Test'}
            </button>
          </div>

          <div className="relative group">
            <div className="absolute right-2 top-2">
              <button onClick={() => copyCode(vlsmCurl, 'vlsm')} className="p-1.5 bg-white/10 rounded hover:bg-white/20 text-gray-400 transition-all">
                {copied === 'vlsm' ? <CheckCircle size={14} className="text-green-400"/> : <Copy size={14}/>}
              </button>
            </div>
            <pre className="bg-black/50 p-4 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto border border-white/5">
              <code>{vlsmCurl}</code>
            </pre>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="ns-glass-emerald rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
              <Terminal size={12}/> Live API Response
            </div>
            <pre className="bg-black/40 p-3 rounded-lg text-[10px] font-mono text-gray-300 overflow-x-auto border border-emerald-500/20 max-h-60 overflow-y-auto">
              <code>{testResult}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
