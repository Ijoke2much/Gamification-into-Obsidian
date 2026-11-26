export type Difficulty = 'easy' | 'medium' | 'hard';

export interface EnergyRestoreConfig {
    energy: number;
    focus: number;
    motivation: number;
    calm?: number;
    stressReduce?: number;
}

export interface QuestEnergyCostConfig {
    mental: number;
    physical: number;
    emotional: number;
}

export interface RuntimeConfig {
    enableEnergyHUD: boolean;
    dailyResetHour: number; // 0-23
    dailyRestore: EnergyRestoreConfig; // applied at daily reset
    questEnergyCostByDifficulty: Record<Difficulty, QuestEnergyCostConfig>;
    pomodoroCostPerMinute: QuestEnergyCostConfig; // cost per minute of work
    breakRecovery: Record<'rest' | 'walk' | 'meditation' | 'yoga', EnergyRestoreConfig>;
}

export const runtimeConfig: RuntimeConfig = {
    enableEnergyHUD: true,
    dailyResetHour: 6,
    dailyRestore: {
        energy: 30,
        focus: 20,
        motivation: 25,
        calm: 15,
        stressReduce: 10,
    },
    questEnergyCostByDifficulty: {
        easy: { mental: 5, physical: 2, emotional: 2 },
        medium: { mental: 10, physical: 5, emotional: 5 },
        hard: { mental: 15, physical: 10, emotional: 8 },
    },
    pomodoroCostPerMinute: {
        mental: 3,
        physical: 1,
        emotional: 0.5 as unknown as number, // will be rounded when applied
    },
    breakRecovery: {
        rest: { energy: 20, focus: 15, motivation: 10 },
        walk: { energy: 25, focus: 20, motivation: 15 },
        meditation: { energy: 10, focus: 30, motivation: 20 },
        yoga: { energy: 30, focus: 25, motivation: 25 },
    },
};

export function updateConfig(partial: Partial<RuntimeConfig>) {
    Object.assign(runtimeConfig, partial);
}


