import React, { useEffect, useMemo, useState } from 'react';
import type { App } from 'obsidian';
import type { BadgeTier } from '../../../data/models/AchievementSystem';
import { getAllSkills, type SkillMetadata } from '../../../shared/utils/skillDiscovery';
import {
	createCustomAchievement,
	CUSTOM_ACHIEVEMENTS_CHANGED,
	deleteCustomAchievement,
	loadCustomAchievements,
	skillRuleLabel,
	type CustomAchievement,
	type SkillAchievementRule,
} from '../utils/customAchievements';
import styles from './AchievementMakerPanel.module.css';

const ICONS = ['⭐', '📚', '🔥', '💰', '⚔️', '🧠', '🎯', '🌱'];
const TIERS: BadgeTier[] = ['bronze', 'silver', 'gold', 'legendary'];
const RULES: { id: SkillAchievementRule; label: string }[] = [
	{ id: 'uses', label: 'Used on quests' },
	{ id: 'level', label: 'Reaches level' },
	{ id: 'cp', label: 'Earns CP' },
	{ id: 'mastered', label: 'Mastered' },
];

function ruleSentence(skill: string, rule: SkillAchievementRule, target: number, badge: string): string {
	if (rule === 'level') return `When ${skill} reaches level ${target}, unlock “${badge}”.`;
	if (rule === 'cp') return `When ${skill} earns ${target} CP, unlock “${badge}”.`;
	if (rule === 'mastered') return `When ${skill} is mastered, unlock “${badge}”.`;
	return `When a completed quest uses ${skill} ${target} time${target === 1 ? '' : 's'}, unlock “${badge}”.`;
}

export interface AchievementMakerPanelProps {
	app: App;
}

function imageUrl(app: App, path: string): string {
	if (!path) return '';
	try {
		return app.vault.adapter.getResourcePath(path);
	} catch {
		return '';
	}
}

function fileLabel(path: string): string {
	const name = path.split('/').pop() ?? path;
	return name.replace(/\.[^.]+$/, '');
}

export const AchievementMakerPanel: React.FC<AchievementMakerPanelProps> = ({ app }) => {
	const [title, setTitle] = useState('');
	const [icon, setIcon] = useState('⭐');
	const [imagePath, setImagePath] = useState('');
	const [skillQuery, setSkillQuery] = useState('');
	const [skills, setSkills] = useState<SkillMetadata[]>([]);
	const [skillPath, setSkillPath] = useState('');
	const [rule, setRule] = useState<SkillAchievementRule>('uses');
	const [targets, setTargets] = useState({ uses: 10, level: 5, cp: 100, mastered: 1 });
	const [tier, setTier] = useState<BadgeTier>('bronze');
	const [coins, setCoins] = useState(50);
	const [titleReward, setTitleReward] = useState('');
	const [images, setImages] = useState<string[]>([]);
	const [photoQuery, setPhotoQuery] = useState('');
	const [saved, setSaved] = useState<CustomAchievement[]>([]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		let cancelled = false;
		const loadSkills = () => {
			void getAllSkills(app.vault).then((list) => {
				if (cancelled) return;
				const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
				setSkills(sorted);
				setSkillPath((current) => current || sorted[0]?.filePath || '');
			});
		};
		const loadSaved = () => {
			void loadCustomAchievements(app).then((items) => {
				if (!cancelled) setSaved(items);
			});
		};
		loadSkills();
		loadSaved();
		const files = app.vault.getFiles().filter((file) => /\.(png|jpe?g|gif|webp|svg)$/i.test(file.path));
		setImages(files.map((file) => file.path).sort((a, b) => a.localeCompare(b)));
		const onChange = () => {
			loadSkills();
			loadSaved();
		};
		window.addEventListener(CUSTOM_ACHIEVEMENTS_CHANGED, onChange);
		return () => {
			cancelled = true;
			window.removeEventListener(CUSTOM_ACHIEVEMENTS_CHANGED, onChange);
		};
	}, [app]);

	const visibleSkills = useMemo(() => {
		const query = skillQuery.trim().toLowerCase();
		const matched = query
			? skills.filter((skill) => skill.name.toLowerCase().includes(query) || skill.class.toLowerCase().includes(query))
			: skills;
		const selected = skills.find((skill) => skill.filePath === skillPath);
		if (selected && !matched.some((skill) => skill.filePath === selected.filePath)) return [selected, ...matched];
		return matched;
	}, [skills, skillQuery, skillPath]);

	const selectedSkill = skills.find((skill) => skill.filePath === skillPath);
	const target = targets[rule];
	const setTarget = (value: number) => {
		setTargets((current) => ({ ...current, [rule]: Math.max(1, value) }));
	};
	const chooseSkill = (skill: SkillMetadata) => {
		setSkillPath(skill.filePath);
		if (skill.icon) setIcon(skill.icon);
		setImagePath(skill.iconImage || '');
	};

	const visibleImages = useMemo(() => {
		const query = photoQuery.trim().toLowerCase();
		const matched = query ? images.filter((path) => path.toLowerCase().includes(query)) : images;
		return matched.slice(0, 24);
	}, [images, photoQuery]);

	const previewTitle = title.trim() || 'New badge';
	const previewSkill = selectedSkill?.name || 'a skill';
	const sentence = ruleSentence(previewSkill, rule, target, previewTitle);

	const save = async () => {
		const name = title.trim();
		if (!name) {
			setError('Add a title for the badge.');
			return;
		}
		if (!selectedSkill) {
			setError('Pick a skill. Create the skill first if this list is empty.');
			return;
		}
		setSaving(true);
		setError('');
		try {
			await createCustomAchievement(app, {
				title: name,
				skillName: selectedSkill.name,
				skillPath: selectedSkill.filePath,
				skillAliases: [selectedSkill.name],
				rule,
				target: rule === 'mastered' ? 1 : target,
				tier,
				icon: icon || selectedSkill.icon || '🏅',
				imagePath: imagePath || selectedSkill.iconImage || undefined,
				coins: Math.max(0, Math.round(coins)),
				titleReward: titleReward.trim() || name,
			});
			setTitle('');
			setTitleReward('');
		} catch (err) {
			console.error(err);
			setError('Could not save that achievement.');
		} finally {
			setSaving(false);
		}
	};

	const remove = async (id: string) => {
		setSaved(await deleteCustomAchievement(app, id));
	};

	return (
		<div className={styles.panel}>
			<section className={styles.block}>
				<h3>New achievement</h3>
				<p className={styles.lead}>The rule follows that skill. Quest checks, level, CP, and mastered update the badge on their own.</p>
				<p className={styles.rule}>{sentence}</p>

				<p className={styles.step}>1. Pick the skill</p>
				<input
					className={styles.field}
					value={skillQuery}
					placeholder="Find a skill"
					onChange={(event) => setSkillQuery(event.target.value)}
				/>
				<div className={styles.choiceList} role="listbox" aria-label="Skill">
					{visibleSkills.length === 0 && <p className={styles.empty}>No skills yet. Make one in the skill tree first.</p>}
					{visibleSkills.map((skill) => (
						<button
							key={skill.filePath}
							type="button"
							className={`${styles.choice}${skill.filePath === skillPath ? ` ${styles.choiceOn}` : ''}`}
							onClick={() => chooseSkill(skill)}
						>
							{skill.icon ? `${skill.icon} ` : ''}
							{skill.name}
						</button>
					))}
				</div>

				<p className={styles.step}>2. What has to happen</p>
				<div className={styles.choiceList}>
					{RULES.map((item) => (
						<button
							key={item.id}
							type="button"
							className={`${styles.choice}${item.id === rule ? ` ${styles.choiceOn}` : ''}`}
							onClick={() => setRule(item.id)}
						>
							{item.label}
						</button>
					))}
				</div>
				{rule !== 'mastered' && (
					<div className={styles.stepper}>
						<button type="button" className={styles.stepBtn} onClick={() => setTarget(target - (rule === 'cp' ? 10 : 1))} aria-label="Lower the goal">
							−
						</button>
						<span className={styles.stepValue}>{target}</span>
						<button type="button" className={styles.stepBtn} onClick={() => setTarget(target + (rule === 'cp' ? 10 : 1))} aria-label="Raise the goal">
							+
						</button>
					</div>
				)}

				<p className={styles.step}>3. Then unlock this badge</p>
				<label className={styles.label}>Title</label>
				<input className={styles.field} value={title} placeholder="Debugger" onChange={(event) => setTitle(event.target.value)} />

				<label className={styles.label}>Icon</label>
				<div className={styles.iconRow}>
					{ICONS.map((item) => (
						<button
							key={item}
							type="button"
							className={`${styles.iconBtn}${item === icon && !imagePath ? ` ${styles.iconOn}` : ''}`}
							onClick={() => {
								setIcon(item);
								setImagePath('');
							}}
						>
							{item}
						</button>
					))}
				</div>

				<label className={styles.label}>Photo</label>
				<input
					className={styles.field}
					value={photoQuery}
					placeholder="Find a photo in your vault"
					onChange={(event) => setPhotoQuery(event.target.value)}
				/>
				<div className={styles.photoGrid}>
					<button
						type="button"
						className={`${styles.photoChoice}${imagePath === '' ? ` ${styles.choiceOn}` : ''}`}
						onClick={() => setImagePath('')}
					>
						No photo
					</button>
					{visibleImages.map((path) => (
						<button
							key={path}
							type="button"
							className={`${styles.photoChoice}${path === imagePath ? ` ${styles.choiceOn}` : ''}`}
							onClick={() => setImagePath(path)}
						>
							<img src={imageUrl(app, path)} alt="" />
							<span>{fileLabel(path)}</span>
						</button>
					))}
				</div>

				<label className={styles.label}>Tier</label>
				<div className={styles.tiers}>
					{TIERS.map((item) => (
						<button
							key={item}
							type="button"
							className={`${styles.tierBtn} ${styles[item]}${item === tier ? ` ${styles.tierOn}` : ''}`}
							onClick={() => setTier(item)}
						>
							{item}
						</button>
					))}
				</div>

				<div className={styles.split}>
					<div>
						<label className={styles.label}>Coin reward</label>
						<div className={styles.stepper}>
							<button type="button" className={styles.stepBtn} onClick={() => setCoins((value) => Math.max(0, value - 10))}>
								−
							</button>
							<span className={styles.stepValue}>{coins}</span>
							<button type="button" className={styles.stepBtn} onClick={() => setCoins((value) => value + 10)}>
								+
							</button>
						</div>
					</div>
					<div>
						<label className={styles.label}>Title reward</label>
						<input
							className={styles.field}
							value={titleReward}
							placeholder="Same as the badge title"
							onChange={(event) => setTitleReward(event.target.value)}
						/>
					</div>
				</div>

				{error && <p className={styles.error}>{error}</p>}
				<button type="button" className={styles.save} onClick={() => void save()} disabled={saving}>
					{saving ? 'Saving…' : 'Save achievement'}
				</button>
			</section>

			<section className={styles.block}>
				<h3>Saved achievements</h3>
				{saved.length === 0 ? (
					<p className={styles.empty}>None yet. The rule above is what gets counted.</p>
				) : (
					<ul className={styles.savedList}>
						{saved.map((item) => (
							<li key={item.id} className={styles.savedRow}>
								{item.imagePath ? (
									<img src={imageUrl(app, item.imagePath)} alt="" className={styles.savedPhoto} />
								) : (
									<span className={styles.savedIcon}>{item.icon}</span>
								)}
								<span className={styles.savedCopy}>
									<strong>{item.title}</strong>
									<span>{skillRuleLabel(item)}</span>
									<span>
										{item.uses}/{item.target}
										{item.status === 'completed' ? ' · Unlocked' : ''}
									</span>
								</span>
								<button type="button" className={styles.remove} onClick={() => void remove(item.id)}>
									Remove
								</button>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
};
