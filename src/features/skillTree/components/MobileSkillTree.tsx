import React, { useState, useRef, useEffect } from 'react';
import { SkillProgressVisual } from './SkillProgressVisual';
import styles from './MobileSkillTree.module.css';

interface SkillData {
  name: string;
  currentLevel: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  maxLevel: number;
  isUnlocked: boolean;
  isMastered: boolean;
  progressToNext: number;
  class: string;
  description?: string;
}

interface MobileSkillTreeProps {
  skills: SkillData[];
  onSkillSelect?: (skill: SkillData) => void;
  onBackToOverview?: () => void;
}

export const MobileSkillTree: React.FC<MobileSkillTreeProps> = ({
  skills,
  onSkillSelect,
  onBackToOverview
}) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree' | 'compact' | 'detailed' | 'card'>('grid');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);

  // Get unique classes
  const classes = Array.from(new Set(skills.map(skill => skill.class)));

  // Filter skills based on search and class filter
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'all' || skill.class === filterClass;
    return matchesSearch && matchesClass;
  });

  // Group skills by class for tree view
  const skillsByClass = filteredSkills.reduce((acc, skill) => {
    if (!acc[skill.class]) {
      acc[skill.class] = [];
    }
    acc[skill.class].push(skill);
    return acc;
  }, {} as Record<string, SkillData[]>);

  // Tree view helper functions
  const toggleClassExpansion = (className: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(className)) {
        newSet.delete(className);
      } else {
        newSet.add(className);
      }
      return newSet;
    });
  };

  const getClassIcon = (className: string) => {
    const iconMap: Record<string, string> = {
      'Physical': '💪',
      'Mental': '🧠',
      'Spiritual': '🙏',
      'Social': '👥',
      'Creative': '🎨',
      'Technical': '⚙️',
      'Academic': '📚',
      'Health': '🏥',
      'Religion': '⛪',
      'Default': '⭐'
    };
    return iconMap[className] || iconMap['Default'];
  };

  // Desktop detection
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Keyboard shortcuts for desktop
  useEffect(() => {
    if (!isDesktop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            setZoomLevel(prev => Math.min(2, prev + 0.1));
            break;
          case '-':
            e.preventDefault();
            setZoomLevel(prev => Math.max(0.5, prev - 0.1));
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
          setViewMode('tree');
          break;
        case '4':
          setViewMode('compact');
          break;
        case '5':
          setViewMode('detailed');
          break;
        case '6':
          setViewMode('card');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop]);

  // Touch gesture handlers
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
      const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta * 0.01));
      setZoomLevel(newZoom);
      lastTouchDistance.current = distance;
    }
  };

  const handleSkillTap = (skill: SkillData) => {
    setSelectedSkill(skill);
    onSkillSelect?.(skill);
  };

  const handleLongPress = (skill: SkillData) => {
    // Show skill details modal or quick actions
    console.log('Long press on skill:', skill.name);
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  const handleSwipe = (direction: 'left' | 'right' | 'up' | 'down') => {
    // Handle navigation swipes
    switch (direction) {
      case 'left':
        if (viewMode === 'grid') setViewMode('list');
        else if (viewMode === 'list') setViewMode('tree');
        break;
      case 'right':
        if (viewMode === 'tree') setViewMode('list');
        else if (viewMode === 'list') setViewMode('grid');
        break;
      case 'up':
        onBackToOverview?.();
        break;
    }
  };

  return (
    <div 
      className={styles.mobileSkillTree}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{ transform: `scale(${zoomLevel})` }}
    >
      {/* Mobile Header */}
      <div className={styles.mobileHeader}>
        <button 
          className={styles.backButton}
          onClick={onBackToOverview}
        >
          ← Back
        </button>
        <h2 className={styles.title}>Skill Tree</h2>
        <button 
          className={styles.zoomButton}
          onClick={resetZoom}
        >
          🔍
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className={styles.searchFilterBar}>
        <input
          type="text"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className={styles.classFilter}
        >
          <option value="all">All Classes</option>
          {classes.map(className => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>
      </div>

      {/* View Mode Toggle */}
      <div className={styles.viewModeToggle}>
        <button
          className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
          onClick={() => setViewMode('grid')}
        >
          📱 Grid
        </button>
        <button
          className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 List
        </button>
        <button
          className={`${styles.viewButton} ${viewMode === 'tree' ? styles.active : ''}`}
          onClick={() => setViewMode('tree')}
        >
          🌳 Tree
        </button>
      </div>

      {/* Desktop Controls */}
      {isDesktop && (
        <div className={styles.desktopControls}>
          <div className={styles.viewModeSelector}>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View (1)"
            >
              Grid
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'compact' ? styles.active : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact View (4)"
            >
              Compact
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'detailed' ? styles.active : ''}`}
              onClick={() => setViewMode('detailed')}
              title="Detailed View (5)"
            >
              Detailed
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'card' ? styles.active : ''}`}
              onClick={() => setViewMode('card')}
              title="Card View (6)"
            >
              Card
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="List View (2)"
            >
              List
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'tree' ? styles.active : ''}`}
              onClick={() => setViewMode('tree')}
              title="Tree View (3)"
            >
              Tree
            </button>
          </div>
          <div className={styles.zoomLevelIndicator}>
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      )}

      {/* Skills Container */}
      <div 
        className={`${styles.skillsContainer} ${styles[viewMode]}`}
        ref={containerRef}
        style={{ 
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          width: `${100 / zoomLevel}%`,
          height: `${100 / zoomLevel}%`
        }}
      >
        {filteredSkills.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3>No skills found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'tree' ? (
          // Tree View - Group by classes
          Object.entries(skillsByClass).map(([className, classSkills]) => (
            <div key={className} className={styles.treeClassGroup}>
              <div 
                className={styles.treeClassHeader}
                onClick={() => toggleClassExpansion(className)}
              >
                <div className={styles.treeClassTitle}>
                  <span className={styles.treeClassIcon}>{getClassIcon(className)}</span>
                  {className}
                </div>
                <div className={styles.treeClassCount}>
                  {classSkills.length}
                </div>
                <span className={`${styles.treeClassToggle} ${expandedClasses.has(className) ? styles.expanded : ''}`}>
                  ▶
                </span>
              </div>
              <div className={`${styles.treeSkillsContainer} ${expandedClasses.has(className) ? '' : styles.collapsed}`}>
                {classSkills.map(skill => (
                  <div
                    key={skill.name}
                    className={styles.treeSkillCard}
                    onClick={() => handleSkillTap(skill)}
                  >
                    <div className={styles.skillIcon}>
                      {skill.isMastered ? '👑' : skill.currentLevel >= 5 ? '⭐' : skill.currentLevel >= 1 ? '✨' : '🔒'}
                    </div>
                    <div className={styles.skillName}>{skill.name}</div>
                    <div className={styles.levelInfo}>Level {skill.currentLevel}/{skill.maxLevel}</div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ 
                          width: `${skill.progressToNext}%`,
                          backgroundColor: skill.progressToNext >= 90 ? '#4ade80' : skill.progressToNext >= 70 ? '#fbbf24' : skill.progressToNext >= 50 ? '#f97316' : '#ef4444'
                        }}
                      />
                    </div>
                    <div className={styles.progressText}>
                      {skill.currentCP}/{skill.requiredCP} CP
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : viewMode === 'list' ? (
          // List View - Horizontal layout
          filteredSkills.map(skill => (
            <div
              key={skill.name}
              className={styles.skillCard}
              onClick={() => handleSkillTap(skill)}
            >
              <div className={styles.skillIcon}>
                {skill.isMastered ? '👑' : skill.currentLevel >= 5 ? '⭐' : skill.currentLevel >= 1 ? '✨' : '🔒'}
              </div>
              <div className={styles.skillInfo}>
                <div className={styles.skillName}>{skill.name}</div>
                <div className={styles.skillClass}>{skill.class}</div>
              </div>
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ 
                      width: `${skill.progressToNext}%`,
                      backgroundColor: skill.progressToNext >= 90 ? '#4ade80' : skill.progressToNext >= 70 ? '#fbbf24' : skill.progressToNext >= 50 ? '#f97316' : '#ef4444'
                    }}
                  />
                </div>
                <div className={styles.progressText}>
                  {skill.currentCP}/{skill.requiredCP} CP
                </div>
              </div>
            </div>
          ))
        ) : (
          // Grid, Compact, Detailed, Card views
          filteredSkills.map(skill => (
            <div
              key={skill.name}
              className={`${styles.skillCard} ${viewMode === 'compact' ? styles.compact : ''} ${viewMode === 'detailed' ? styles.detailed : ''}`}
              onClick={() => handleSkillTap(skill)}
              onTouchStart={(e) => {
                const timer = setTimeout(() => {
                  handleLongPress(skill);
                }, 500);
                e.currentTarget.setAttribute('data-timer', timer.toString());
              }}
              onTouchEnd={(e) => {
                const timer = parseInt(e.currentTarget.getAttribute('data-timer') || '0');
                clearTimeout(timer);
              }}
            >
              <SkillProgressVisual
                skill={{
                  name: skill.name,
                  currentLevel: skill.currentLevel,
                  currentCP: skill.currentCP,
                  requiredCP: skill.requiredCP,
                  totalCP: skill.totalCP,
                  maxLevel: skill.maxLevel,
                  isUnlocked: skill.isUnlocked,
                  isMastered: skill.isMastered,
                  progressToNext: skill.progressToNext
                }}
                size={
                  viewMode === 'compact' ? 'small' : 
                  viewMode === 'detailed' || viewMode === 'card' ? 'large' : 
                  viewMode === 'grid' ? 'small' : 'medium'
                }
                showDetails={viewMode !== 'grid' && viewMode !== 'compact'}
              />
              {(viewMode === 'grid' || viewMode === 'compact') && (
                <div className={styles.skillClass}>
                  {skill.class}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Mobile Zoom Controls */}
      {!isDesktop && (
        <div className={styles.zoomControls}>
          <button
            className={styles.zoomButton}
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
          >
            ➖
          </button>
          <span className={styles.zoomLevel}>{Math.round(zoomLevel * 100)}%</span>
          <button
            className={styles.zoomButton}
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
          >
            ➕
          </button>
        </div>
      )}

      {/* Desktop Zoom Controls */}
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
              <kbd>1-6</kbd> View Modes
            </div>
          </div>
        </div>
      )}

      {/* Mobile Quick Actions */}
      {!isDesktop && (
        <div className={styles.quickActions}>
          <button className={styles.actionButton}>
            📊 Stats
          </button>
          <button className={styles.actionButton}>
            🎯 Goals
          </button>
          <button className={styles.actionButton}>
            ⚙️ Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileSkillTree;
