import React from 'react';
import styles from './SystemPanel.module.css';

export type SystemStepVariant = 'cyan' | 'indigo' | 'gold';

const STEP_CLASS: Record<SystemStepVariant, string> = {
	cyan: styles.stepCyan,
	indigo: styles.stepIndigo,
	gold: styles.stepGold,
};

export const SystemScaffold: React.FC<
	React.PropsWithChildren<{ className?: string }> & React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...rest }) => (
	<div className={[styles.scaffold, className].filter(Boolean).join(' ')} {...rest}>
		{children}
	</div>
);

export const SystemBackdrop: React.FC<{
	children: React.ReactNode;
	onDismiss?: () => void;
	ariaLabelledBy?: string;
}> = ({ children, onDismiss, ariaLabelledBy }) => (
	<div
		className={styles.backdrop}
		role="dialog"
		aria-modal="true"
		aria-labelledby={ariaLabelledBy}
		onClick={onDismiss}
		onKeyDown={(e) => e.key === 'Escape' && onDismiss?.()}
	>
		{children}
	</div>
);

type SystemFrameProps = React.PropsWithChildren<{
	className?: string;
	wide?: boolean;
}> &
	React.HTMLAttributes<HTMLDivElement>;

export const SystemFrame: React.FC<SystemFrameProps> = ({
	children,
	className,
	wide = false,
	onClick,
	...rest
}) => (
	<div
		className={[
			styles.frame,
			wide ? styles.frameWide : styles.frameFull,
			className,
		]
			.filter(Boolean)
			.join(' ')}
		onClick={onClick}
		{...rest}
	>
		<span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
		<span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true" />
		<span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true" />
		<span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />
		{children}
	</div>
);

export const SystemHeader: React.FC<{
	icon?: string;
	label: string;
	title?: string;
}> = ({ icon, label, title }) => (
	<header className={styles.header}>
		{icon ? (
			<span className={styles.headerIcon} aria-hidden="true">
				{icon}
			</span>
		) : null}
		<p className={`${styles.systemLabel} ${styles.systemLabelBracket}`}>{label}</p>
		{title ? <h2 className={styles.title}>{title}</h2> : null}
	</header>
);

export const SystemStepList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<ol className={styles.stepList}>{children}</ol>
);

export const SystemStepCard: React.FC<{
	step: number;
	variant?: SystemStepVariant;
	children: React.ReactNode;
	hint?: string;
}> = ({ step, variant = 'cyan', children, hint }) => (
	<li className={`${styles.stepCard} ${STEP_CLASS[variant]}`}>
		{step}. {children}
		{hint ? <span className={styles.stepHint}>{hint}</span> : null}
	</li>
);

export const SystemActionBtn: React.FC<{
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	secondary?: boolean;
}> = ({ children, onClick, disabled, secondary }) => (
	<button
		type="button"
		className={[styles.actionBtn, secondary ? styles.actionBtnSecondary : '']
			.filter(Boolean)
			.join(' ')}
		disabled={disabled}
		onClick={onClick}
	>
		{children}
	</button>
);

export const SystemInfoBox: React.FC<{
	title: string;
	children: React.ReactNode;
}> = ({ title, children }) => (
	<div className={styles.infoBox}>
		<p className={styles.infoTitle}>⚠ {title} ⚠</p>
		<p className={styles.infoBody}>{children}</p>
	</div>
);

export const SystemStatGrid: React.FC<{
	cells: { label: string; value: string; highlight?: boolean }[];
}> = ({ cells }) => (
	<div className={styles.statGrid}>
		{cells.map((cell) => (
			<div key={cell.label} className={styles.statCell}>
				<span className={styles.statLabel}>{cell.label}</span>
				<span
					className={[
						styles.statValue,
						cell.highlight ? styles.statValueHighlight : '',
					]
						.filter(Boolean)
						.join(' ')}
				>
					{cell.value}
				</span>
			</div>
		))}
	</div>
);

export const SystemLicenseCard: React.FC<{
	serial?: string;
	rank: string;
	level: number;
	rankLabel: string;
}> = ({ serial, rank, level, rankLabel }) => (
	<div className={styles.licenseCard}>
		<div className={styles.licenseHead}>
			<span>🛡 Hunter license</span>
			{serial ? <span>#{serial}</span> : null}
		</div>
		<div className={styles.licenseBody}>
			<div className={styles.rankBox}>{rank}</div>
			<div className={styles.licenseMeta}>
				<span className={styles.licenseLevel}>LEVEL {level}</span>
				<span className={styles.licenseRank}>{rankLabel}</span>
			</div>
		</div>
	</div>
);

const ResourcePlusIcon = () => (
	<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
		<rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
	</svg>
);

const ResourceFlaskIcon = () => (
	<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
		<path
			d="M10 3h4v5l5 9a2 2 0 0 1-1.7 3H6.7A2 2 0 0 1 5 17l5-9V3z"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
		/>
		<path d="M9 3h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
	</svg>
);

const ResourceCrystalIcon = () => (
	<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
		<path
			d="M12 3l7 6-7 12L5 9l7-6z"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
		/>
		<path d="M5 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
	</svg>
);

export type SystemResourceIcon = 'hp' | 'mp' | 'cp' | 'exp';

const RESOURCE_ICONS: Record<SystemResourceIcon, React.FC> = {
	hp: ResourcePlusIcon,
	mp: ResourceFlaskIcon,
	cp: ResourceCrystalIcon,
	exp: ResourcePlusIcon,
};

export const SystemResourceBar: React.FC<{
	label: string;
	current: number;
	max: number;
	icon?: SystemResourceIcon;
	iconNode?: React.ReactNode;
	valueSuffix?: string;
	className?: string;
}> = ({ label, current, max, icon = 'cp', iconNode, valueSuffix = '', className }) => {
	const safeMax = Math.max(1, max);
	const safeCurrent = Math.max(0, current);
	const percent = Math.min(100, Math.max(0, Math.round((safeCurrent / safeMax) * 100)));
	const Icon = RESOURCE_ICONS[icon];
	const suffix = valueSuffix ? ` ${valueSuffix}` : '';
	const resourceClass = styles[`resourceBar${icon.toUpperCase()}`] ?? '';

	return (
		<div className={[styles.resourceBarRow, resourceClass, className].filter(Boolean).join(' ')}>
			<div className={styles.resourceBarIconCol}>
				<span className={styles.resourceBarIcon}>{iconNode ?? <Icon />}</span>
				<span className={styles.resourceBarLabel}>{label}</span>
			</div>
			<div className={styles.resourceBarMain}>
				<div
					className={styles.resourceBarTrack}
					role="progressbar"
					aria-valuenow={percent}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={`${label} ${safeCurrent} of ${safeMax}${suffix}`}
				>
					<div className={styles.resourceBarFill} style={{ width: `${percent}%` }} />
				</div>
				<span className={styles.resourceBarValue}>
					{safeCurrent}/{safeMax}
					{suffix}
				</span>
			</div>
		</div>
	);
};

export { styles as systemPanelStyles };
