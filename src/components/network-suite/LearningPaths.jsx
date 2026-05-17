import React, { useState } from 'react';
import { useSuite } from './SuiteContext';
import { CheckCircle, Circle, Lock, PlayCircle, ArrowRight, RotateCcw, GraduationCap, Zap } from 'lucide-react';

const PATHS = [
  {
    id: 'beginner',
    label: 'Beginner Path',
    icon: '🎓',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.3)',
    desc: 'Learn IP networking from scratch — classes, masks, CIDR, IPv4, VLSM, IPv6, and supernetting.',
    estimatedHours: '4–6 hrs',
    steps: [
      { id: 'classes',  toolId: 'classes',  label: 'IP Classes',       icon: '📚', mins: 30, ccna: 'CCNA §1.6', desc: 'Understand Class A/B/C/D/E, private vs public ranges, and the historical classful system.' },
      { id: 'masks',    toolId: 'masks',    label: 'Subnet Masks',     icon: '🔢', mins: 30, ccna: 'CCNA §22.1', desc: 'Binary representation of masks, /prefix notation, wildcard masks used in ACLs.' },
      { id: 'cidr',     toolId: 'cidr',    label: 'CIDR Reference',   icon: '📋', mins: 25, ccna: 'CCNA §22.3', desc: 'Classless addressing, route aggregation, and how CIDR slowed IPv4 exhaustion.' },
      { id: 'ipv4',     toolId: 'ipv4',    label: 'IPv4 Calculator',  icon: '🧮', mins: 45, ccna: 'CCNA §22.2', desc: 'Calculate network, broadcast, usable hosts. Practice with real corporate subnets.' },
      { id: 'vlsm',     toolId: 'vlsm',    label: 'VLSM Planner',     icon: '🌿', mins: 40, ccna: 'CCNA §22.4', desc: 'Design variable-length subnets to minimise address waste. Real-world office scenario.' },
      { id: 'ipv6',     toolId: 'ipv6',    label: 'IPv6 Suite',       icon: '🌐', mins: 50, ccna: 'CCNA §25', desc: 'Understand 128-bit addressing, types (GUA/LLA/ULA), dual-stack, and EUI-64.' },
      { id: 'supernet', toolId: 'supernet',label: 'Supernetting',     icon: '🔗', mins: 35, ccna: 'CCNA §22.5', desc: 'Aggregate multiple networks into a single route — the foundation of BGP and ISP routing.' },
    ],
  },
  {
    id: 'ccna',
    label: 'CCNA Fast Track',
    icon: '⚡',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.3)',
    desc: 'Optimised for Cisco CCNA 200-301 exam prep. Covers IP addressing objectives in exam order.',
    estimatedHours: '3–4 hrs',
    steps: [
      { id: 'classes',  toolId: 'classes',  label: 'IP Classes',       icon: '📚', mins: 20, ccna: 'CCNA §1.6', desc: 'Quick review of classful addressing — key for understanding legacy configs and exam traps.' },
      { id: 'ipv4',     toolId: 'ipv4',    label: 'IPv4 Calculator',  icon: '🧮', mins: 40, ccna: 'CCNA §22.2', desc: 'Master subnetting in under 2 minutes — essential exam skill.' },
      { id: 'vlsm',     toolId: 'vlsm',    label: 'VLSM Design',      icon: '🌿', mins: 35, ccna: 'CCNA §22.4', desc: 'VLSM design questions appear in every CCNA exam. Practice 3 full scenarios here.' },
      { id: 'cidr',     toolId: 'cidr',    label: 'CIDR & Aggregation',icon: '📋', mins: 25, ccna: 'CCNA §22.3', desc: 'Route summarisation for OSPF/EIGRP area borders — exam question staple.' },
      { id: 'supernet', toolId: 'supernet',label: 'Supernetting',     icon: '🔗', mins: 30, ccna: 'CCNA §22.5', desc: 'BGP aggregation and summary routes for WAN design.' },
      { id: 'ipv6',     toolId: 'ipv6',    label: 'IPv6 Addressing',  icon: '🌐', mins: 45, ccna: 'CCNA §25', desc: 'IPv6 now covers 15% of CCNA exam — GUA, LLA, stateless autoconfiguration (SLAAC).' },
      { id: 'masks',    toolId: 'masks',   label: 'Mask Quick-Ref',   icon: '🔢', mins: 15, ccna: 'CCNA §22.1', desc: 'Fast reference for /24–/30 masks, hosts per subnet, and wildcard for ACLs.' },
    ],
  },
];

function ProgressRing({ pct, color, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: '#fff', fontSize: 11, fontWeight: 800, fontFamily: 'monospace', transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function LearningPaths({ onNavigateTool }) {
  const { learningProgress, markLearningStep, xp, addXP, achievements, unlockAchievement } = useSuite();
  const [activePath, setActivePath] = useState('beginner');
  const [celebration, setCelebration] = useState(false);
  const [newAch, setNewAch] = useState(null);
  const path = PATHS.find(p => p.id === activePath);

  const prog = learningProgress[activePath] || {};

  const stepStatus = (step, index) => {
    if (prog[step.id] === 'done') return 'done';
    if (prog[step.id] === 'active') return 'active';
    if (index === 0) return 'available';
    const prevStep = path.steps[index - 1];
    if (prog[prevStep.id] === 'done') return 'available';
    return 'locked';
  };

  const doneCount = path.steps.filter(s => prog[s.id] === 'done').length;
  const pct = Math.round((doneCount / path.steps.length) * 100);

  const handleStart = (step, status) => {
    if (status === 'locked') return;
    if (status !== 'done') markLearningStep(activePath, step.id, 'active');
    onNavigateTool(step.toolId);
  };

  const handleMarkDone = (e, step) => {
    e.stopPropagation();
    const wasNotDone = prog[step.id] !== 'done';
    markLearningStep(activePath, step.id, 'done');
    if (wasNotDone) {
      addXP(50, `Completed: ${step.label}`);
      // Check completion
      const newDone = path.steps.filter(s => prog[s.id] === 'done' || s.id === step.id).length;
      if (newDone === path.steps.length) {
        addXP(200, `Path Complete: ${path.label}`);
        setCelebration(true);
        setTimeout(() => setCelebration(false), 3000);
        const achId = `path_${activePath}`;
        if (!achievements[achId]) {
          unlockAchievement(achId);
          setNewAch({ id: achId, label: `${path.label} Master!`, icon: '🏆' });
          setTimeout(() => setNewAch(null), 3000);
        }
      } else if (newDone === 1 && !achievements['first_step']) {
        unlockAchievement('first_step');
        setNewAch({ id:'first_step', label:'First Step!', icon:'👣' });
        setTimeout(() => setNewAch(null), 2500);
      }
    }
  };

  const handleReset = () => {
    path.steps.forEach(s => markLearningStep(activePath, s.id, null));
  };

  return (
    <div className="p-6 ns-content">
      {/* Achievement popup */}
      {newAch && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl" style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.5)',animation:'fadeSlideUp 0.3s ease'}}>
          <span className="text-xl">{newAch.icon}</span>
          <div>
            <div className="text-[8px] font-mono text-amber-400 uppercase tracking-widest">Achievement Unlocked!</div>
            <div className="text-[11px] font-black text-white">{newAch.label}</div>
          </div>
          <span className="text-amber-400 font-black text-[10px] font-mono ml-2">+50 XP</span>
        </div>
      )}
      {celebration && (
        <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
          <div className="text-[80px]" style={{animation:'fadeSlideUp 0.3s ease'}}>🎉</div>
        </div>
      )}

      {/* Header with XP bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(59,130,246,0.25))', border: '1px solid rgba(16,185,129,0.3)' }}>
          <GraduationCap size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-white font-black text-base tracking-tight">Guided Learning Paths</h2>
          <p className="text-[9px] font-mono text-gray-500">Structured IP networking mastery · progress saved automatically</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)'}}>
            <Zap size={11} className="text-amber-400" />
            <span className="text-[10px] font-black font-mono text-amber-300">{xp.toLocaleString()} XP</span>
          </div>
        </div>
      </div>

      {/* Path selector */}

      <div className="flex gap-3 mb-6">
        {PATHS.map(p => (
          <button key={p.id} onClick={() => setActivePath(p.id)}
            className="flex-1 rounded-2xl p-4 text-left transition-all duration-300"
            style={{
              background: activePath === p.id ? `linear-gradient(135deg,${p.glow},rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activePath === p.id ? p.color + '60' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: activePath === p.id ? `0 4px 24px ${p.glow}` : 'none',
            }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{p.icon}</span>
              <span className="font-black text-sm text-white">{p.label}</span>
            </div>
            <p className="text-[9px] text-gray-400 font-mono leading-relaxed">{p.desc}</p>
            <div className="mt-2 text-[8px] font-mono" style={{ color: p.color }}>⏱ {p.estimatedHours} · {p.steps.length} modules</div>
          </button>
        ))}
      </div>

      {/* Active path panel */}
      <div className="ns-glass rounded-2xl p-5">
        {/* Path header with ring */}
        <div className="flex items-center gap-4 mb-5">
          <ProgressRing pct={pct} color={path.color} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-black text-sm">{path.label}</span>
              <span className="text-[7px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${path.color}20`, color: path.color, border: `1px solid ${path.color}40` }}>
                {doneCount}/{path.steps.length} complete
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(to right,${path.color},${path.color}bb)` }} />
            </div>
          </div>
          <button onClick={handleReset} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-mono text-gray-600 hover:text-red-400 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <RotateCcw size={9} /> Reset
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-2">
          {path.steps.map((step, idx) => {
            const status = stepStatus(step, idx);
            const isLocked = status === 'locked';
            const isDone = status === 'done';
            const isActive = status === 'active';
            return (
              <div key={step.id}
                onClick={() => handleStart(step, status)}
                className="rounded-xl p-3 flex items-center gap-3 transition-all duration-200 cursor-pointer group"
                style={{
                  background: isDone ? `${path.color}12` : isActive ? 'rgba(255,255,255,0.06)' : isLocked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isDone ? path.color + '40' : isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: isLocked ? 0.45 : 1,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                }}>
                {/* Status icon */}
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: isDone ? `${path.color}25` : 'rgba(255,255,255,0.04)', border: `1px solid ${isDone ? path.color + '50' : 'rgba(255,255,255,0.1)'}` }}>
                  {isDone ? <CheckCircle size={14} color={path.color} /> : isLocked ? <Lock size={11} color="#4b5563" /> : isActive ? <PlayCircle size={14} color={path.color} /> : <Circle size={14} color="#6b7280" />}
                </div>
                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px]">{step.icon}</span>
                    <span className="text-[11px] font-bold text-white">{step.label}</span>
                    <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                      🎓 {step.ccna}
                    </span>
                    <span className="text-[7px] font-mono text-gray-600 ml-auto">~{step.mins} min</span>
                  </div>
                  <p className="text-[8px] text-gray-400 leading-relaxed truncate">{step.desc}</p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isDone && !isLocked && (
                    <button onClick={(e) => handleMarkDone(e, step)}
                      className="text-[7px] font-mono px-2 py-1 rounded-full transition-colors hover:opacity-80"
                      style={{ background: `${path.color}15`, color: path.color, border: `1px solid ${path.color}35` }}>
                      ✓ Done
                    </button>
                  )}
                  {!isLocked && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center group-hover:opacity-100 opacity-50 transition-opacity" style={{ background: `${path.color}20` }}>
                      <ArrowRight size={10} color={path.color} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {pct === 100 && (
          <div className="mt-4 rounded-xl p-4 text-center" style={{ background: `${path.color}15`, border: `1px solid ${path.color}40` }}>
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-[13px] font-black text-white mb-1">Path Complete!</div>
            <div className="text-[9px] text-gray-400 font-mono">You've mastered all modules in {path.label}</div>
            <div className="flex justify-center gap-2 mt-3">
              {[{icon:'🎓',l:'Path Master'},{icon:'⚡',l:'+200 XP Bonus'},{icon:'📜',l:'Cert Ready'}].map(b=>(
                <div key={b.l} className="px-3 py-1.5 rounded-xl text-[7px] font-mono font-bold" style={{background:`${path.color}15`,color:path.color,border:`1px solid ${path.color}30`}}>{b.icon} {b.l}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      {Object.keys(achievements).length > 0 && (
        <div className="mt-4 ns-glass rounded-2xl p-4">
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-3">🏅 Achievements Unlocked</div>
          <div className="flex flex-wrap gap-2">
            {achievements['first_step'] && <span className="px-2 py-1 rounded-full text-[8px] font-mono" style={{background:'rgba(16,185,129,0.1)',color:'#10b981',border:'1px solid rgba(16,185,129,0.25)'}}>👣 First Step!</span>}
            {achievements['path_beginner'] && <span className="px-2 py-1 rounded-full text-[8px] font-mono" style={{background:'rgba(16,185,129,0.1)',color:'#10b981',border:'1px solid rgba(16,185,129,0.25)'}}>🎓 Beginner Master!</span>}
            {achievements['path_ccna'] && <span className="px-2 py-1 rounded-full text-[8px] font-mono" style={{background:'rgba(168,85,247,0.1)',color:'#a855f7',border:'1px solid rgba(168,85,247,0.25)'}}>⚡ CCNA Fast Track!</span>}
          </div>
        </div>
      )}
    </div>
  );
}
