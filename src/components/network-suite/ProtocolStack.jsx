import React, { useState, useEffect } from 'react';
import { Layers, Activity, FastForward, Server, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PacketJourney from './PacketJourney';
import TCPHandshake from './TCPHandshake';
import TCPWindowSim from './TCPWindowSim';

const WELL_KNOWN_PORTS = {
  20:'FTP Data',21:'FTP Control',22:'SSH',23:'Telnet',25:'SMTP',
  53:'DNS',67:'DHCP Server',68:'DHCP Client',69:'TFTP',79:'Finger',
  80:'HTTP',88:'Kerberos',110:'POP3',111:'RPC',119:'NNTP',123:'NTP',
  135:'MS-RPC',137:'NetBIOS-NS',138:'NetBIOS-DGM',139:'NetBIOS-SSN',
  143:'IMAP',161:'SNMP v1/v2c',162:'SNMP Trap',179:'BGP',194:'IRC',
  389:'LDAP',443:'HTTPS',445:'SMB',465:'SMTPS',500:'IKEv1/IPsec',
  514:'Syslog UDP',515:'LPD/LPR Print',520:'RIPv1/v2',
  587:'SMTP Submission',631:'IPP Print',636:'LDAPS',993:'IMAPS',
  995:'POP3S',1080:'SOCKS Proxy',1194:'OpenVPN',1433:'MS-SQL',
  1521:'Oracle DB',1701:'L2TP',1723:'PPTP',2049:'NFS',2181:'ZooKeeper',
  3306:'MySQL',3389:'RDP',4444:'Metasploit',4789:'VXLAN',
  5000:'UPnP/Flask',5060:'SIP',5061:'SIPS',5432:'PostgreSQL',
  5900:'VNC',6379:'Redis',6514:'Syslog TLS',8080:'HTTP-Alt',
  8443:'HTTPS-Alt',8888:'Jupyter',9200:'Elasticsearch',9300:'Elastic Cluster',
  27017:'MongoDB',50000:'SAP',51820:'WireGuard',
};

const INSECURE_PORTS = new Set([20,21,23,25,53,67,68,69,79,80,110,111,
  119,123,135,137,138,139,143,161,162,194,389,514,515,520,1080,4444,5900]);
const SECURE_PORTS = new Set([22,443,465,587,636,993,995,1194,6514,51820]);

function SecurityBadge({ portNum, isTLS }) {
  if (!portNum) return null;
  if (INSECURE_PORTS.has(portNum)) return (
    <span style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.4)',color:'#f87171',fontSize:7,fontWeight:800,padding:'2px 7px',borderRadius:999,fontFamily:'monospace',display:'inline-flex',alignItems:'center',gap:3}}>
      ⚠️ INSECURE — Traffic in plaintext
    </span>
  );
  if (isTLS || SECURE_PORTS.has(portNum)) return (
    <span style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',color:'#34d399',fontSize:7,fontWeight:800,padding:'2px 7px',borderRadius:999,fontFamily:'monospace',display:'inline-flex',alignItems:'center',gap:3}}>
      🔒 ENCRYPTED
    </span>
  );
  return null;
}

function IPHeaderVisual({ ip }) {
  if (!ip || !ip.match(/^\d+\.\d+\.\d+\.\d+$/)) return null;
  const fields = [
    {name:'Ver',bits:4,val:'4',color:'#06b6d4'},{name:'IHL',bits:4,val:'5',color:'#3b82f6'},
    {name:'DSCP',bits:6,val:'0',color:'#8b5cf6'},{name:'ECN',bits:2,val:'0',color:'#a855f7'},
    {name:'Total Length',bits:16,val:'—',color:'#f59e0b'},
    {name:'ID',bits:16,val:'—',color:'#f97316'},{name:'Flags',bits:3,val:'DF',color:'#ef4444'},{name:'Fragment Offset',bits:13,val:'0',color:'#ec4899'},
    {name:'TTL',bits:8,val:'64',color:'#10b981'},{name:'Protocol',bits:8,val:'—',color:'#14b8a6'},
    {name:'Header Checksum',bits:16,val:'—',color:'#84cc16'},
    {name:'Source IP',bits:32,val:ip,color:'#22d3ee'},
    {name:'Destination IP',bits:32,val:'—',color:'#818cf8'},
  ];
  const total = 160;
  return (
    <div style={{marginTop:10}}>
      <div style={{fontSize:7,fontFamily:'monospace',color:'#6b7280',textTransform:'uppercase',letterSpacing:2,marginBottom:6}}>IPv4 Header — 20 bytes (160 bits)</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:1,fontFamily:'monospace'}}>
        {fields.map(f => (
          <div key={f.name} title={`${f.name}: ${f.bits} bits`}
            style={{width:`${(f.bits/total)*100}%`,minWidth:f.bits<=4?20:40,background:`${f.color}20`,border:`1px solid ${f.color}40`,borderRadius:3,padding:'2px 3px',textAlign:'center'}}>
            <div style={{fontSize:6,fontWeight:800,color:f.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
            <div style={{fontSize:6,color:'#9ca3af'}}>{f.bits}b</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function classifyIP(ip) {
  const first = parseInt(ip.split('.')[0], 10);
  if (ip === '127.0.0.1' || ip.startsWith('127.')) return { type:'Loopback', color:'#94a3b8', desc:'Loopback interface — traffic never leaves the host.' };
  if (first >= 1 && first <= 126) {
    if (first === 10) return { type:'Class A Private', color:'#10b981', desc:'RFC 1918 private range 10.0.0.0/8.' };
    return { type:'Class A Public', color:'#10b981', desc:'Class A: 1.0.0.0–126.255.255.255 (/8 default mask).' };
  }
  if (first >= 128 && first <= 191) {
    if (first===172 && parseInt(ip.split('.')[1],10)>=16 && parseInt(ip.split('.')[1],10)<=31) return {type:'Class B Private',color:'#3b82f6',desc:'RFC 1918 private range 172.16.0.0/12.'};
    return { type:'Class B Public', color:'#3b82f6', desc:'Class B: 128.0.0.0–191.255.255.255 (/16 default mask).' };
  }
  if (first >= 192 && first <= 223) {
    if (ip.startsWith('192.168.')) return {type:'Class C Private',color:'#a855f7',desc:'RFC 1918 private range 192.168.0.0/16.'};
    if (ip.startsWith('192.0.2.')||ip.startsWith('198.51.100.')||ip.startsWith('203.0.113.')) return {type:'Documentation (TEST-NET)',color:'#f59e0b',desc:'RFC 5737 reserved for documentation/examples.'};
    return { type:'Class C Public', color:'#a855f7', desc:'Class C: 192.0.0.0–223.255.255.255 (/24 default mask).' };
  }
  if (first >= 224 && first <= 239) return { type:'Multicast (Class D)', color:'#f97316', desc:'Multicast group addresses. OSPF=224.0.0.5, mDNS=224.0.0.251.' };
  return { type:'Reserved (Class E)', color:'#ef4444', desc:'RFC 1112 reserved for future/experimental use.' };
}

function ipToBinary(ip) {
  return ip.split('.').map(o => parseInt(o).toString(2).padStart(8,'0')).join(' . ');
}

const OSI_LAYERS = [
  { num:7, name:'Application',    color:'#10b981', icon:'📱', desc:'User-facing protocols and data' },
  { num:6, name:'Presentation',   color:'#3b82f6', icon:'🎨', desc:'Encoding, encryption, compression' },
  { num:5, name:'Session',        color:'#8b5cf6', icon:'🤝', desc:'Session establishment & management' },
  { num:4, name:'Transport',      color:'#a855f7', icon:'📦', desc:'End-to-end delivery & ports' },
  { num:3, name:'Network',        color:'#06b6d4', icon:'🌐', desc:'IP addressing & routing' },
  { num:2, name:'Data Link',      color:'#f59e0b', icon:'🔗', desc:'MAC addressing & framing' },
  { num:1, name:'Physical',       color:'#ef4444', icon:'⚡', desc:'Bits over physical medium' },
];

export default function ProtocolStack() {
  const [activeTab, setActiveTab] = useState('stack'); // 'stack', 'journey', 'handshake', 'window'
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);

  const portNum = parseInt(port, 10);
  const service = WELL_KNOWN_PORTS[portNum] || (port ? `Unknown (port ${portNum})` : null);
  const isTCP = portNum && [20,21,22,23,25,80,110,143,179,389,443,445,587,636,993,995,1433,1521,3306,3389,5432,5900,8080,8443].includes(portNum);
  const isUDP = portNum && [53,67,68,161,500,514,1194].includes(portNum);
  const proto = port ? (isTCP ? 'TCP' : isUDP ? 'UDP' : 'TCP/UDP') : null;
  const isTLS = [443,8443,993,995,636].includes(portNum);
  const ipClass = ip.match(/^\d+\.\d+\.\d+\.\d+$/) ? classifyIP(ip) : null;

  const getLayerDetails = (num) => {
    const octets = ip.split('.').map(Number);
    switch(num) {
      case 1: return {
        fields:[
          {k:'Medium',v:'Ethernet (IEEE 802.3) / Wi-Fi (802.11)'},
          {k:'Signal',v:'Electrical pulses (copper) or photons (fiber)'},
          {k:'Speed',v:'1 Gbps / 10 Gbps / 100 Gbps common'},
          {k:'Encoding',v:'Manchester / NRZ-L / PAM4'},
        ],
        note:'Layer 1 is unaware of IP addresses — it only moves bits.'
      };
      case 2: return {
        fields:[
          {k:'Frame type',v:'Ethernet II (EtherType 0x0800 = IPv4)'},
          {k:'Dst MAC',v:'Resolved via ARP for '+ip},
          {k:'Src MAC',v:'Sender NIC hardware address (48-bit)'},
          {k:'EtherType',v:'0x0800 (IPv4) / 0x86DD (IPv6)'},
          {k:'FCS',v:'4-byte CRC-32 frame check'},
        ],
        note:`ARP request: "Who has ${ip}? Tell me." → ARP reply fills the MAC table.`
      };
      case 3: return {
        fields:[
          {k:'IP Version',v:'IPv4'},
          {k:'IP Address',v:ip||'—'},
          {k:'Class / Type',v:ipClass?.type||'—'},
          {k:'Binary',v:ip?ipToBinary(ip):'—'},
          {k:'TTL',v:'64 (Linux) / 128 (Windows) — decremented at each hop'},
          {k:'Protocol',v:proto||'(specify port to detect)'},
          {k:'Header length',v:'20 bytes (no options)'},
          {k:'Checksum',v:'16-bit one\'s complement of header'},
        ],
        note:'Routing decision: Check routing table → longest prefix match → forward or drop.'
      };
      case 4: return {
        fields:[
          {k:'Protocol',v:proto||(port?'Unknown':'Not specified')},
          {k:'Port',v:port||'—'},
          {k:'Service',v:service||'—'},
          {k:'Connection',v:isTCP?'3-way handshake (SYN→SYN-ACK→ACK)':isUDP?'Connectionless — no handshake':'—'},
          {k:'Reliability',v:isTCP?'Guaranteed delivery, ordering, flow control':'Best-effort (UDP)'},
          {k:'Header size',v:isTCP?'20 bytes min':'8 bytes'},
        ],
        note:isTCP?'TCP state machine: CLOSED→SYN_SENT→ESTABLISHED→FIN_WAIT→TIME_WAIT→CLOSED':'UDP drops packets silently — app must handle retransmission.'
      };
      case 5: return {
        fields:[
          {k:'Session type',v:isTCP?'Full-duplex TCP session':'N/A (UDP is connectionless)'},
          {k:'Session ID',v:isTLS?'TLS Session ID + session tickets':'N/A'},
          {k:'Multiplexing',v:'Sockets: '+ip+':'+(port||'?')+' ↔ server:'+portNum},
          {k:'Teardown',v:isTCP?'FIN→FIN-ACK→FIN→FIN-ACK (4-way)':'Instant'},
        ],
        note:'The OS manages sessions via socket file descriptors and connection state tables.'
      };
      case 6: return {
        fields:[
          {k:'Encoding',v:isTLS?'TLS 1.3 (AEAD cipher)':'None (plaintext)'},
          {k:'Encryption',v:isTLS?'AES-256-GCM / ChaCha20-Poly1305':'None — traffic visible on wire'},
          {k:'Compression',v:'Typically disabled in TLS 1.3 (CRIME attack)'},
          {k:'Serialisation',v:'JSON / XML / Protocol Buffers / MessagePack'},
        ],
        note:isTLS?`Port ${portNum} (${service}) uses TLS — traffic is encrypted after handshake.`:'No encryption. Consider using TLS variant.'
      };
      case 7: return {
        fields:[
          {k:'Application',v:service||(port?'Custom application':'Not specified')},
          {k:'Protocol',v:portNum===80?'HTTP/1.1 or HTTP/2':portNum===443?'HTTPS (HTTP over TLS)':portNum===22?'SSH-2':portNum===25||portNum===587?'SMTP':portNum===53?'DNS':portNum===3306?'MySQL Wire Protocol':service||'—'},
          {k:'Data format',v:portNum===80||portNum===443?'HTML/JSON/binary':'Binary / text'},
          {k:'Port well-known',v:portNum<=1023?'Yes (IANA reserved < 1024)':portNum<=49151?'Registered port':'Ephemeral/dynamic'},
        ],
        note:portNum===443?'HTTPS: Client Hello → Server Certificate → Key Exchange → Application Data (encrypted).':portNum===53?'DNS: query (UDP/TCP 53) → recursive resolver → authoritative → A/AAAA record.':portNum===22?'SSH: TCP handshake → key exchange (ECDH) → channel open → shell/SFTP.':'Application layer protocol governs message format and session management.'
      };
      default: return { fields:[], note:'' };
    }
  };

  return (
    <div className="p-6 ns-content">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background:'linear-gradient(135deg,rgba(168,85,247,0.25),rgba(6,182,212,0.25))',border:'1px solid rgba(168,85,247,0.3)'}}>
          <Layers size={18} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-white font-black text-base">Protocol Stack Viewer</h2>
          <p className="text-[9px] font-mono text-gray-500">OSI / TCP-IP context for any IP address + port</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(55,65,81,0.3)' }}>
        {[
          { id: 'stack', label: 'Stack Analyzer' },
          { id: 'journey', label: 'Packet Journey' },
          { id: 'handshake', label: 'TCP Handshake' },
          { id: 'window', label: 'TCP Window' }
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

      {activeTab === 'stack' && (
        <>
          {/* Input */}
          <div className="ns-glass-purple rounded-2xl p-4 mb-5 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-32">
          <label className="text-[7px] font-mono text-gray-500 uppercase tracking-widest block mb-1">IPv4 Address</label>
          <input value={ip} onChange={e=>{setIp(e.target.value);setAnalyzed(false);}} placeholder="e.g. 192.168.1.100"
            className="w-full rounded-xl px-3 py-2 text-[11px] font-mono text-purple-200 outline-none" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(168,85,247,0.3)'}} />
        </div>
        <div className="w-28">
          <label className="text-[7px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Port (optional)</label>
          <input value={port} onChange={e=>{setPort(e.target.value);setAnalyzed(false);}} placeholder="e.g. 443" type="number"
            className="w-full rounded-xl px-3 py-2 text-[11px] font-mono text-purple-200 outline-none" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(168,85,247,0.3)'}} />
        </div>
        <div className="flex items-end">
          <button onClick={()=>setAnalyzed(true)} className="px-5 py-2 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95"
            style={{background:'rgba(168,85,247,0.2)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.45)'}}>
            Analyze Stack
          </button>
        </div>
      </div>

      {/* Security warning */}
      {analyzed && portNum && INSECURE_PORTS.has(portNum) && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)'}}>
          <span className="text-lg shrink-0">⚠️</span>
          <div>
            <div className="text-[9px] font-black text-red-400 mb-0.5">INSECURE PROTOCOL DETECTED</div>
            <div className="text-[8px] font-mono text-red-300">Port {portNum} ({service}) transmits data in <strong>plaintext</strong>. Use encrypted alternative:
              {portNum===21?' SFTP (22) or FTPS (990)':portNum===23?' SSH (22)':portNum===80?' HTTPS (443)':portNum===110?' POP3S (995)':portNum===143?' IMAPS (993)':portNum===25?' SMTP with TLS (587)':portNum===161?' SNMPv3 with AuthPriv':' encrypted variant'}
            </div>
          </div>
        </div>
      )}

      {/* Quick info bar */}
      {analyzed && ipClass && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            {label:'IP Type', val:ipClass.type, color:ipClass.color},
            {label:'Layer 4', val:proto||'Unknown', color:'#a855f7'},
            {label:'Service', val:service||'Unknown', color:'#06b6d4'},
            {label:'Security', val:isTLS?'Encrypted 🔒':INSECURE_PORTS.has(portNum)?'Insecure ⚠️':'Unknown', color:isTLS?'#10b981':INSECURE_PORTS.has(portNum)?'#ef4444':'#6b7280'},
          ].map(({label,val,color}) => (
            <div key={label} className="flex-1 min-w-28 rounded-xl p-2 text-center" style={{background:`${color}12`,border:`1px solid ${color}30`}}>
              <div className="text-[8px] font-mono text-gray-500 mb-0.5">{label}</div>
              <div className="text-[10px] font-bold" style={{color}}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* OSI Stack */}
      <div className="flex flex-col gap-2">
        {[...OSI_LAYERS].map(layer => {
          const isExp = expanded === layer.num;
          const details = analyzed ? getLayerDetails(layer.num) : null;
          return (
            <div key={layer.num} className="rounded-xl overflow-hidden transition-all duration-300"
              style={{background:`linear-gradient(135deg,${layer.color}18 0%,${layer.color}08 100%)`,border:`1px solid ${layer.color}35`,borderLeft:`3px solid ${layer.color}`}}>
              <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer" onClick={()=>setExpanded(isExp?null:layer.num)}>
                <span className="text-[10px] font-black font-mono w-5 text-center" style={{color:layer.color}}>L{layer.num}</span>
                <span className="text-[12px]">{layer.icon}</span>
                <span className="font-bold text-[11px] text-white flex-1">{layer.name}</span>
                <span className="text-[8px] font-mono text-gray-500">{layer.desc}</span>
                {analyzed && <span className="text-[8px] font-mono text-gray-700 ml-2">{isExp?'▲':'▼'}</span>}
              </div>
              {isExp && details && (
                <div className="px-4 pb-3 border-t" style={{borderColor:`${layer.color}20`}}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    {details.fields.map(({k,v}) => (
                      <div key={k}>
                        <span className="text-[7px] font-mono text-gray-600 uppercase tracking-wide">{k}: </span>
                        <span className="text-[8px] font-mono font-bold text-gray-200">{v}</span>
                      </div>
                    ))}
                  </div>
                  {details.note && <div className="mt-2 text-[8px] font-mono text-gray-400 leading-relaxed p-2 rounded-lg" style={{background:'rgba(0,0,0,0.2)'}}>💡 {details.note}</div>}
                  {layer.num === 3 && analyzed && ip && <IPHeaderVisual ip={ip} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {analyzed && ip && (
        <div className="mt-4 ns-glass rounded-xl p-3">
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">What happens when you connect to {ip}{port?`:${port}`:''}?</div>
          <div className="text-[8px] font-mono text-gray-300 leading-relaxed">
            {`1. ARP resolves ${ip} to a MAC address on the local segment (or router MAC for remote hosts). `}
            {isTCP?`2. TCP 3-way handshake: your SYN → server SYN-ACK → your ACK establishes the connection. `:'2. UDP sends datagrams immediately without handshake. '}
            {isTLS?`3. TLS handshake: cipher negotiation, certificate verification, key exchange. 4. Encrypted application data flows. `:proto?`3. ${service||'Application'} protocol data exchanged in plaintext. `:''}
            {`Router decrements TTL at each hop — packet dies if TTL reaches 0 (ICMP Time Exceeded returned).`}
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'journey'   && <PacketJourney />}
      {activeTab === 'handshake' && <TCPHandshake />}
      {activeTab === 'window'    && <TCPWindowSim />}

    </div>
  );
}

// Simulators are now in PacketJourney.jsx, TCPHandshake.jsx, TCPWindowSim.jsx
