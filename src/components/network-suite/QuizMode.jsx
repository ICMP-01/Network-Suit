import React, { useState } from 'react';
import { Bomb, Target, Shield, Trophy } from 'lucide-react';
import BombDefusal from './BombDefusal';
import { CIDRMatcher, WildcardGame } from './MiniGames';

const GAMES = [
  { id: 'bomb',     label: '💣 Bomb Defusal',   icon: Bomb,   color: '#ef4444', desc: 'Answer subnetting questions before time runs out!' },
  { id: 'cidr',     label: '🎯 CIDR Matcher',    icon: Target, color: '#06b6d4', desc: 'Match subnet masks to CIDR notation. Build streaks!' },
  { id: 'wildcard', label: '🛡️ Wildcard Game',   icon: Shield, color: '#f59e0b', desc: 'Write the exact ACL wildcard mask for each requirement.' },
];

export default function QuizMode() {
  const [active, setActive] = useState(null);

  if (active) {
    const game = GAMES.find(g => g.id === active);
    return (
      <div className="p-6 ns-content">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setActive(null)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-all">
            ← Back
          </button>
          <div className="text-[11px] font-black font-mono" style={{ color: game.color }}>{game.label}</div>
        </div>
        {active === 'bomb'     && <BombDefusal />}
        {active === 'cidr'     && <CIDRMatcher />}
        {active === 'wildcard' && <WildcardGame />}
      </div>
    );
  }

  return (
    <div className="p-6 ns-content">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(239,68,68,0.25))', border:'1px solid rgba(245,158,11,0.3)' }}>
          <Trophy size={18} className="text-amber-400"/>
        </div>
        <div>
          <h2 className="text-white font-black text-base">Challenge Mode</h2>
          <p className="text-[9px] font-mono text-gray-500">Gamified networking challenges to sharpen your skills</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {GAMES.map(game => (
          <button key={game.id} onClick={() => setActive(game.id)}
            className="ns-glass rounded-2xl p-5 text-left group transition-all hover:-translate-y-1 border"
            style={{ borderColor: `${game.color}25` }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                style={{ background:`${game.color}20`, border:`1px solid ${game.color}40` }}>
                <game.icon size={22} style={{ color: game.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white text-sm mb-1">{game.label}</div>
                <div className="text-[9px] font-mono text-gray-400 leading-relaxed">{game.desc}</div>
              </div>
              <div className="text-gray-600 group-hover:text-gray-400 transition-colors text-lg">→</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 ns-glass rounded-xl p-3 border border-white/5">
        <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2">💡 Pro Tips</div>
        <div className="space-y-1">
          {[
            '💣 Bomb Defusal: Wrong answers cost 8 seconds. Think fast, think accurate.',
            '🎯 CIDR Matcher: Streak bonus doubles your points — keep a combo going!',
            '🛡️ Wildcard: Remember — wildcard = bitwise NOT of subnet mask.',
          ].map((t, i) => <div key={i} className="text-[8px] font-mono text-gray-500 leading-relaxed">{t}</div>)}
        </div>
      </div>
    </div>
  );
}
