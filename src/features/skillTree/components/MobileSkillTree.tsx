import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SkillProgressVisual } from './SkillProgressVisual';
import styles from './MobileSkillTree.module.css';

function normSkillClass(c: string | undefined): string {
  if (c === undefined || c === null) return '';
  return String(c).trim();
}

export interface VaultClassBrief {
  name: string;
  filePath: string;
  tagline?: string;
  icon?: string;
  /** From class note YAML (defaults from discovery) */
  level?: number;
  currentCP?: number;
  requiredCP?: number;
  totalCP?: number;
}

interface SkillData {
  name: string;
  currentLevel: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  isUnlocked: boolean;
  isMastered: boolean;
  progressToNext: number;
  class: string;
  description?: string;
}

type ViewMode = 'grid' | 'list' | 'hub' | 'card';

type SkillScope = 'allSkills' | 'byClass';

interface MobileSkillTreeProps {
  skills: SkillData[];
  /** Class notes from vault — drives class browser and full tree labels */
  vaultClasses?: VaultClassBrief[];
  onSkillSelect?: (skill: SkillData) => void;
  /** Open the class `.md` in Obsidian */
  onClassOpen?: (cls: VaultClassBrief) => void;
  onBackToOverview?: () => void;
  embedded?: boolean;
}

export const MobileSkillTree: React.FC<MobileSkillTreeProps> = ({
  skills,
  vaultClasses = [],
  onSkillSelect,
  onClassOpen,
  onBackToOverview,
  embedded = false
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [scope, setScope] = useState<SkillScope>('byClass');
  /** When set (By class → drill down), main area shows skills for this class */
  const [byClassDrilldown, setByClassDrilldown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [hubClass, setHubClass] = useState<string | null>(null);
  /** Paths (hub) preview — mock-style sidebar */
  const [hubPreviewSkill, setHubPreviewSkill] = useState<SkillData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);

  const classesFromSkills = useMemo(
    () =>
      Array.from(
        new Set(skills.map((skill) => normSkillClass(skill.class)).filter(Boolean))
      ),
    [skills]
  );

  const classBrowserItems = useMemo((): VaultClassBrief[] => {
    const map = new Map<string, VaultClassBrief>();
    for (const v of vaultClasses) {
      const n = normSkillClass(v.name);
      if (!n) continue;
      map.set(n.toLowerCase(), {
        name: n,
        filePath: v.filePath || '',
        tagline: v.tagline,
        icon: v.icon,
        level: v.level,
        currentCP: v.currentCP,
        requiredCP: v.requiredCP,
        totalCP: v.totalCP
      });
    }
    for (const c of classesFromSkills) {
      const key = c.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: c,
          filePath: '',
          tagline: undefined,
          icon: undefined
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [vaultClasses, classesFromSkills]);

  const filteredClassItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return classBrowserItems;
    return classBrowserItems.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.tagline && c.tagline.toLowerCase().includes(q))
    );
  }, [classBrowserItems, searchQuery]);

  const classes = useMemo(
    () => classBrowserItems.map((c) => c.name),
    [classBrowserItems]
  );

  const skillAggregatesByClass = useMemo(() => {
    type Acc = {
      maxLevel: number;
      currentCP: number;
      requiredCP: number;
      totalCP: number;
      progressSum: number;
      n: number;
    };
    const m: Record<string, Acc> = {};
    for (const s of skills) {
      const k = normSkillClass(s.class);
      if (!k) continue;
      if (!m[k]) {
        m[k] = {
          maxLevel: 0,
          currentCP: 0,
          requiredCP: 0,
          totalCP: 0,
          progressSum: 0,
          n: 0
        };
      }
      m[k].maxLevel = Math.max(m[k].maxLevel, s.currentLevel);
      m[k].currentCP += s.currentCP;
      m[k].requiredCP += s.requiredCP;
      m[k].totalCP += s.totalCP;
      m[k].progressSum += s.progressToNext;
      m[k].n += 1;
    }
    const out: Record<
      string,
      {
        level: number;
        currentCP: number;
        requiredCP: number;
        totalCP: number;
        avgProgress: number;
      }
    > = {};
    for (const [k, v] of Object.entries(m)) {
      out[k] = {
        level: v.maxLevel,
        currentCP: v.currentCP,
        requiredCP: Math.max(1, v.requiredCP),
        totalCP: v.totalCP,
        avgProgress: v.n > 0 ? v.progressSum / v.n : 0
      };
    }
    return out;
  }, [skills]);

  const skillCountByClass = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of skills) {
      const k = normSkillClass(s.class) || 'Uncategorized';
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [skills]);

  const skillsForSearch = useMemo(
    () =>
      skills.filter((skill) =>
        skill.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [skills, searchQuery]
  );

  const resolvedClassFilter = useMemo(() => {
    if (!filterClass || filterClass === 'all') return 'all';
    if (classes.includes(filterClass)) return filterClass;
    const ci = classes.find(
      (c) => c.toLowerCase() === filterClass.toLowerCase()
    );
    return ci ?? 'all';
  }, [filterClass, classes]);

  const filteredSkills = useMemo(() => {
    if (scope === 'allSkills') {
      return skillsForSearch;
    }
    if (resolvedClassFilter === 'all') {
      return skillsForSearch;
    }
    const want = resolvedClassFilter.toLowerCase();
    return skillsForSearch.filter(
      (skill) => normSkillClass(skill.class).toLowerCase() === want
    );
  }, [skillsForSearch, resolvedClassFilter, scope]);

  const displaySkills = useMemo(() => {
    if (scope === 'byClass' && byClassDrilldown && viewMode !== 'hub') {
      const want = byClassDrilldown.toLowerCase();
      return skillsForSearch.filter(
        (s) => normSkillClass(s.class).toLowerCase() === want
      );
    }
    return filteredSkills;
  }, [scope, byClassDrilldown, viewMode, skillsForSearch, filteredSkills]);

  const hubGrouped = useMemo(() => {
    const acc: Record<string, SkillData[]> = {};
    for (const name of classes) {
      acc[name] = [];
    }
    for (const skill of skillsForSearch) {
      const c = normSkillClass(skill.class) || 'Uncategorized';
      if (!acc[c]) acc[c] = [];
      acc[c].push(skill);
    }
    return acc;
  }, [skillsForSearch, classes]);

  const hubClassNames = useMemo(
    () => Object.keys(hubGrouped).sort(),
    [hubGrouped]
  );

  const sortedDisplaySkills = useMemo(
    () =>
      [...displaySkills].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [displaySkills]
  );

  const showClassBrowser =
    scope === 'byClass' && viewMode !== 'hub' && byClassDrilldown === null;

  useEffect(() => {
    if (viewMode !== 'hub') return;
    if (hubClassNames.length === 0) {
      setHubClass(null);
      return;
    }
    setHubClass((prev) =>
      prev && hubClassNames.includes(prev) ? prev : hubClassNames[0]
    );
  }, [viewMode, hubClassNames]);

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            setZoomLevel((prev) => Math.min(2, prev + 0.1));
            break;
          case '-':
            e.preventDefault();
            setZoomLevel((prev) => Math.max(0.5, prev - 0.1));
            break;
          case '0':
            e.preventDefault();
            setZoomLevel(1);
            break;
        }
      }

      switch (e.key) {
        case '1':
          setViewMode('grid');
          break;
        case '2':
          setViewMode('list');
          break;
        case '3':
          setViewMode('hub');
          break;
        case '4':
          setViewMode('card');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const delta = distance - lastTouchDistance.current;
      setZoomLevel((prev) =>
        Math.max(0.5, Math.min(2, prev + delta * 0.01))
      );
      lastTouchDistance.current = distance;
    }
  };

  const handleSkillTap = (skill: SkillData) => {
    onSkillSelect?.(skill);
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  const getClassIcon = (className: string) => {
    const iconMap: Record<string, string> = {
      Physical: '💪',
      Mental: '🧠',
      Spiritual: '🙏',
      Social: '👥',
      Creative: '🎨',
      Technical: '⚙️',
      Academic: '📚',
      Health: '🏥',
      Religion: '⛪',
      Default: '⭐'
    };
    return iconMap[className] || iconMap.Default;
  };

  const skillToVisualProps = (skill: SkillData) => ({
    name: skill.name,
    currentLevel: skill.currentLevel,
    currentCP: skill.currentCP,
    requiredCP: skill.requiredCP,
    totalCP: skill.totalCP,
    isUnlocked: skill.isUnlocked,
    isMastered: skill.isMastered,
    progressToNext: skill.progressToNext
  });

  const hubSkillsSorted = useMemo(() => {
    if (!hubClass || !hubGrouped[hubClass]) return [];
    return [...hubGrouped[hubClass]].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [hubClass, hubGrouped]);

  const pathProgressMeta = useMemo(() => {
    const list = hubSkillsSorted;
    const n = list.length;
    if (n === 0) return { progressed: 0, total: 0, pct: 0 };
    const progressed = list.filter((s) => s.progressToNext > 0).length;
    const pct = Math.round((progressed / n) * 100);
    return { progressed, total: n, pct };
  }, [hubSkillsSorted]);

  useEffect(() => {
    if (viewMode !== 'hub') {
      setHubPreviewSkill(null);
      return;
    }
    if (!hubClass) return;
    setHubPreviewSkill((prev) => {
      if (hubSkillsSorted.length === 0) return null;
      if (prev && hubSkillsSorted.some((s) => s.name === prev.name)) return prev;
      return hubSkillsSorted[0];
    });
  }, [viewMode, hubClass, hubSkillsSorted]);

  const getSkillNodeEmoji = (skill: SkillData) => {
    if (skill.isMastered) return '👑';
    if (skill.currentLevel >= 5) return '⭐';
    if (skill.currentLevel >= 3) return '🔥';
    if (skill.currentLevel >= 1) return '✨';
    return '🔒';
  };

  const renderClassCard = (c: VaultClassBrief) => {
    const icon = (c.icon || '').trim() || getClassIcon(c.name);
    const nSkills = skillCountByClass[c.name] ?? 0;
    const canOpen = Boolean(c.filePath) && Boolean(onClassOpen);
    const agg = skillAggregatesByClass[c.name];
    const hasSkills = nSkills > 0 && agg !== undefined;

    const level = hasSkills ? agg!.level : (c.level ?? 1);
    const currentCP = hasSkills ? agg!.currentCP : (c.currentCP ?? 0);
    const requiredCP = Math.max(
      1,
      hasSkills ? agg!.requiredCP : (c.requiredCP ?? 100)
    );
    const totalCP = hasSkills ? agg!.totalCP : (c.totalCP ?? currentCP);
    const progressPct =
      requiredCP > 0
        ? Math.min(100, (currentCP / requiredCP) * 100)
        : hasSkills
          ? Math.min(100, agg!.avgProgress)
          : 0;
    const cpToNext = Math.max(0, requiredCP - currentCP);

    return (
      <div
        key={c.name}
        className={`${styles.classBrowserCard} ${viewMode === 'card' ? styles.classBrowserCardLarge : ''} ${viewMode === 'list' ? styles.classBrowserCardList : ''}`}
      >
        <div className={styles.classBrowserCardIcon} aria-hidden>
          {icon}
        </div>
        <div className={styles.classBrowserCardBody}>
          <h3 className={styles.classBrowserName}>{c.name}</h3>
          {c.tagline ? (
            <p className={styles.classBrowserTagline}>“{c.tagline}”</p>
          ) : null}
          <div className={styles.classBrowserStats}>
            <div className={styles.classBrowserLevelRow}>
              <span className={styles.classBrowserLevel}>Level {level}</span>
              <span className={styles.classBrowserSkillCount}>{nSkills} skill{nSkills !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.classBrowserProgressTrack}>
              <div
                className={styles.classBrowserProgressFill}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className={styles.classBrowserCpLine}>
              <span>
                {currentCP}/{requiredCP} CP
                {progressPct > 0 && (
                  <span className={styles.classBrowserCpPct}>
                    {' '}
                    ({progressPct.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
            <div className={styles.classBrowserMetaRow}>
              <span>Total CP: {totalCP}</span>
              <span>CP to next: {cpToNext}</span>
            </div>
          </div>
          <div className={styles.classBrowserActions}>
            {canOpen ? (
              <button
                type="button"
                className={styles.classOpenBtn}
                onClick={() => onClassOpen?.(c)}
              >
                Open note
              </button>
            ) : null}
            <button
              type="button"
              className={styles.classSkillsBtn}
              onClick={() => setByClassDrilldown(c.name)}
            >
              Skills ({nSkills})
            </button>
          </div>
        </div>
      </div>
    );
  };

  const searchPlaceholder =
    showClassBrowser ? 'Search classes…' : 'Search skills…';

  return (
    <div
      className={`${styles.mobileSkillTree} ${embedded ? styles.mobileSkillTreeEmbedded : ''} ${viewMode === 'hub' ? styles.pathsSoftRoot : ''}`.trim()}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className={styles.mobileHeader}>
        <button type="button" className={styles.backButton} onClick={onBackToOverview}>
          ← Back
        </button>
        <h2 className={styles.title}>Skill Tree</h2>
        <button type="button" className={styles.zoomButton} onClick={resetZoom}>
          🔍
        </button>
      </div>

      <div className={styles.searchFilterBar}>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        {viewMode !== 'hub' ? (
          scope === 'allSkills' ? (
            <div className={styles.scopeHintPill} title="Switch to By class for path notes">
              All skills
            </div>
          ) : showClassBrowser ? (
            <div className={styles.scopeHintPill} title="Class notes from your vault">
              Class notes
            </div>
          ) : (
            <div className={styles.scopeHintPill}>
              {byClassDrilldown ? `Path: ${byClassDrilldown}` : ''}
            </div>
          )
        ) : (
          <div className={styles.hubFilterHint}>Paths: search + pick a class</div>
        )}
      </div>

      {scope === 'byClass' && byClassDrilldown && viewMode !== 'hub' && (
        <div className={styles.drilldownBar}>
          <button
            type="button"
            className={styles.drilldownBack}
            onClick={() => setByClassDrilldown(null)}
          >
            ← Classes
          </button>
          <span className={styles.drilldownTitle}>{byClassDrilldown}</span>
        </div>
      )}

      {viewMode !== 'hub' && (
        <div className={styles.scopeBar}>
          <span className={styles.scopeLabel}>Show</span>
          <div className={styles.scopeSegment} role="group" aria-label="Skill list scope">
            <button
              type="button"
              className={`${styles.scopeButton} ${scope === 'allSkills' ? styles.scopeButtonActive : ''}`}
              onClick={() => {
                setScope('allSkills');
                setByClassDrilldown(null);
              }}
            >
              All skills
            </button>
            <button
              type="button"
              className={`${styles.scopeButton} ${scope === 'byClass' ? styles.scopeButtonActive : ''}`}
              onClick={() => {
                setScope('byClass');
                setFilterClass('all');
                setByClassDrilldown(null);
              }}
            >
              By class
            </button>
          </div>
        </div>
      )}

      <div className={styles.viewModeToggle}>
        <button
          type="button"
          className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
          onClick={() => setViewMode('grid')}
        >
          Grid
        </button>
        <button
          type="button"
          className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => setViewMode('list')}
        >
          List
        </button>
        <button
          type="button"
          className={`${styles.viewButton} ${viewMode === 'hub' ? styles.active : ''}`}
          onClick={() => setViewMode('hub')}
        >
          Paths
        </button>
        <button
          type="button"
          className={`${styles.viewButton} ${viewMode === 'card' ? styles.active : ''}`}
          onClick={() => setViewMode('card')}
        >
          Cards
        </button>
      </div>

      {isDesktop && (
        <div className={styles.desktopControls}>
          <div className={styles.viewModeSelector}>
            {(['grid', 'list', 'hub', 'card'] as const).map((mode, idx) => (
              <button
                key={mode}
                type="button"
                className={`${styles.viewModeButton} ${viewMode === mode ? styles.active : ''}`}
                onClick={() => setViewMode(mode)}
                title={`${mode} (${idx + 1})`}
              >
                {mode === 'hub' ? 'Paths' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <div className={styles.zoomLevelIndicator}>
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      )}

      <div className={styles.skillsScroll}>
        <div
          className={`${styles.skillsContainer} ${styles[viewMode]} ${
            showClassBrowser ? styles.classBrowserContainer : ''
          }`.trim()}
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left'
          }}
        >
          {viewMode === 'hub' ? (
            hubClassNames.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔍</div>
                <h3>No skills</h3>
                <p>Try a different search</p>
              </div>
            ) : (
              <div className={styles.pathsSoftLayout}>
                <div className={styles.pathsCategoryTabs} role="tablist" aria-label="Paths">
                  {hubClassNames.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={hubClass === c}
                      className={`${styles.pathsTab} ${hubClass === c ? styles.pathsTabActive : ''}`}
                      onClick={() => setHubClass(c)}
                    >
                      <span className={styles.pathsTabIcon}>{getClassIcon(c)}</span>
                      <span className={styles.pathsTabLabel}>{c}</span>
                      <span className={styles.pathsTabCount}>{hubGrouped[c]?.length ?? 0}</span>
                    </button>
                  ))}
                </div>
                {hubClass && (
                  <div className={styles.pathsBody}>
                    <div className={styles.pathsCanvas}>
                      <div className={styles.pathsCanvasTop}>
                        <div className={styles.pathsCanvasTitleRow}>
                          <span className={styles.pathsCanvasEmoji}>{getClassIcon(hubClass)}</span>
                          <div className={styles.pathsCanvasTitles}>
                            <h3 className={styles.pathsCanvasHeading}>{hubClass} path</h3>
                            <div className={styles.pathsProgressRow}>
                              <span className={styles.pathsProgressLabel}>Progress</span>
                              <div className={styles.pathsProgressTrack}>
                                <div
                                  className={styles.pathsProgressFill}
                                  style={{
                                    width: `${pathProgressMeta.total ? pathProgressMeta.pct : 0}%`
                                  }}
                                />
                              </div>
                              <span className={styles.pathsProgressFraction}>
                                {pathProgressMeta.progressed}/{pathProgressMeta.total} ({pathProgressMeta.total ? pathProgressMeta.pct : 0}%)
                              </span>
                            </div>
                          </div>
                          <div className={styles.pathsZoomMini} aria-label="Zoom">
                            <button
                              type="button"
                              className={styles.pathsZoomMiniBtn}
                              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
                            >
                              −
                            </button>
                            <span className={styles.pathsZoomMiniPct}>{Math.round(zoomLevel * 100)}%</span>
                            <button
                              type="button"
                              className={styles.pathsZoomMiniBtn}
                              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.1))}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className={styles.pathsNodeScroll}>
                        {hubSkillsSorted.length === 0 ? (
                          <p className={styles.pathsEmpty}>
                            No skills under this path yet. Try clearing search or add skills to this
                            class.
                          </p>
                        ) : (
                          hubSkillsSorted.map((skill, idx) => {
                            const isSel = hubPreviewSkill?.name === skill.name;
                            const faded =
                              skill.currentCP <= 0 &&
                              skill.progressToNext <= 0 &&
                              !skill.isMastered;
                            return (
                              <div key={skill.name} className={styles.pathsNodeRow}>
                                {idx > 0 ? (
                                  <div className={styles.pathsBranchLine} aria-hidden />
                                ) : null}
                                <button
                                  type="button"
                                  className={`${styles.pathsNode} ${isSel ? styles.pathsNodeSelected : ''} ${faded ? styles.pathsNodeFaded : ''}`}
                                  onClick={() => setHubPreviewSkill(skill)}
                                >
                                  <span className={styles.pathsNodeEmoji}>{getSkillNodeEmoji(skill)}</span>
                                  <span className={styles.pathsNodeName}>{skill.name}</span>
                                  <span className={styles.pathsNodeLevel}>Lv {skill.currentLevel}</span>
                                  <span
                                    className={styles.pathsNodeMicroBar}
                                    title={`${skill.progressToNext.toFixed(0)}%`}
                                  >
                                    <span
                                      className={styles.pathsNodeMicroFill}
                                      style={{ width: `${Math.min(100, skill.progressToNext)}%` }}
                                    />
                                  </span>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <aside className={styles.pathsAside} aria-label="Path detail">
                      {!hubPreviewSkill ? (
                        <>
                          <div className={styles.pathsAsideLead}>👉</div>
                          <p className={styles.pathsAsideTitle}>Select a skill</p>
                          <p className={styles.pathsAsideText}>
                            Click a node on the path to preview level and CP, then open the codex when
                            you’re ready.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className={styles.pathsAsideSkillName}>{hubPreviewSkill.name}</p>
                          <p className={styles.pathsAsideMeta}>
                            Level {hubPreviewSkill.currentLevel} ·{' '}
                            {hubPreviewSkill.currentCP}/{hubPreviewSkill.requiredCP} CP ·{' '}
                            {hubPreviewSkill.progressToNext.toFixed(0)}% to next
                          </p>
                          {hubPreviewSkill.description ? (
                            <p className={styles.pathsAsideDesc}>{hubPreviewSkill.description}</p>
                          ) : null}
                          <button
                            type="button"
                            className={styles.pathsAsideOpenBtn}
                            onClick={() => handleSkillTap(hubPreviewSkill)}
                          >
                            Open in codex
                          </button>
                        </>
                      )}
                      <div className={styles.pathsAsideBonus}>
                        Grow this path in the vault—every skill you nurture unlocks more momentum.
                      </div>
                    </aside>
                  </div>
                )}
              </div>
            )
          ) : showClassBrowser ? (
            filteredClassItems.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📂</div>
                <h3>No classes match</h3>
                <p>Try another search or add class notes under SkillTree/…/Class/</p>
              </div>
            ) : (
              filteredClassItems.map((c) => renderClassCard(c))
            )
          ) : sortedDisplaySkills.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3>No skills found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'list' ? (
            sortedDisplaySkills.map((skill) => (
              <div
                key={skill.name}
                className={styles.listSkillRow}
                onClick={() => handleSkillTap(skill)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSkillTap(skill);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <SkillProgressVisual
                  skill={skillToVisualProps(skill)}
                  size="compact"
                  showDetails={false}
                />
              </div>
            ))
          ) : (
            sortedDisplaySkills.map((skill) => (
              <div
                key={skill.name}
                className={`${styles.skillCard} ${viewMode === 'card' ? styles.cardMode : ''}`}
                onClick={() => handleSkillTap(skill)}
              >
                <SkillProgressVisual
                  skill={skillToVisualProps(skill)}
                  size={viewMode === 'grid' ? 'small' : 'large'}
                  showDetails={viewMode === 'card'}
                />
                {viewMode === 'grid' && (
                  <div className={styles.skillClass}>{normSkillClass(skill.class)}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {!isDesktop && (
        <div className={styles.zoomControls}>
          <button
            type="button"
            className={styles.zoomButton}
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
          >
            ➖
          </button>
          <span className={styles.zoomLevel}>{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            className={styles.zoomButton}
            onClick={() => setZoomLevel((z) => Math.min(2, z + 0.1))}
          >
            ➕
          </button>
        </div>
      )}

      {isDesktop && (
        <div className={styles.desktopZoomControls}>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            className={styles.zoomSlider}
            title={`Zoom: ${Math.round(zoomLevel * 100)}%`}
          />
          <div className={styles.zoomLevelIndicator}>
            {Math.round(zoomLevel * 100)}%
          </div>
          <div className={styles.keyboardShortcuts}>
            <div className={styles.shortcutHint}>
              <kbd>Ctrl/Cmd + +/-</kbd> Zoom
            </div>
            <div className={styles.shortcutHint}>
              <kbd>1–4</kbd> Grid · List · Paths · Cards
            </div>
          </div>
        </div>
      )}

      {!isDesktop && (
        <div className={styles.quickActions}>
          <button type="button" className={styles.actionButton}>
            📊 Stats
          </button>
          <button type="button" className={styles.actionButton}>
            🎯 Goals
          </button>
          <button type="button" className={styles.actionButton}>
            ⚙️ Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileSkillTree;
