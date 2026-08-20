import React, { useCallback, useEffect, useRef, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import { Card } from '../../../shared/components/ui/Card';
import {
	backupPluginSettings,
	exportSettingsToVault,
	importSettingsFromJson,
	listSettingsBackups,
	restoreSettingsBackup,
	type SettingsBackupEntry,
} from '../../../shared/utils/settingsBackup';
import {
	listAllDataBackups,
	restoreDataBackup,
	type DataBackupEntry,
} from '../../../shared/utils/vaultDataBackup';
import styles from './SettingsUI.module.css';

interface Props {
	plugin: GamifiedObsidianPlugin;
	onSettingsApplied: () => void;
}

export const DataBackupPanel: React.FC<Props> = ({ plugin, onSettingsApplied }) => {
	const [settingsBackups, setSettingsBackups] = useState<SettingsBackupEntry[]>([]);
	const [dataBackups, setDataBackups] = useState<DataBackupEntry[]>([]);
	const [busy, setBusy] = useState(false);
	const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const refresh = useCallback(async () => {
		const [s, d] = await Promise.all([
			listSettingsBackups(plugin.app.vault),
			listAllDataBackups(plugin.app.vault),
		]);
		setSettingsBackups(s);
		setDataBackups(d);
	}, [plugin]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const afterSettingsRestore = async () => {
		await plugin.loadSettings();
		onSettingsApplied();
		pixelNotice('Settings restored. Disable → enable the plugin if theme or modules look stale.', 5000);
	};

	const handleBackupNow = async () => {
		setBusy(true);
		try {
			const ok = await backupPluginSettings(plugin.app.vault, plugin.settings, { force: true });
			pixelNotice(ok ? 'Settings snapshot saved.' : 'Could not save a settings snapshot.', 3000);
			await refresh();
		} finally {
			setBusy(false);
		}
	};

	const handleRestoreSettings = async (path: string) => {
		if (confirmRestore !== path) {
			setConfirmRestore(path);
			window.setTimeout(() => setConfirmRestore((cur) => (cur === path ? null : cur)), 4000);
			return;
		}
		setBusy(true);
		setConfirmRestore(null);
		try {
			await backupPluginSettings(plugin.app.vault, plugin.settings, { force: true });
			await restoreSettingsBackup(plugin, path);
			await afterSettingsRestore();
			await refresh();
		} catch (error) {
			console.error(error);
			pixelNotice('Settings restore failed — see console.', 4000);
		} finally {
			setBusy(false);
		}
	};

	const handleExport = async () => {
		setBusy(true);
		try {
			const path = await exportSettingsToVault(plugin.app.vault, plugin.settings);
			try {
				await navigator.clipboard.writeText(JSON.stringify(plugin.settings, null, 2));
				pixelNotice(`Exported to ${path} (also copied JSON to clipboard).`, 4500);
			} catch {
				pixelNotice(`Exported settings to ${path}.`, 4000);
			}
		} catch (error) {
			console.error(error);
			pixelNotice('Export failed.', 3000);
		} finally {
			setBusy(false);
		}
	};

	const handleImportFile = async (file: File | undefined) => {
		if (!file) return;
		setBusy(true);
		try {
			const raw = await file.text();
			await backupPluginSettings(plugin.app.vault, plugin.settings, { force: true });
			await importSettingsFromJson(plugin, raw);
			await afterSettingsRestore();
			await refresh();
		} catch (error) {
			console.error(error);
			pixelNotice('Import failed — file must be a settings JSON object.', 4000);
		} finally {
			setBusy(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const handleRestoreData = async (entry: DataBackupEntry) => {
		const key = `data:${entry.backupPath}`;
		if (confirmRestore !== key) {
			setConfirmRestore(key);
			window.setTimeout(() => setConfirmRestore((cur) => (cur === key ? null : cur)), 4000);
			return;
		}
		setBusy(true);
		setConfirmRestore(null);
		try {
			await restoreDataBackup(plugin.app.vault, entry);
			pixelNotice(`Restored ${entry.sourcePath}.`, 4000);
			await refresh();
		} catch (error) {
			console.error(error);
			pixelNotice('Game data restore failed — see console.', 4000);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className={styles.settingsSection}>
			<Card className={styles.settingsCard}>
				<h3>💾 Plugin settings</h3>
				<p className={styles.settingDescription}>
					Snapshots of plugin options (theme, modules, HUD, currency…). Separate from
					Inventory / PlayerData. Last 5 copies; saving settings also snapshots at most once a minute.
				</p>
				<div className={styles.resetButtonGroup} style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
					<button type="button" className={styles.resetButton} disabled={busy} onClick={() => void handleBackupNow()}>
						Backup settings now
					</button>
					<button type="button" className={styles.resetButton} disabled={busy} onClick={() => void handleExport()}>
						Export JSON
					</button>
					<button
						type="button"
						className={styles.resetButton}
						disabled={busy}
						onClick={() => fileInputRef.current?.click()}
					>
						Import JSON…
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept="application/json,.json"
						hidden
						onChange={(e) => void handleImportFile(e.target.files?.[0])}
					/>
				</div>
				{settingsBackups.length === 0 ? (
					<p className={styles.settingDescription} style={{ marginTop: 12 }}>
						No settings snapshots yet. Click Backup settings now, or change and save settings.
					</p>
				) : (
					<ul className={styles.backupList}>
						{settingsBackups.map((entry) => (
							<li key={entry.backupPath} className={styles.backupRow}>
								<span>{entry.label}</span>
								<button
									type="button"
									className={`${styles.resetButton} ${confirmRestore === entry.backupPath ? styles.confirmReset : ''}`}
									disabled={busy}
									onClick={() => void handleRestoreSettings(entry.backupPath)}
								>
									{confirmRestore === entry.backupPath ? 'Click again to restore' : 'Restore'}
								</button>
							</li>
						))}
					</ul>
				)}
			</Card>

			<Card className={styles.settingsCard}>
				<h3>🎒 Game data</h3>
				<p className={styles.settingDescription}>
					PlayerData, Inventory, Recipes, and Materials snapshots taken automatically before those
					files are rewritten. Same list as the command palette restore command.
				</p>
				{dataBackups.length === 0 ? (
					<p className={styles.settingDescription} style={{ marginTop: 12 }}>
						No game-data backups yet — buy, craft, or play until a write happens.
					</p>
				) : (
					<ul className={styles.backupList}>
						{dataBackups.map((entry) => {
							const key = `data:${entry.backupPath}`;
							return (
								<li key={entry.backupPath} className={styles.backupRow}>
									<span>{entry.label}</span>
									<button
										type="button"
										className={`${styles.resetButton} ${confirmRestore === key ? styles.confirmReset : ''}`}
										disabled={busy}
										onClick={() => void handleRestoreData(entry)}
									>
										{confirmRestore === key ? 'Click again to restore' : 'Restore'}
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</Card>
		</div>
	);
};
