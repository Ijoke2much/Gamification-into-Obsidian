import React, { useEffect, useMemo, useState } from 'react';
import {
	SystemHeader,
	SystemScaffold,
} from '../../../shared/components/ui/system/SystemPanel';
import styles from './SkillRealmMap.module.css';

function normClass(c: string | undefined): string {
	return (c ?? '').trim();
}

export interface VaultClassBrief {
	name: string;
	filePath: string;
	tagline?: string;
	icon?: string;
	level?: number;
	currentCP?: number;
	requiredCP?: number;
	totalCP?: number;
}

export interface SkillRealmSkill {
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

interface SkillRealmMapProps {
	skills: SkillRealmSkill[];
	vaultClasses?: VaultClassBrief[];
	onSkillSelect?: (skill: SkillRealmSkill) => void;
	onClassOpen?: (cls: VaultClassBrief) => void;
}

function defaultClassIcon(name: string): string {
	const n = name.toLowerCase();
	if (n.includes('physical') || n.includes('body')) return '💪';
	if (n.includes('mental') || n.includes('mind')) return '🧠';
	if (n.includes('creative') || n.includes('art')) return '🎨';
	if (n.includes('social')) return '🤝';
	return '⚔️';
}

function skillNodeEmoji(skill: SkillRealmSkill): string {
	if (skill.isMastered) return '👑';
	if (skill.currentLevel >= 5) return '⭐';
	if (skill.currentLevel >= 3) return '🔥';
	if (skill.currentLevel >= 1 && skill.currentCP > 0) return '✨';
	return '🔒';
}

export const SkillRealmMap: React.FC<SkillRealmMapProps> = ({
	skills,
	vaultClasses = [],
	onSkillSelect,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeClass, setActiveClass] = useState<string | null>(null);
	const [selectedSkill, setSelectedSkill] = useState<SkillRealmSkill | null>(null);

	const classBrowserItems = useMemo((): VaultClassBrief[] => {
		const map = new Map<string, VaultClassBrief>();
		for (const v of vaultClasses) {
			const n = normClass(v.name);
			if (!n) continue;
			map.set(n.toLowerCase(), { ...v, name: n });
		}
		for (const s of skills) {
			const n = normClass(s.class);
			if (!n) continue;
			const key = n.toLowerCase();
			if (!map.has(key)) {
				map.set(key, { name: n, filePath: '' });
			}
		}
		return Array.from(map.values()).sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
		);
	}, [vaultClasses, skills]);

	const hubGrouped = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		const groups: Record<string, SkillRealmSkill[]> = {};
		for (const s of skills) {
			const c = normClass(s.class);
			if (!c) continue;
			if (q && !s.name.toLowerCase().includes(q) && !c.toLowerCase().includes(q)) {
				continue;
			}
			if (!groups[c]) groups[c] = [];
			groups[c].push(s);
		}
		for (const k of Object.keys(groups)) {
			groups[k].sort((a, b) => a.name.localeCompare(b.name));
		}
		return groups;
	}, [skills, searchQuery]);

	const classNames = useMemo(
		() => Object.keys(hubGrouped).sort(),
		[hubGrouped]
	);

	useEffect(() => {
		if (classNames.length === 0) {
			setActiveClass(null);
			return;
		}
		setActiveClass((prev) =>
			prev && classNames.includes(prev) ? prev : classNames[0]
		);
	}, [classNames]);

	const pathSkills = activeClass ? hubGrouped[activeClass] ?? [] : [];

	const pathMeta = useMemo(() => {
		if (pathSkills.length === 0) {
			return { pct: 0, progressed: 0, total: 0, cp: 0, required: 0 };
		}
		const progressed = pathSkills.filter((s) => s.progressToNext > 0 || s.isMastered).length;
		const cp = pathSkills.reduce((sum, s) => sum + s.currentCP, 0);
		const required = pathSkills.reduce((sum, s) => sum + s.requiredCP, 0);
		const pct =
			required > 0
				? Math.round(Math.min(100, (cp / required) * 100))
				: Math.round(
						pathSkills.reduce((sum, s) => sum + s.progressToNext, 0) / pathSkills.length
					);
		return { pct, progressed, total: pathSkills.length, cp, required };
	}, [pathSkills]);

	useEffect(() => {
		if (pathSkills.length === 0) {
			setSelectedSkill(null);
			return;
		}
		setSelectedSkill((prev) => {
			if (prev && pathSkills.some((s) => s.name === prev.name)) return prev;
			return pathSkills[0];
		});
	}, [pathSkills, activeClass]);

	const handleSelectSkill = (skill: SkillRealmSkill) => {
		setSelectedSkill(skill);
		onSkillSelect?.(skill);
	};

	const activeClassMeta = classBrowserItems.find(
		(c) => c.name === activeClass
	);

	return (
		<SystemScaffold className={styles.realmRoot} data-system-ui="skill-realm">
			<SystemHeader
				icon="⚔"
				label="SYSTEM: SKILL REALM"
				title="Progress matrix"
			/>

			<div className={styles.searchRow}>
				<input
					type="search"
					className={styles.searchInput}
					placeholder="Search skills or classes…"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>

			{classNames.length === 0 ? (
				<div className={styles.emptyState}>
					No skills found. Create skills under Manage / Create, or clear search.
				</div>
			) : (
				<>
					<div className={styles.classTabs} role="tablist" aria-label="Skill classes">
						{classNames.map((c) => {
							const icon =
								(activeClassMeta?.name === c ? activeClassMeta.icon : undefined) ||
								classBrowserItems.find((x) => x.name === c)?.icon ||
								defaultClassIcon(c);
							return (
								<button
									key={c}
									type="button"
									role="tab"
									aria-selected={activeClass === c}
									className={`${styles.classTab} ${activeClass === c ? styles.classTabActive : ''}`}
									onClick={() => setActiveClass(c)}
								>
									<span className={styles.classTabIcon}>{icon.trim() || '⚔️'}</span>
									<span className={styles.classTabLabel}>{c}</span>
									<span className={styles.classTabCount}>
										{hubGrouped[c]?.length ?? 0}
									</span>
								</button>
							);
						})}
					</div>

					<div className={styles.layout}>
						<div className={styles.pathPanel}>
							<span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden />
							<span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden />
							<span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden />
							<span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden />

							<div className={styles.classBanner}>
								<span className={styles.classBannerIcon}>
									{(activeClassMeta?.icon || '').trim() ||
										defaultClassIcon(activeClass ?? '')}
								</span>
								<div className={styles.classBannerMeta}>
									<p className={styles.classBannerName}>{activeClass} path</p>
									<p className={styles.classBannerSub}>
										{pathMeta.progressed}/{pathMeta.total} skills active ·{' '}
										{pathMeta.cp}/{pathMeta.required} CP
									</p>
								</div>
							</div>

							<div className={styles.expBlock}>
								<div className={styles.expLabelRow}>
									<span>⚡ PATH CP</span>
									<span>
										{pathMeta.pct}% · {pathMeta.cp} / {pathMeta.required}
									</span>
								</div>
								<div className={styles.expTrack}>
									<div
										className={styles.expFill}
										style={{ width: `${pathMeta.pct}%` }}
									/>
								</div>
								<div className={styles.expEnds}>
									<span>START</span>
									<span>MASTERY</span>
								</div>
							</div>

							<h3 className={styles.sectionTitle}>Skill nodes</h3>

							<div className={styles.pathScroll}>
								{pathSkills.map((skill, idx) => {
									const isSel = selectedSkill?.name === skill.name;
									const locked =
										skill.currentCP <= 0 &&
										skill.progressToNext <= 0 &&
										!skill.isMastered;
									const training =
										skill.progressToNext > 0 &&
										skill.progressToNext < 100 &&
										!skill.isMastered;
									return (
										<div key={skill.name} className={styles.nodeRow}>
											{idx > 0 ? (
												<div
													className={`${styles.connector} ${locked ? styles.connectorDim : ''}`}
													aria-hidden
												/>
											) : null}
											<button
												type="button"
												className={[
													styles.nodeBtn,
													isSel ? styles.nodeSelected : '',
													skill.isMastered ? styles.nodeMastered : '',
													locked ? styles.nodeLocked : '',
													training ? styles.nodeTraining : '',
												]
													.filter(Boolean)
													.join(' ')}
												onClick={() => handleSelectSkill(skill)}
											>
												<span className={styles.nodeEmoji}>
													{skillNodeEmoji(skill)}
												</span>
												<span className={styles.nodeName}>{skill.name}</span>
												<span className={styles.nodeLevel}>
													Lv {skill.currentLevel}
												</span>
												<div className={styles.nodeBar}>
													<div
														className={`${styles.nodeBarFill} ${skill.isMastered ? styles.nodeBarFillMastered : ''}`}
														style={{
															width: `${skill.isMastered ? 100 : skill.progressToNext}%`,
														}}
													/>
												</div>
											</button>
										</div>
									);
								})}
							</div>
						</div>

						<div className={styles.detailPanel}>
							<span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden />
							<span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden />
							<span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden />
							<span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden />

							<h3 className={styles.sectionTitle}>Node detail</h3>

							{!selectedSkill ? (
								<p className={styles.detailEmpty}>Select a skill node on the path.</p>
							) : (
								<>
									<div className={styles.detailIcon}>
										{skillNodeEmoji(selectedSkill)}
									</div>
									<h4 className={styles.detailName}>{selectedSkill.name}</h4>
									{selectedSkill.description ? (
										<p className={styles.detailDesc}>{selectedSkill.description}</p>
									) : null}
									<div className={styles.statLine}>
										<span>Level</span>
										<strong>Lv {selectedSkill.currentLevel}</strong>
									</div>
									<div className={styles.statLine}>
										<span>CP progress</span>
										<strong>
											{selectedSkill.currentCP}/{selectedSkill.requiredCP}
										</strong>
									</div>
									<div className={styles.statLine}>
										<span>Total CP earned</span>
										<strong>{selectedSkill.totalCP}</strong>
									</div>
									<div className={styles.statLine}>
										<span>Status</span>
										<strong>
											{selectedSkill.isMastered
												? 'MASTERED'
												: selectedSkill.progressToNext > 0
													? 'TRAINING'
													: 'DORMANT'}
										</strong>
									</div>
									<button
										type="button"
										className={styles.codexBtn}
										onClick={() => onSkillSelect?.(selectedSkill)}
									>
										Open skill codex
									</button>
								</>
							)}
						</div>
					</div>
				</>
			)}
		</SystemScaffold>
	);
};
