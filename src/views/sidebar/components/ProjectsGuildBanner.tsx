import React from 'react';
import guildBanner from '../../../../assets/projects-guild-banner.png';
import hubStyles from './QuestHubPanels.module.css';

export const ProjectsGuildBanner: React.FC = () => (
	<div className={hubStyles.guildBannerWrap}>
		<img className={hubStyles.guildBannerImg} src={guildBanner} alt="" aria-hidden="true" />
	</div>
);
