import React from 'react';
import type { QuestHubSection } from '../../../features/quests/utils/questProjectUtils';
import hubStyles from './QuestHubPanels.module.css';

const SECTIONS: { id: QuestHubSection; label: string; icon: string }[] = [
	{ id: 'tasks', label: 'Quests', icon: '📋' },
	{ id: 'projects', label: 'Projects', icon: '🗂️' },
	{ id: 'journey', label: 'Journey', icon: '🛤️' },
	{ id: 'dungeon', label: 'Dungeon', icon: '⚔️' },
];

interface QuestHubNavProps {
	active: QuestHubSection;
	onChange: (section: QuestHubSection) => void;
	pixelShell?: boolean;
	clayShell?: boolean;
	showProjects?: boolean;
	showJourneyDungeon?: boolean;
}

export const QuestHubNav: React.FC<QuestHubNavProps> = ({
	active,
	onChange,
	pixelShell,
	clayShell,
	showProjects = true,
	showJourneyDungeon = true,
}) => {
	const sections = SECTIONS.filter((section) => {
		if (section.id === 'projects') return showProjects;
		if (section.id === 'journey' || section.id === 'dungeon') return showJourneyDungeon;
		return true;
	});

	return (
	<nav
		className={`${hubStyles.hubNav} ${pixelShell ? hubStyles.hubNavPixel : ''} ${clayShell ? hubStyles.hubNavClay : ''}`}
		data-quest-hub-nav
		aria-label="Quest hub"
	>
		{sections.map(({ id, label, icon }) => (
			<button
				key={id}
				type="button"
				className={`${hubStyles.hubNavBtn} ${active === id ? hubStyles.hubNavBtnActive : ''}`}
				aria-current={active === id ? 'page' : undefined}
				onClick={() => onChange(id)}
			>
				<span className={hubStyles.hubNavIcon} aria-hidden="true">
					{icon}
				</span>
				<span className={hubStyles.hubNavLabel}>{label}</span>
			</button>
		))}
	</nav>
	);
};
