import { Vault, TFile } from "obsidian";

export const ensureFileExists = async (
    vault: Vault,
    filePath: string,
    defaultContent = ""
): Promise<TFile> => {
    let file = vault.getAbstractFileByPath(filePath);

    if (!file) {
        file = await vault.create(filePath, defaultContent);
    }

    if (!(file instanceof TFile)) {
        throw new Error(`Expected ${filePath} to be a file, but it's not`);
    }

    return file;
};

export const readJsonFile = async <T>(
    vault: Vault,
    filePath: string,
    defaultValue: T
): Promise<T> => {
    try {
        const file = await ensureFileExists(vault, filePath, JSON.stringify(defaultValue, null, 2));
        const content = await vault.read(file);
        return JSON.parse(content) as T;
    } catch (error) {
        console.error(`Failed to read JSON file ${filePath}:`, error);
        return defaultValue;
    }
};

export const writeJsonFile = async <T>(
    vault: Vault,
    filePath: string,
    data: T
): Promise<void> => {
    try {
        const file = await ensureFileExists(vault, filePath);
        const content = JSON.stringify(data, null, 2);
        await vault.modify(file, content);
    } catch (error) {
        console.error(`Failed to write JSON file ${filePath}:`, error);
        throw error;
    }
};

export const appendToFile = async (
    vault: Vault,
    filePath: string,
    content: string
): Promise<void> => {
    try {
        const file = await ensureFileExists(vault, filePath);
        const existingContent = await vault.read(file);
        const newContent = existingContent + (existingContent ? "\n" : "") + content;
        await vault.modify(file, newContent);
    } catch (error) {
        console.error(`Failed to append to file ${filePath}:`, error);
        throw error;
    }
};

export const findFilesByExtension = (
    vault: Vault,
    extension: string
): TFile[] => {
    return vault.getMarkdownFiles().filter(file =>
        file.extension === extension || file.path.endsWith(`.${extension}`)
    );
};

export const findFilesByPattern = (
    vault: Vault,
    pattern: RegExp
): TFile[] => {
    return vault.getMarkdownFiles().filter(file =>
        pattern.test(file.path) || pattern.test(file.name)
    );
};

// Utility for safely reading and parsing markdown files
export const readMarkdownFile = async (
    vault: Vault,
    filePath: string
): Promise<{ content: string; lines: string[] }> => {
    try {
        const file = await ensureFileExists(vault, filePath);
        const content = await vault.read(file);
        const lines = content.split('\n');
        return { content, lines };
    } catch (error) {
        console.error(`Failed to read markdown file ${filePath}:`, error);
        return { content: "", lines: [] };
    }
};

// Utility for batch file operations
export const batchFileOperation = async <T>(
    items: T[],
    operation: (item: T) => Promise<void>,
    batchSize = 5
): Promise<void> => {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(operation));
    }
};

// File validation utilities
export const validateFileExists = (vault: Vault, filePath: string): boolean => {
    const file = vault.getAbstractFileByPath(filePath);
    return file instanceof TFile;
};

export const getFileSize = async (vault: Vault, filePath: string): Promise<number> => {
    const file = vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
        throw new Error(`File ${filePath} not found`);
    }
    return (await vault.read(file)).length;
};

// Safe file backup utility
export const createBackup = async (
    vault: Vault,
    filePath: string,
    backupSuffix = ".backup"
): Promise<string> => {
    const file = vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
        throw new Error(`File ${filePath} not found`);
    }

    const content = await vault.read(file);
    const backupPath = `${filePath}${backupSuffix}`;

    await vault.create(backupPath, content);
    return backupPath;
}; 