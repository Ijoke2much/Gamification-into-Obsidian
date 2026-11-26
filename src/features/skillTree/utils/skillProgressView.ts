import type { SkillMetadata } from '../../../shared/utils/skillDiscovery';

/** Props shape expected by SkillProgressVisual / MobileSkillTree skill rows */
export function skillToProgressView(skill: SkillMetadata) {
    const level = skill.level ?? 1;
    const currentCP = Math.max(0, Number(skill.cp ?? 0));
    const requiredFromMeta = skill.maxCP;
    const requiredCP =
        requiredFromMeta !== undefined &&
        requiredFromMeta !== null &&
        Number(requiredFromMeta) > 0
            ? Number(requiredFromMeta)
            : Math.max(1, level * 100);
    const totalCP = Math.max(0, Number(skill.totalCP ?? skill.cp ?? 0));
    const isMastered = skill.mastered === true;
    const progressToNext = isMastered
        ? 100
        : requiredCP > 0
          ? Math.min(100, (currentCP / requiredCP) * 100)
          : 0;

    return {
        name: skill.name,
        currentLevel: level,
        currentCP,
        requiredCP,
        totalCP,
        isUnlocked: true,
        isMastered,
        progressToNext,
        class: skill.class,
        description: skill.description
    };
}
