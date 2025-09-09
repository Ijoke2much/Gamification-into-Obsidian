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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

      {/* Skills Container */}
      <div className={`${styles.skillsContainer} ${styles[viewMode]}`}>
        {filteredSkills.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3>No skills found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredSkills.map(skill => (
            <div
              key={skill.name}
              className={styles.skillCard}
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
                size={viewMode === 'grid' ? 'small' : 'medium'}
                showDetails={viewMode !== 'grid'}
              />
              {viewMode === 'grid' && (
                <div className={styles.skillClass}>
                  {skill.class}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Zoom Controls */}
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

      {/* Quick Actions */}
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
    </div>
  );
};

export default MobileSkillTree;
