import React from 'react';
import { getPluginAssetUrl, PLUGIN_ASSETS } from '../../../shared/utils/pluginAssetUrl';
import hubStyles from './QuestHubPanels.module.css';

export const ProjectsGuildBanner: React.FC = () => (
	<div className={hubStyles.guildBannerWrap}>
		<img
			className={hubStyles.guildBannerImg}
			src={getPluginAssetUrl(PLUGIN_ASSETS.projectsGuildBanner)}
			alt=""
			aria-hidden="true"
		/>
	</div>
);
