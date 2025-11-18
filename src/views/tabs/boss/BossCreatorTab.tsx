import React, { useEffect, useMemo, useState } from 'react';
import { Notice, Vault, TFile } from 'obsidian';
import { BossPhase, BossCreationOptions, Boss } from '../../../features/quests/types/BossTypes';
import { createBoss } from '../../../features/quests/utils/bossFactory';
import { getAllSkills, SkillMetadata } from '../../../shared/utils/skillDiscovery';

type Props = { vault: Vault; onCreate: (boss: Boss) => void; defaultQuest?: { id: string; title: string } };

const defaultPhase = (n: number): BossPhase => ({
  name: `Phase ${n}`,
  description: `Phase ${n} behavior`,
  hpThreshold: n === 1 ? 100 : n === 2 ? 60 : 30,
  moves: [],
  appearance: `Phase ${n} appearance`,
  specialEffects: [],
  phaseNumber: n,
  phaseColor: n === 1 ? '#45b7d1' : n === 2 ? '#4ecdc4' : '#e17055',
  phaseTransition: n === 1 ? 'The battle begins!' : n === 2 ? 'The battle intensifies!' : 'The final stand!',
  bossDialogue: n === 1 ? ['You dare challenge me?'] : n === 2 ? ['You will regret this!'] : ['This ends now!'],
});

export default function BossCreatorTab({ vault, onCreate, defaultQuest }: Props) {
  // Replace stat-level skills with real skills list
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [name, setName] = useState(defaultQuest?.title ?? 'New Boss');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy'|'medium'|'hard'|'epic'|'legendary'>('medium');
  const [bossType, setBossType] = useState<'mini-boss'|'boss'|'epic-boss'|'legendary-boss'>('boss');

  // Time selection with units and timer control
  const [timeValue, setTimeValue] = useState<number>(1);
  const [timeUnit, setTimeUnit] = useState<'hours'|'days'|'weeks'|'months'>('weeks');
  const [useTimer, setUseTimer] = useState<boolean>(true);

  // Subquests editor
  const [subtasks, setSubtasks] = useState<Array<{ text: string }>>([{ text: '' }]);

  // Avatar/Image selection
  const [avatarSource, setAvatarSource] = useState<'emoji'|'url'|'vault'>('emoji');
  const [iconEmoji, setIconEmoji] = useState<string>('👹');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [vaultImages, setVaultImages] = useState<TFile[]>([]);
  const [selectedVaultImagePath, setSelectedVaultImagePath] = useState<string>('');
  const vaultImagePreview = useMemo(() => {
    if (!selectedVaultImagePath) return '';
    const file = vault.getAbstractFileByPath(selectedVaultImagePath);
    if (file && file instanceof TFile) {
      return vault.getResourcePath(file);
    }
    return '';
  }, [selectedVaultImagePath, vault]);

  const [phases, setPhases] = useState<BossPhase[]>([defaultPhase(1), defaultPhase(2), defaultPhase(3)]);

  useEffect(() => {
    (async () => {
      const allSkills = await getAllSkills(vault);
      setSkills(allSkills);
      // load vault images list
      const files = vault.getFiles().filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f.path));
      setVaultImages(files);
    })();
  }, [vault]);

  useEffect(() => {
    // Suggest boss type based on selected skill's level if present
    const lvl = skills.find(s => s.name === selectedSkill)?.level ?? 1;
    if (lvl >= 15) setBossType('legendary-boss');
    else if (lvl >= 10) setBossType('epic-boss');
    else if (lvl >= 6) setBossType('boss');
    else setBossType('mini-boss');
  }, [selectedSkill, skills]);

  const toSeconds = (value: number, unit: 'hours'|'days'|'weeks'|'months') => {
    switch (unit) {
      case 'hours': return value * 60 * 60;
      case 'days': return value * 24 * 60 * 60;
      case 'weeks': return value * 7 * 24 * 60 * 60;
      case 'months': return value * 30 * 24 * 60 * 60;
      default: return value * 60 * 60;
    }
  };

  const toEstimatedDuration = (value: number, unit: 'hours'|'days'|'weeks'|'months') => {
    const u = unit === 'hours' ? (value === 1 ? 'hour' : 'hours')
            : unit === 'days' ? (value === 1 ? 'day' : 'days')
            : unit === 'weeks' ? (value === 1 ? 'week' : 'weeks')
            : (value === 1 ? 'month' : 'months');
    return `${value} ${u}`;
  };

  const hpBarSegments = useMemo(() => {
    const sorted = [...phases].sort((a,b) => b.hpThreshold - a.hpThreshold);
    return sorted.map(p => ({ threshold: p.hpThreshold, color: p.phaseColor }));
  }, [phases]);

  const updatePhase = (i: number, patch: Partial<BossPhase>) => {
    setPhases(prev => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  };

  const addPhase = () => setPhases(prev => [...prev, defaultPhase(prev.length + 1)]);
  const removePhase = (i: number) => setPhases(prev => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    const th = phases.map(p => p.hpThreshold);
    const invalid = th.some(t => t < 0 || t > 100) || [...th].sort((a,b)=>b-a).join(',') !== th.join(',');
    if (invalid) { new Notice('Phase thresholds must be in descending % from 100 to 0.', 3000); return false; }
    return true;
  };

  const handleCreate = () => {
    if (!selectedSkill) return new Notice('Select a skill to tie theme/type.', 3000);
    if (!validate()) return;

    const estimated = toEstimatedDuration(timeValue, timeUnit);
    const timerSeconds = toSeconds(timeValue, timeUnit);

    const options: BossCreationOptions = {
      name, description, difficulty, bossType,
      bossTheme: '', // resolved via skill in factory
      associatedSkill: selectedSkill,
      estimatedDuration: estimated,
      phases,
      questId: defaultQuest?.id, questTitle: defaultQuest?.title,
      enableTimer: useTimer,
      timerConfig: useTimer ? {
        duration: timerSeconds,
        countdown: timerSeconds,
        warningThreshold: Math.min(timerSeconds, 5 * 60),
        timeBonus: 100,
        timePenalty: 50
      } : undefined,
      visuals: (() => {
        if (avatarSource === 'emoji') {
          return { avatar: iconEmoji };
        }
        if (avatarSource === 'url') {
          const url = imageUrl.trim();
          return url ? { avatar: iconEmoji, customImage: url } : { avatar: iconEmoji };
        }
        // vault image
        if (avatarSource === 'vault') {
          const url = vaultImagePreview.trim();
          return url ? { avatar: iconEmoji, customImage: url } : { avatar: iconEmoji };
        }
        return { avatar: iconEmoji };
      })(),
      subtasks: subtasks
        .map(s => s.text.trim())
        .filter(Boolean)
        .map(text => ({ text, completed: false })),
    };

    const boss = createBoss(options);
    onCreate(boss);
    new Notice('Boss created!', 2000);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#ffd700', marginBottom: 12 }}>Boss Creator (Phases)</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={{ color: '#ffd700' }}>Skill</label>
          <select value={selectedSkill} onChange={e=>setSelectedSkill(e.target.value)} style={{ width:'100%' }}>
            <option value="">Select a skill…</option>
            {skills.map(s => (
              <option key={s.filePath} value={s.name}>
                {s.name} ({s.class})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: '#ffd700' }}>Estimated Duration</label>
          <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 1fr', gap:12 }}>
            <div>
              <div style={{ color:'#ccc', marginBottom:4 }}>Use Timer</div>
              <input type="checkbox" checked={useTimer} onChange={e => setUseTimer(e.target.checked)} />
            </div>
            <div>
              <div style={{ color:'#ccc', marginBottom:4 }}>Time Value</div>
              <input type="number" min={1} value={timeValue} onChange={e=>setTimeValue(Math.max(1, Number(e.target.value) || 1))} style={{ width:'100%' }} />
            </div>
            <div>
              <div style={{ color:'#ccc', marginBottom:4 }}>Unit</div>
              <select value={timeUnit} onChange={e=>setTimeUnit(e.target.value as 'hours'|'days'|'weeks'|'months')} style={{ width:'100%' }}>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            <div style={{ gridColumn:'1 / -1', color:'#aaa' }}>Preview: {toEstimatedDuration(timeValue, timeUnit)}</div>
          </div>
        </div>

        <div>
          <label style={{ color: '#ffd700' }}>Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={{ width:'100%' }}/>
        </div>
        <div>
          <label style={{ color: '#ffd700' }}>Difficulty</label>
          <select value={difficulty} onChange={e=>setDifficulty(e.target.value as 'easy'|'medium'|'hard'|'epic'|'legendary')} style={{ width:'100%' }}>
            <option value="easy">Easy</option><option value="medium">Medium</option>
            <option value="hard">Hard</option><option value="epic">Epic</option><option value="legendary">Legendary</option>
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ color: '#ffd700' }}>Description</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} style={{ width:'100%', height: 80 }}/>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <h3 style={{ color:'#ffd700' }}>Boss Appearance</h3>
        <div style={{ display:'flex', gap:12, marginBottom:8 }}>
          <button onClick={() => setAvatarSource('emoji')} style={{ background: avatarSource==='emoji' ? '#4a90e2' : '#2a2a2a', color:'#fff', padding:'6px 12px', border:'none', borderRadius:6 }}>Emoji</button>
          <button onClick={() => setAvatarSource('url')} style={{ background: avatarSource==='url' ? '#4a90e2' : '#2a2a2a', color:'#fff', padding:'6px 12px', border:'none', borderRadius:6 }}>Image URL</button>
          <button onClick={() => setAvatarSource('vault')} style={{ background: avatarSource==='vault' ? '#4a90e2' : '#2a2a2a', color:'#fff', padding:'6px 12px', border:'none', borderRadius:6 }}>Vault Image</button>
        </div>
        {avatarSource === 'emoji' ? (
          <input value={iconEmoji} onChange={e=>setIconEmoji(e.target.value)} placeholder="e.g. 👹" />
        ) : avatarSource === 'url' ? (
          <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Paste image URL..." style={{ width:'100%' }} />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
            <select
              value={selectedVaultImagePath}
              onChange={e => setSelectedVaultImagePath(e.target.value)}
              style={{ width:'100%' }}
            >
              <option value="">Select image from vault…</option>
              {vaultImages.map(img => (
                <option key={img.path} value={img.path}>{img.basename}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ marginTop:8, color:'#aaa' }}>
          Preview: {
            avatarSource === 'emoji'
              ? <span style={{ fontSize:'2rem' }}>{iconEmoji}</span>
              : avatarSource === 'url'
                ? (imageUrl ? <img src={imageUrl} alt="preview" style={{ height: 48 }}/> : 'No image')
                : (vaultImagePreview ? <img src={vaultImagePreview} alt="preview" style={{ height: 48 }}/> : 'No image')
          }
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#1e1e2e', borderRadius: 8 }}>
        <div style={{ marginBottom: 8, color: '#ffd700' }}>HP Phase Preview</div>
        <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#2a2a3a' }}>
          {hpBarSegments.map((seg, i) => (
            <div key={i} style={{ width: `${(seg.threshold - (hpBarSegments[i+1]?.threshold ?? 0))}%`, background: seg.color }}/>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ color:'#ffd700' }}>Phases</h3>
          <button onClick={addPhase} style={{ padding: '6px 10px' }}>＋ Add Phase</button>
        </div>

        {phases.map((p, idx) => (
          <div key={idx} style={{ marginBottom: 12, padding: 12, border: '1px solid #3a3a4a', borderRadius: 8 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 150px 110px 1fr', gap: 8, alignItems:'center' }}>
              <input value={p.name} onChange={e=>updatePhase(idx,{ name:e.target.value })}/>
              <input type="number" min={0} max={100} value={p.hpThreshold}
                     onChange={e=>updatePhase(idx,{ hpThreshold: Math.max(0, Math.min(100, Number(e.target.value)||0)) })}/>
              <input type="color" value={p.phaseColor} onChange={e=>updatePhase(idx,{ phaseColor: e.target.value })}/>
              <input placeholder="Transition line…" value={p.phaseTransition}
                     onChange={e=>updatePhase(idx,{ phaseTransition: e.target.value })}/>
            </div>

            <div style={{ marginTop: 8 }}>
              <input placeholder="Description…" value={p.description}
                     onChange={e=>updatePhase(idx,{ description: e.target.value })} style={{ width:'100%' }}/>
            </div>

            <div style={{ marginTop: 8 }}>
              <textarea placeholder="Dialogue lines (comma-separated)" value={p.bossDialogue.join(', ')}
                        onChange={e=>updatePhase(idx,{ bossDialogue: e.target.value.split(',').map(t=>t.trim()).filter(Boolean) })} style={{ width:'100%', height: 60 }}/>
            </div>

            <div style={{ marginTop: 8, display:'flex', gap: 8, alignItems:'center' }}>
              <span style={{ color:'#aaa' }}>Moves (names, comma-separated):</span>
              <input style={{ flex: 1 }} value={p.moves.join(', ')}
                     onChange={e=>updatePhase(idx,{ moves: e.target.value.split(',').map(t=>t.trim()).filter(Boolean) })}/>
            </div>

            <div style={{ marginTop: 8, display:'flex', justifyContent:'space-between' }}>
              <button onClick={()=>removePhase(idx)} style={{ color:'#ef4444' }}>Remove</button>
              <div style={{ display:'flex', gap:6 }}>
                <button disabled={idx===0} onClick={()=>{
                  setPhases(prev => { const next = [...prev]; const [x] = next.splice(idx,1); next.splice(idx-1,0,x); return next; });
                }}>↑</button>
                <button disabled={idx===phases.length-1} onClick={()=>{
                  setPhases(prev => { const next = [...prev]; const [x] = next.splice(idx,1); next.splice(idx+1,0,x); return next; });
                }}>↓</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ color:'#ffd700' }}>Subquests</h3>
        {subtasks.map((st, i) => (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
            <input
              value={st.text}
              onChange={e => {
                const next = [...subtasks];
                next[i] = { text: e.target.value };
                setSubtasks(next);
              }}
              placeholder={`Subquest ${i + 1}...`}
              style={{ flex:1 }}
            />
            <button onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}>🗑️</button>
          </div>
        ))}
        <button onClick={() => setSubtasks([...subtasks, { text: '' }])}>＋ Add Subquest</button>
      </div>

      <div style={{ marginTop: 16, display:'flex', justifyContent:'flex-end', gap: 8 }}>
        <button onClick={handleCreate} style={{ padding: '8px 16px', background:'#4a90e2', color:'#fff', border:'none', borderRadius:6 }}>Create Boss</button>
      </div>
    </div>
  );
}


