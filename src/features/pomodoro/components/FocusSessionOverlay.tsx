import React from 'react';
import { createPortal } from 'react-dom';
import styles from './FocusSessionOverlay.module.css';

export const FocusSessionOverlay: React.FC<{
	surface: 'arena' | 'kit';
	clayUi?: boolean;
	onBackdropNotes?: () => void;
	children: React.ReactNode;
}> = ({ surface, clayUi = false, onBackdropNotes, children }) => {
	if (typeof document === 'undefined') return null;

	return createPortal(
		<div
			className={`${surface === 'arena' ? styles.arena : styles.kitDock} ${clayUi ? styles.clayOverlay : ''}`}
			data-focus-surface={surface}
		>
			{surface === 'arena' ? (
				<button
					type="button"
					className={styles.backdrop}
					aria-label="Open notes and shrink the encounter"
					onClick={onBackdropNotes}
				/>
			) : null}
			<div className={styles.stageBox}>{children}</div>
		</div>,
		document.body
	);
};
