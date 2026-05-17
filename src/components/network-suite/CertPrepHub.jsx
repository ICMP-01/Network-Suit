import React, { useState } from 'react';
import { Flag, CheckCircle, Circle, ChevronDown, ChevronUp, Trophy, BookOpen, Zap } from 'lucide-react';
import { useSuite } from './SuiteContext';

const CCNA_DOMAINS = [
  {
    id:'ccna1', label:'Network Fundamentals', weight:20, color:'#10b981',
    objectives:[
      {id:'1.1',text:'Explain the role and function of network components'},
      {id:'1.2',text:'Describe characteristics of network topology architectures'},
      {id:'1.3',text:'Compare physical interface and cabling types'},
      {id:'1.4',text:'Identify interface and cable issues'},
      {id:'1.5',text:'Compare TCP and UDP transport protocols'},
      {id:'1.6',text:'Configure and verify IPv4 addressing and subnetting'},
      {id:'1.7',text:'Describe the need for private IPv4 addressing (RFC 1918)'},
      {id:'1.8',text:'Configure and verify IPv6 addressing and prefix'},
      {id:'1.9',text:'Describe IPv6 address types (GUA, LLA, ULA, multicast)'},
      {id:'1.10',text:'Verify IP parameters for Client OS (Windows, Mac, Linux)'},
      {id:'1.11',text:'Describe wireless principles'},
      {id:'1.12',text:'Explain virtualization fundamentals (server, client, NFV, SD)'},
    ],
    tip:'Start here. IPv4/IPv6 subnetting is the #1 scored topic — expect 8–12 subnetting questions on the exam.',
  },
  {
    id:'ccna2', label:'Network Access', weight:20, color:'#3b82f6',
    objectives:[
      {id:'2.1',text:'Configure and verify VLANs spanning multiple switches'},
      {id:'2.2',text:'Configure and verify interswitch connectivity (trunk)'},
      {id:'2.3',text:'Configure and verify Layer 2 discovery protocols (CDP, LLDP)'},
      {id:'2.4',text:'Configure and verify EtherChannel (LACP)'},
      {id:'2.5',text:'Interpret basic operations of Rapid PVST+ Spanning Tree Protocol'},
      {id:'2.6',text:'Describe Cisco Wireless Architectures and AP modes'},
      {id:'2.7',text:'Describe physical infrastructure connections of WLAN components'},
      {id:'2.8',text:'Describe AP and WLC management access connections'},
    ],
    tip:'VLANs and trunking are heavily tested. Practice configuring switchport commands from memory.',
  },
  {
    id:'ccna3', label:'IP Connectivity', weight:25, color:'#a855f7',
    objectives:[
      {id:'3.1',text:'Interpret the components of routing table'},
      {id:'3.2',text:'Determine how a router makes forwarding decisions by default'},
      {id:'3.3',text:'Configure and verify IPv4 and IPv6 static routing'},
      {id:'3.4',text:'Configure and verify single-area OSPFv2 (point-to-point and multi-access)'},
      {id:'3.5',text:'Describe the purpose, functions, and concepts of first hop redundancy protocols'},
    ],
    tip:'IP Connectivity is the highest-weighted domain (25%). OSPF configuration and static routing are guaranteed exam topics.',
  },
  {
    id:'ccna4', label:'IP Services', weight:10, color:'#f97316',
    objectives:[
      {id:'4.1',text:'Configure and verify inside source NAT using static and pools'},
      {id:'4.2',text:'Configure and verify NTP operating in client/server mode'},
      {id:'4.3',text:'Explain the role of DHCP and DNS within the network'},
      {id:'4.4',text:'Explain the function of SNMP in network operations'},
      {id:'4.5',text:'Describe the use of syslog features including facilities and levels'},
      {id:'4.6',text:'Configure and verify DHCP client and relay'},
      {id:'4.7',text:'Explain the forwarding per-hop behavior (PHB) for QoS'},
      {id:'4.8',text:'Configure network devices for remote access using SSH'},
    ],
    tip:'NAT (static + PAT) and SSH configuration come up consistently. Know the ip nat inside/outside commands.',
  },
  {
    id:'ccna5', label:'Security Fundamentals', weight:15, color:'#ef4444',
    objectives:[
      {id:'5.1',text:'Define key security concepts (threats, vulnerabilities, exploits)'},
      {id:'5.2',text:'Describe security program elements (policies, procedures, awareness)'},
      {id:'5.3',text:'Configure and verify device access control using local passwords'},
      {id:'5.4',text:'Describe security password policies including complexity, alternatives'},
      {id:'5.5',text:'Describe remote access and site-to-site VPNs'},
      {id:'5.6',text:'Configure and verify access control lists (extended, named)'},
      {id:'5.7',text:'Configure Layer 2 security features (DHCP snooping, DAI, port security)'},
      {id:'5.8',text:'Differentiate authentication, authorization, and accounting concepts'},
      {id:'5.9',text:'Describe wireless security protocols (WPA, WPA2, WPA3)'},
      {id:'5.10',text:'Configure WLAN using WPA2 PSK using GUI'},
      {id:'5.11',text:'Describe endpoint security using EDR and MDM'},
    ],
    tip:'ACLs are tested heavily. Practice extended ACL syntax: access-list 100 permit tcp 10.0.0.0 0.0.0.255 any eq 443',
  },
  {
    id:'ccna6', label:'Automation & Programmability', weight:10, color:'#06b6d4',
    objectives:[
      {id:'6.1',text:'Explain how automation impacts network management'},
      {id:'6.2',text:'Compare traditional networks with controller-based networking'},
      {id:'6.3',text:'Describe controller-based and software-defined architectures (SD-WAN, SD-Access)'},
      {id:'6.4',text:'Explain AI and ML concepts used in network management'},
      {id:'6.5',text:'Describe characteristics of REST-based APIs (authentication, data encoding)'},
      {id:'6.6',text:'Recognize the capabilities of configuration management tools (Ansible, Puppet, Chef)'},
      {id:'6.7',text:'Recognize components of JSON-encoded data'},
    ],
    tip:'This domain is conceptual — no heavy config. Focus on understanding REST APIs, JSON, and Ansible vs Puppet differences.',
  },
];

const NETPLUS_DOMAINS = [
  {
    id:'np1', label:'Networking Concepts', weight:23, color:'#06b6d4',
    objectives:[
      {id:'np1.1',text:'Explain OSI model layers and their functions'},
      {id:'np1.2',text:'Compare and contrast networking protocols (TCP, UDP, ICMP)'},
      {id:'np1.3',text:'Explain IPv4 addressing, subnetting and CIDR'},
      {id:'np1.4',text:'Explain IPv6 addressing, types and transition mechanisms'},
      {id:'np1.5',text:'Explain routing concepts (static, dynamic, BGP, OSPF, EIGRP)'},
      {id:'np1.6',text:'Explain common ports and protocols (DNS, DHCP, HTTP, HTTPS, SSH)'},
      {id:'np1.7',text:'Explain the purposes and properties of various network topologies'},
      {id:'np1.8',text:'Explain the concepts of cloud and virtualization technologies'},
    ],
    tip:'The OSI model and IPv4 subnetting form the foundation. Ensure you can identify all 7 layers and their PDU types.',
  },
  {
    id:'np2', label:'Network Implementation', weight:19, color:'#10b981',
    objectives:[
      {id:'np2.1',text:'Install and configure routers and switches'},
      {id:'np2.2',text:'Install and configure wireless technologies (802.11 standards)'},
      {id:'np2.3',text:'Configure and verify VLANs, trunking and inter-VLAN routing'},
      {id:'np2.4',text:'Configure and verify static and dynamic routing protocols'},
      {id:'np2.5',text:'Configure and verify NAT and PAT'},
      {id:'np2.6',text:'Configure and verify DHCP, NTP, DNS server settings'},
    ],
    tip:'Hands-on config is key here. Know the syntax for VLAN creation, trunk negotiation, and router-on-a-stick.',
  },
  {
    id:'np3', label:'Network Operations', weight:17, color:'#f59e0b',
    objectives:[
      {id:'np3.1',text:'Monitor and analyze network performance using tools'},
      {id:'np3.2',text:'Explain the purpose of documentation and policies'},
      {id:'np3.3',text:'Explain high availability and disaster recovery concepts'},
      {id:'np3.4',text:'Identify the components and features of network management systems'},
      {id:'np3.5',text:'Describe change management, ITSM, and asset tracking processes'},
    ],
    tip:'Know your tools: Wireshark, SNMP, NetFlow, syslog. Document everything — real ops teams live or die by documentation.',
  },
  {
    id:'np4', label:'Network Security', weight:15, color:'#ef4444',
    objectives:[
      {id:'np4.1',text:'Summarize various types of attacks (DDoS, MITM, phishing, ARP poisoning)'},
      {id:'np4.2',text:'Explain network hardening techniques (ACLs, port security, disabling unused)'},
      {id:'np4.3',text:'Explain physical security and environmental controls'},
      {id:'np4.4',text:'Summarize authentication and access control concepts (AAA, RADIUS, TACACS+)'},
      {id:'np4.5',text:'Explain common firewall, IDS, and IPS concepts'},
    ],
    tip:'Focus on attack types and their network-layer mitigations. Know the difference between IDS (detect) and IPS (prevent).',
  },
  {
    id:'np5', label:'Network Troubleshooting', weight:26, color:'#a855f7',
    objectives:[
      {id:'np5.1',text:'Explain the troubleshooting methodology'},
      {id:'np5.2',text:'Troubleshoot physical layer issues (cabling, interfaces, transceivers)'},
      {id:'np5.3',text:'Troubleshoot connectivity issues using ping, traceroute, nslookup'},
      {id:'np5.4',text:'Troubleshoot VLAN and trunking issues'},
      {id:'np5.5',text:'Troubleshoot routing issues (missing routes, wrong next-hop)'},
      {id:'np5.6',text:'Troubleshoot wireless connectivity issues'},
      {id:'np5.7',text:'Troubleshoot IPv4 and IPv6 addressing issues'},
    ],
    tip:'Network Troubleshooting is 26% of the exam — the biggest domain! Know the OSI bottom-up approach: start with L1, work up.',
  },
];

function DomainCard({ domain, exam, progress, onToggle, quizScores }) {
  const [open, setOpen] = useState(false);
  const checked = domain.objectives.filter(o => progress[`${exam}_${o.id}`]).length;
  const total = domain.objectives.length;
  const pct = Math.round((checked / total) * 100);
  const quizPct = quizScores[domain.id.replace('ccna','IPv4').replace('np1','IPv4')] || 0;

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ border:`1px solid ${domain.color}30`, background:`${domain.color}08` }}>
      {/* Domain header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${domain.color}20`, border:`1px solid ${domain.color}40` }}>
          <span className="text-[11px] font-black" style={{ color: domain.color }}>{domain.weight}%</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-bold text-white">{domain.label}</span>
            <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full" style={{ background:`${domain.color}15`, color:domain.color, border:`1px solid ${domain.color}30` }}>
              {checked}/{total} objectives
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:`linear-gradient(to right,${domain.color},${domain.color}bb)` }} />
            </div>
            <span className="text-[7px] font-mono font-bold" style={{ color: pct === 100 ? '#10b981' : domain.color }}>{pct}%</span>
          </div>
        </div>
        {open ? <ChevronUp size={12} className="text-gray-600 shrink-0" /> : <ChevronDown size={12} className="text-gray-600 shrink-0" />}
      </div>

      {/* Objectives list */}
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor:`${domain.color}15` }}>
          <div className="text-[8px] font-mono text-gray-500 py-2 italic leading-relaxed">💡 {domain.tip}</div>
          <div className="space-y-1.5">
            {domain.objectives.map(obj => {
              const done = !!progress[`${exam}_${obj.id}`];
              return (
                <div key={obj.id} onClick={() => onToggle(exam, obj.id, !done)}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all hover:bg-white/[0.03]"
                  style={{ background: done ? `${domain.color}10` : 'transparent' }}>
                  {done
                    ? <CheckCircle size={12} style={{ color: domain.color, shrink: 0, marginTop: 1 }} />
                    : <Circle size={12} className="text-gray-700 shrink-0 mt-0.5" />}
                  <div>
                    <span className="text-[7px] font-mono font-bold mr-1.5" style={{ color: domain.color }}>{obj.id}</span>
                    <span className="text-[8px] font-mono text-gray-300 leading-relaxed">{obj.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertPrepHub({ onNavigateTool }) {
  const { certProgress, setCertObjective, quizHighScores, xp } = useSuite();
  const [activeExam, setActiveExam] = useState('ccna');

  const domains = activeExam === 'ccna' ? CCNA_DOMAINS : NETPLUS_DOMAINS;
  const examPrefix = activeExam;

  const totalObj = domains.reduce((s, d) => s + d.objectives.length, 0);
  const checkedObj = domains.reduce((s, d) => s + d.objectives.filter(o => certProgress[`${examPrefix}_${o.id}`]).length, 0);
  const pct = Math.round((checkedObj / totalObj) * 100);

  // Readiness: 60% from objectives, 40% from quiz scores
  const avgQuiz = Object.values(quizHighScores).length
    ? Math.round(Object.values(quizHighScores).reduce((a, b) => a + b, 0) / Object.values(quizHighScores).length)
    : 0;
  const readiness = Math.round(pct * 0.6 + avgQuiz * 0.4);
  const readinessColor = readiness >= 80 ? '#10b981' : readiness >= 60 ? '#f59e0b' : '#ef4444';
  const readinessLabel = readiness >= 80 ? 'Exam Ready 🏆' : readiness >= 60 ? 'Almost Ready 📚' : readiness >= 40 ? 'In Progress ⚡' : 'Just Started 🌱';

  // Progress ring
  const R = 36, circ = 2 * Math.PI * R;
  const dash = (readiness / 100) * circ;

  return (
    <div className="p-6 ns-content">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(245,158,11,0.25))', border:'1px solid rgba(239,68,68,0.3)' }}>
          <Flag size={18} className="text-rose-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-white font-black text-base">Certification Prep Hub</h2>
          <p className="text-[9px] font-mono text-gray-500">CCNA 200-301 · CompTIA Network+ N10-009 · Track every exam objective</p>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono" style={{ color:'#fbbf24' }}>
          <Zap size={11} /> {xp.toLocaleString()} XP
        </div>
      </div>

      {/* Exam selector */}
      <div className="flex gap-3 mb-5">
        {[['ccna','Cisco CCNA 200-301','#06b6d4',`${CCNA_DOMAINS.reduce((s,d)=>s+d.objectives.length,0)} objectives`],
          ['netplus','CompTIA Network+ N10-009','#a855f7',`${NETPLUS_DOMAINS.reduce((s,d)=>s+d.objectives.length,0)} objectives`]].map(([id,label,color,sub]) => (
          <button key={id} onClick={() => setActiveExam(id)} className="flex-1 rounded-2xl p-4 text-left transition-all duration-300"
            style={{ background: activeExam===id ? `${color}18` : 'rgba(255,255,255,0.03)', border:`1px solid ${activeExam===id ? color+'55' : 'rgba(255,255,255,0.08)'}`, boxShadow: activeExam===id ? `0 4px 20px ${color}22` : 'none' }}>
            <div className="font-black text-sm text-white mb-0.5">{label}</div>
            <div className="text-[8px] font-mono" style={{ color }}>{sub}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Objectives list */}
        <div className="flex-1 min-w-0">
          {domains.map(domain => (
            <DomainCard key={domain.id} domain={domain} exam={examPrefix}
              progress={certProgress} onToggle={setCertObjective} quizScores={quizHighScores} />
          ))}
        </div>

        {/* Right: Readiness panel */}
        <div className="w-56 shrink-0 space-y-3">
          {/* Readiness ring */}
          <div className="ns-glass rounded-2xl p-4 text-center">
            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-3">Exam Readiness</div>
            <div className="flex justify-center mb-2">
              <svg width={92} height={92} style={{ transform:'rotate(-90deg)' }}>
                <circle cx={46} cy={46} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                <circle cx={46} cy={46} r={R} fill="none" stroke={readinessColor} strokeWidth={6}
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:'stroke-dasharray 0.8s ease, stroke 0.4s' }} />
                <text x={46} y={46} textAnchor="middle" dominantBaseline="middle"
                  style={{ fill:'#fff', fontSize:16, fontWeight:900, fontFamily:'monospace', transform:'rotate(90deg)', transformOrigin:'46px 46px' }}>
                  {readiness}%
                </text>
              </svg>
            </div>
            <div className="text-[11px] font-bold" style={{ color:readinessColor }}>{readinessLabel}</div>
            <div className="text-[7px] font-mono text-gray-600 mt-1">60% objectives · 40% quiz scores</div>
          </div>

          {/* Stats */}
          <div className="ns-glass rounded-2xl p-4">
            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-3">Progress Stats</div>
            {[
              {l:'Objectives Checked', v:`${checkedObj}/${totalObj}`, c:'#10b981'},
              {l:'Avg Quiz Score', v:`${avgQuiz}%`, c:'#f59e0b'},
              {l:'Domains Started', v:`${domains.filter(d=>d.objectives.some(o=>certProgress[`${examPrefix}_${o.id}`])).length}/${domains.length}`, c:'#06b6d4'},
              {l:'Domains Complete', v:`${domains.filter(d=>d.objectives.every(o=>certProgress[`${examPrefix}_${o.id}`])).length}/${domains.length}`, c:'#a855f7'},
            ].map(({l,v,c}) => (
              <div key={l} className="flex justify-between items-center mb-2">
                <span className="text-[7px] font-mono text-gray-500">{l}</span>
                <span className="text-[9px] font-bold font-mono" style={{color:c}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Quiz scores by category */}
          <div className="ns-glass rounded-2xl p-4">
            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-3">Quiz Scores</div>
            {['IPv4','IPv6','VLSM','Masks','CIDR','Classes','Super','All'].map(cat => (
              <div key={cat} className="flex items-center gap-2 mb-1.5">
                <span className="text-[7px] font-mono text-gray-600 w-14">{cat}</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div style={{width:`${quizHighScores[cat]||0}%`, height:'100%', background:`${quizHighScores[cat]>=80?'#10b981':quizHighScores[cat]>=60?'#f59e0b':'#6b7280'}`, borderRadius:999}} />
                </div>
                <span className="text-[7px] font-mono w-7 text-right" style={{color:quizHighScores[cat]>=80?'#10b981':quizHighScores[cat]>=60?'#f59e0b':'#6b7280'}}>{quizHighScores[cat]||0}%</span>
              </div>
            ))}
            <button onClick={() => onNavigateTool && onNavigateTool('quiz')} className="w-full mt-2 py-1.5 rounded-xl text-[8px] font-bold font-mono transition-all"
              style={{background:'rgba(245,158,11,0.1)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.25)'}}>
              ⚡ Take Quiz to Improve
            </button>
          </div>

          {/* Reset */}
          <button onClick={() => { if(window.confirm('Reset all checked objectives?')) { domains.forEach(d => d.objectives.forEach(o => setCertObjective(examPrefix, o.id, false))); }}}
            className="w-full py-2 rounded-xl text-[8px] font-mono text-gray-700 hover:text-red-400 transition-colors"
            style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
            ↺ Reset {activeExam === 'ccna' ? 'CCNA' : 'Network+'} Objectives
          </button>
        </div>
      </div>
    </div>
  );
}
