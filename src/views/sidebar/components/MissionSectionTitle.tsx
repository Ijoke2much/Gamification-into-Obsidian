import React from 'react';
import styles from './MissionSectionTitle.module.css';

export interface MissionSectionTitleProps {
	title: string;
	icon?: string;
	count?: number;
	actions?: React.ReactNode;
	className?: string;
}

/**
 * HUD-style section header: cyan icon + ALL-CAPS title + hairline underline.
 */
export const MissionSectionTitle: React.FC<MissionSectionTitleProps> = ({
	title,
	icon,
	count,
	actions,
	className = '',
}) => (
	<div className={`${styles.wrap} ${className}`.trim()}>
		<div className={styles.row}>
			<div className={styles.left}>
				{icon != null && icon !== '' && (
					<span className={styles.icon} aria-hidden="true">
						{icon}
					</span>
				)}
				<span className={styles.title}>{title}</span>
				{typeof count === 'number' && (
					<span className={styles.badge} aria-label={`${count} items`}>
						{count}
					</span>
				)}
			</div>
			{actions != null && <div className={styles.actions}>{actions}</div>}
		</div>
		<div className={styles.rule} aria-hidden="true" />
	</div>
);
