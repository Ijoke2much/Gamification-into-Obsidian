import { playerStore } from '../state/playerStore';
import { Buff, Debuff } from '../../data/models/PlayerData';

export interface BuffTemplate {
    name: string;
    type: 'multiplier' | 'flat' | 'temporary';
    value: number;
    duration?: number; // in minutes
    description: string;
    icon?: string;
    category: 'energy' | 'focus' | 'motivation' | 'general';
}

export interface DebuffTemplate {
    name: string;
    type: 'multiplier' | 'flat' | 'temporary';
    value: number;
    duration?: number; // in minutes
    description: string;
    icon?: string;
    category: 'energy' | 'focus' | 'motivation' | 'general';
}

class BuffService {
    private static instance: BuffService;

    // Predefined buff templates
    private buffTemplates: Map<string, BuffTemplate> = new Map([
        ['coffee', {
            name: 'Coffee Boost',
            type: 'multiplier',
            value: 0.2,
            duration: 30,
            description: 'Increased focus and energy from coffee',
            icon: '☕',
            category: 'energy'
        }],
        ['meditation', {
            name: 'Meditation Calm',
            type: 'multiplier',
            value: 0.15,
            duration: 60,
            description: 'Reduced stress and improved focus',
            icon: '🧘',
            category: 'focus'
        }],
        ['exercise', {
            name: 'Exercise High',
            type: 'multiplier',
            value: 0.25,
            duration: 45,
            description: 'Boosted energy and motivation',
            icon: '💪',
            category: 'motivation'
        }],
        ['rest', {
            name: 'Well Rested',
            type: 'multiplier',
            value: 0.1,
            duration: 120,
            description: 'Recovered from good rest',
            icon: '😴',
            category: 'general'
        }]
    ]);

    // Predefined debuff templates
    private debuffTemplates: Map<string, DebuffTemplate> = new Map([
        ['tired', {
            name: 'Tired',
            type: 'multiplier',
            value: 0.2,
            duration: 60,
            description: 'Reduced performance from fatigue',
            icon: '😴',
            category: 'energy'
        }],
        ['stressed', {
            name: 'Stressed',
            type: 'multiplier',
            value: 0.15,
            duration: 90,
            description: 'Reduced focus from stress',
            icon: '😰',
            category: 'focus'
        }],
        ['burnout', {
            name: 'Burnout',
            type: 'multiplier',
            value: 0.3,
            duration: 180,
            description: 'Severe performance reduction',
            icon: '🔥',
            category: 'general'
        }]
    ]);

    private constructor() {
        this.startCleanupTimer();
    }

    static getInstance(): BuffService {
        if (!BuffService.instance) {
            BuffService.instance = new BuffService();
        }
        return BuffService.instance;
    }

    // Add a buff to the player
    async addBuff(buffName: string, customDuration?: number): Promise<Buff | null> {
        const template = this.buffTemplates.get(buffName);
        if (!template) {
            console.warn(`Unknown buff template: ${buffName}`);
            return null;
        }

        const duration = customDuration || template.duration || 60;
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);

        const buff: Buff = {
            name: template.name,
            type: template.type,
            value: template.value,
            expiresAt: expiresAt.toISOString(),
            description: template.description,
            icon: template.icon
        };

        await playerStore.update(data => {
            const existingBuffs = data.buffs || [];

            // Check if buff already exists and extend duration
            const existingIndex = existingBuffs.findIndex(b => b.name === buff.name);
            if (existingIndex >= 0) {
                existingBuffs[existingIndex] = buff;
            } else {
                existingBuffs.push(buff);
            }

            return {
                ...data,
                buffs: existingBuffs
            };
        });

        return buff;
    }

    // Add a debuff to the player
    async addDebuff(debuffName: string, customDuration?: number): Promise<Debuff | null> {
        const template = this.debuffTemplates.get(debuffName);
        if (!template) {
            console.warn(`Unknown debuff template: ${debuffName}`);
            return null;
        }

        const duration = customDuration || template.duration || 60;
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);

        const debuff: Debuff = {
            name: template.name,
            type: template.type,
            value: template.value,
            expiresAt: expiresAt.toISOString(),
            description: template.description,
            icon: template.icon
        };

        await playerStore.update(data => {
            const existingDebuffs = data.debuffs || [];

            // Check if debuff already exists and extend duration
            const existingIndex = existingDebuffs.findIndex(d => d.name === debuff.name);
            if (existingIndex >= 0) {
                existingDebuffs[existingIndex] = debuff;
            } else {
                existingDebuffs.push(debuff);
            }

            return {
                ...data,
                debuffs: existingDebuffs
            };
        });

        return debuff;
    }

    // Remove a specific buff
    async removeBuff(buffName: string): Promise<void> {
        await playerStore.update(data => ({
            ...data,
            buffs: (data.buffs || []).filter(b => b.name !== buffName)
        }));
    }

    // Remove a specific debuff
    async removeDebuff(debuffName: string): Promise<void> {
        await playerStore.update(data => ({
            ...data,
            debuffs: (data.debuffs || []).filter(d => d.name !== debuffName)
        }));
    }

    // Get all active buffs
    async getActiveBuffs(): Promise<Buff[]> {
        const player = await playerStore.get();
        if (!player || !player.buffs) return [];

        const now = new Date();
        return player.buffs.filter(buff => {
            if (!buff.expiresAt) return true;
            return new Date(buff.expiresAt) > now;
        });
    }

    // Get all active debuffs
    async getActiveDebuffs(): Promise<Debuff[]> {
        const player = await playerStore.get();
        if (!player || !player.debuffs) return [];

        const now = new Date();
        return player.debuffs.filter(debuff => {
            if (!debuff.expiresAt) return true;
            return new Date(debuff.expiresAt) > now;
        });
    }

    // Get available buff templates
    getBuffTemplates(): BuffTemplate[] {
        return Array.from(this.buffTemplates.values());
    }

    // Get available debuff templates
    getDebuffTemplates(): DebuffTemplate[] {
        return Array.from(this.debuffTemplates.values());
    }

    // Create a custom buff
    async createCustomBuff(
        name: string,
        type: Buff['type'],
        value: number,
        duration: number,
        description: string,
        icon?: string,
        category: BuffTemplate['category'] = 'general'
    ): Promise<Buff> {
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);

        const buff: Buff = {
            name,
            type,
            value,
            expiresAt: expiresAt.toISOString(),
            description,
            icon
        };

        await playerStore.update(data => ({
            ...data,
            buffs: [...(data.buffs || []), buff]
        }));

        return buff;
    }

    // Create a custom debuff
    async createCustomDebuff(
        name: string,
        type: Debuff['type'],
        value: number,
        duration: number,
        description: string,
        icon?: string,
        category: DebuffTemplate['category'] = 'general'
    ): Promise<Debuff> {
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);

        const debuff: Debuff = {
            name,
            type,
            value,
            expiresAt: expiresAt.toISOString(),
            description,
            icon
        };

        await playerStore.update(data => ({
            ...data,
            debuffs: [...(data.debuffs || []), debuff]
        }));

        return debuff;
    }

    // Clean up expired buffs and debuffs
    private async cleanupExpired(): Promise<void> {
        const now = new Date();

        await playerStore.update(data => {
            const activeBuffs = (data.buffs || []).filter(buff => {
                if (!buff.expiresAt) return true;
                return new Date(buff.expiresAt) > now;
            });

            const activeDebuffs = (data.debuffs || []).filter(debuff => {
                if (!debuff.expiresAt) return true;
                return new Date(debuff.expiresAt) > now;
            });

            return {
                ...data,
                buffs: activeBuffs,
                debuffs: activeDebuffs
            };
        });
    }

    // Start cleanup timer (runs every minute)
    private startCleanupTimer(): void {
        setInterval(() => {
            this.cleanupExpired();
        }, 60 * 1000); // Every minute
    }

    // Apply automatic debuffs based on player state
    async applyAutomaticDebuffs(): Promise<void> {
        const player = await playerStore.get();
        if (!player || !player.stats) return;

        const stats = player.stats;

        // Apply tired debuff if energy is very low
        if (stats.energy !== undefined && stats.energy < 15) {
            await this.addDebuff('tired', 30);
        }

        // Apply stressed debuff if focus is very low
        if (stats.focus !== undefined && stats.focus < 20) {
            await this.addDebuff('stressed', 45);
        }

        // Apply burnout debuff if both energy and focus are critically low
        if (stats.energy !== undefined && stats.focus !== undefined &&
            stats.energy < 10 && stats.focus < 15) {
            await this.addDebuff('burnout', 90);
        }
    }
}

export const buffService = BuffService.getInstance();
