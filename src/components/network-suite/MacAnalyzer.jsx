import React, { useState } from 'react';
import { Network, Server, HardDrive, Info, ShieldAlert } from 'lucide-react';
import { Eui64Generator, MacRandomizer, OuiDatabaseSearch } from './MacExtras';

const COMMON_OUIS = {
  '00:00:0C': 'Cisco Systems, Inc',
  '00:01:42': 'Cisco Systems, Inc',
  '00:0A:95': 'Apple, Inc.',
  '00:1A:2B': 'Ayerst',
  '00:14:22': 'Dell Inc.',
  '00:1B:21': 'Intel Corporate',
  '00:50:56': 'VMware, Inc.',
  '08:00:27': 'PCS Systemtechnik (VirtualBox)',
  '52:54:00': 'Realtek (QEMU/KVM)',
  'B8:27:EB': 'Raspberry Pi Foundation',
  'DC:A6:32': 'Raspberry Pi Trading Ltd',
  'E4:5F:01': 'Google LLC',
};

function normalizeMac(mac) {
  const hexOnly = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (hexOnly.length !== 12) return null;
  return hexOnly.match(/.{1,2}/g).join(':');
}

export default function MacAnalyzer() {
  const [input, setInput] = useState('00:50:56:C0:00:08');
  const [error, setError] = useState('');

  const macStr = normalizeMac(input);

  const getMacData = () => {
    if (!macStr) return null;
    const parts = macStr.split(':');
    const ouiHex = parts.slice(0, 3).join(':');
    const nicHex = parts.slice(3, 6).join(':');
    
    const firstByteHex = parts[0];
    const firstByteInt = parseInt(firstByteHex, 16);
    const firstByteBin = firstByteInt.toString(2).padStart(8, '0');
    
    // In transmission order (LSB first for Ethernet), bit 0 is I/G, bit 1 is U/L.
    // However, in standard hex representation, the least significant bit of the first octet is the I/G bit.
    const isGroup = (firstByteInt & 1) === 1; 
    const isLocal = (firstByteInt & 2) === 2;

    const vendor = COMMON_OUIS[ouiHex] || 'Unknown Vendor (Lookup required)';

    return {
      oui: ouiHex,
      nic: nicHex,
      vendor,
      isGroup,
      isLocal,
      firstByteHex,
      firstByteBin,
      binString: parts.map(p => parseInt(p, 16).toString(2).padStart(8, '0')).join(' ')
    };
  };

  const data = getMacData();

  return (
    <div className="flex gap-0 min-h-screen bg-transparent">
      <div className="flex-1 min-w-0 p-6 pb-10 space-y-5">
        
        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden ns-glass-cyan">
          <div className="absolute right-4 top-4 text-[60px] opacity-[0.04] font-black select-none">MAC</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">L2 TOOL</span>
            <span className="text-[9px] font-mono text-gray-500">IEEE 802 · 48-bit EUI</span>
          </div>
          <h2 className="text-lg font-black text-white mb-0.5">MAC Address Analyzer</h2>
          <p className="text-[11px] font-mono text-gray-400 max-w-xl">
            Analyze 48-bit Media Access Control addresses. Identifies Organizationally Unique Identifiers (OUI), NIC specifics, and visualizes broadcast/multicast transmission bits.
          </p>
        </div>

        {/* Input Area */}
        <div className="rounded-2xl p-5 ns-glass flex flex-col gap-3 border border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black font-mono uppercase tracking-widest text-gray-400">Enter MAC Address</label>
            <MacRandomizer onGenerate={setInput} />
          </div>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="00:1A:2B:3C:4D:5E or 001a.2b3c.4d5e"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-cyan-500/50 transition-colors"
          />
          {!data && input.length > 0 && <span className="text-[10px] text-red-400 font-mono">Invalid MAC Address format (must be 48 bits / 12 hex chars)</span>}
        </div>

        {/* Visualizer */}
        {data && (
          <div className="space-y-4">
            
            <div className="flex gap-3">
              <div className="flex-1 rounded-2xl p-5 ns-glass-cyan border border-cyan-500/20 relative overflow-hidden">
                <div className="text-[10px] font-mono uppercase text-cyan-400 mb-1">OUI (Organizationally Unique Identifier)</div>
                <div className="text-2xl font-black font-mono text-white">{data.oui}</div>
                <div className="text-[11px] font-mono text-cyan-200 mt-2 flex items-center gap-2">
                  <Server size={12}/> {data.vendor}
                </div>
                <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-r from-transparent to-cyan-500/10 pointer-events-none" />
              </div>

              <div className="flex-1 rounded-2xl p-5 ns-glass border border-white/10">
                <div className="text-[10px] font-mono uppercase text-gray-400 mb-1">NIC (Network Interface Controller) Specific</div>
                <div className="text-2xl font-black font-mono text-gray-300">{data.nic}</div>
                <div className="text-[11px] font-mono text-gray-500 mt-2 flex items-center gap-2">
                  <HardDrive size={12}/> Device Assigned ID
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-5 ns-glass border border-white/10">
              <div className="text-[10px] font-black font-mono uppercase tracking-widest text-white mb-4">Transmission Bits Analysis</div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {data.firstByteBin.split('').map((bit, idx) => (
                    <div key={idx} className={`w-6 h-6 flex items-center justify-center font-mono font-black text-[10px] rounded ${idx === 7 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : idx === 6 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/5 text-gray-500'}`}>
                      {bit}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-gray-400">First Octet Binary ({data.firstByteHex} hex)</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-xl border ${data.isGroup ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-1 text-gray-400">Bit 0 (I/G Bit)</div>
                  <div className={`text-sm font-bold ${data.isGroup ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {data.isGroup ? 'Multicast / Broadcast' : 'Unicast'}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">If the least significant bit of the first octet is 1, the frame is multicast.</p>
                </div>

                <div className={`p-4 rounded-xl border ${data.isLocal ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-1 text-gray-400">Bit 1 (U/L Bit)</div>
                  <div className={`text-sm font-bold ${data.isLocal ? 'text-amber-400' : 'text-blue-400'}`}>
                    {data.isLocal ? 'Locally Administered' : 'Universally Administered'}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">If 1, MAC is locally assigned (e.g., hypervisor). If 0, globally unique (burned-in).</p>
                </div>
              </div>

            </div>
            
            <Eui64Generator macStr={macStr} />

          </div>
        )}

      </div>

      {/* Right Panel */}
      <div className="w-[340px] shrink-0 border-l border-white/5 p-4 space-y-4">
        <div className="rounded-xl p-4 ns-glass">
          <div className="text-[8px] font-black font-mono uppercase tracking-widest text-cyan-400 mb-3">Special MAC Addresses</div>
          <div className="space-y-2 text-[9px] font-mono">
            {[
              {mac: 'FF:FF:FF:FF:FF:FF', desc: 'Layer 2 Broadcast Address'},
              {mac: '01:00:5E:xx:xx:xx', desc: 'IPv4 Multicast Address'},
              {mac: '33:33:xx:xx:xx:xx', desc: 'IPv6 Multicast Address'},
              {mac: '01:80:C2:00:00:00', desc: 'Spanning Tree Protocol (STP)'},
              {mac: '00:00:00:00:00:00', desc: 'Null/Unknown MAC (often seen in ARP requests)'},
            ].map(m => (
              <div key={m.mac} className="p-2 rounded bg-black/20 border border-white/5">
                <div className="text-cyan-300 font-bold mb-0.5">{m.mac}</div>
                <div className="text-gray-500">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4 ns-glass">
           <div className="text-[8px] font-black font-mono uppercase tracking-widest text-amber-400 mb-2">Did You Know?</div>
           <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
             The terms <b>OUI</b> (Organizationally Unique Identifier) and <b>MAC</b> (Media Access Control) are managed by the IEEE. Because there are "only" 2^48 (~281 trillion) possible MAC addresses, vendors recycle them for devices that are unlikely to ever exist on the same LAN segment.
           </p>
        </div>

        <OuiDatabaseSearch />

      </div>
    </div>
  );
}
