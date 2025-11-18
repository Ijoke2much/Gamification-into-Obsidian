import React, { useState, useEffect } from 'react';
import {
    CraftingRecipe,
    CraftingSession,
    CraftingMaterial,
    CraftingSkill,
    CraftingStation,
    RecipeFragment,
    RandomItemTemplate
} from '../types/CraftingTypes';
import { CraftingEngine } from '../utils/craftingEngine';
import { RandomItemGenerator } from '../utils/randomItemGenerator';
import { PlayerData } from '../../../data/models/PlayerData';
import GamifiedObsidianPlugin from '../../../core/main';
import { useMobileOptimizations } from '../../../shared/hooks/useMobileOptimizations';
import styles from './CraftingTab.module.css';

interface CraftingTabProps {
    plugin: GamifiedObsidianPlugin;
    playerData: PlayerData | null;
    reloadPlayerData: () => Promise<void>;
}

export const CraftingTab: React.FC<CraftingTabProps> = ({ plugin, playerData, reloadPlayerData }) => {
    const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
    const [activeTab, setActiveTab] = useState<'crafting' | 'skills' | 'discovery' | 'random'>('crafting');
    const [playerMaterials, setPlayerMaterials] = useState<CraftingMaterial[]>([]);
    const [craftingSkill, setCraftingSkill] = useState<CraftingSkill | null>(null);
    const [craftingStations, setCraftingStations] = useState<CraftingStation[]>([]);
    const [recipeFragments, setRecipeFragments] = useState<RecipeFragment[]>([]);
    const [activeSessions, setActiveSessions] = useState<CraftingSession[]>([]);
    const [availableTemplates, setAvailableTemplates] = useState<RandomItemTemplate[]>([]);
    const [craftableTemplates, setCraftableTemplates] = useState<RandomItemTemplate[]>([]);
    
    // Mobile optimizations
    const { isMobile, mobileClasses } = useMobileOptimizations();
    
    // Create mobile-friendly click handler
    const createClickHandler = (callback: () => void) => {
        return (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            callback();
        };
    };

    useEffect(() => {
        const recipes = CraftingEngine.getDefaultRecipes();
        const sessions = CraftingEngine.getCraftingSessions();
        const skill = playerData ? CraftingEngine.getPlayerCraftingSkill(playerData) : null;
        const stations = CraftingEngine.getCraftingStations();
        const fragments = CraftingEngine.getRecipeFragments();
        
        setRecipes(recipes);
        setActiveSessions(sessions.filter(s => s.status === 'active'));
        setCraftingSkill(skill);
        setCraftingStations(stations);
        setRecipeFragments(fragments);
        
        // Load player materials from inventory
        const loadMaterials = async () => {
            try {
                const materials = await CraftingEngine.getPlayerMaterialsFromInventory(plugin.app);
                setPlayerMaterials(materials);
            } catch (error) {
                console.error('Error loading materials:', error);
            }
        };
        loadMaterials();
        
        // Load random item templates
        if (playerData) {
            const templates = RandomItemGenerator.getAvailableTemplates(playerData.level);
            setAvailableTemplates(templates);
            
            // Load craftable templates
            const loadCraftableTemplates = async () => {
                try {
                    const craftable = await RandomItemGenerator.getCraftableTemplates(plugin.app, playerData.level);
                    setCraftableTemplates(craftable);
                } catch (error) {
                    console.error('Error loading craftable templates:', error);
                }
            };
            loadCraftableTemplates();
        }
    }, [playerData, plugin.app]);

    const startCrafting = async (recipe: CraftingRecipe) => {
        if (!playerData) return;
        
        try {
            const result = await CraftingEngine.craftItemWithInventory(plugin.app, recipe, playerData);
            if (result) {
                // Reload materials after crafting
                const materials = await CraftingEngine.getPlayerMaterialsFromInventory(plugin.app);
                setPlayerMaterials(materials);
                
                // Reload player data
                if (reloadPlayerData) {
                    reloadPlayerData();
                }
            }
        } catch (error) {
            console.error('Error crafting item:', error);
        }
    };

    const generateRandomItem = async () => {
        if (!playerData) return;
        
        try {
            const result = await RandomItemGenerator.generateRandomItem(plugin.app, playerData.level);
            if (result) {
                // Reload materials after generation
                const materials = await CraftingEngine.getPlayerMaterialsFromInventory(plugin.app);
                setPlayerMaterials(materials);
                
                // Reload craftable templates
                const craftable = await RandomItemGenerator.getCraftableTemplates(plugin.app, playerData.level);
                setCraftableTemplates(craftable);
                
                // Reload player data
                if (reloadPlayerData) {
                    reloadPlayerData();
                }
            }
        } catch (error) {
            console.error('Error generating random item:', error);
        }
    };

    if (!playerData) {
        return <div>Loading player data...</div>;
    }

    return (
        <div className={`${styles.craftingContainer} ${isMobile ? mobileClasses.container : ''}`}>
            <h2 className={styles.craftingHeader}>⚒️ Crafting Workshop</h2>
            
            {/* Tab Navigation */}
            <div className={styles.tabNavigation}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'crafting' ? styles.activeTab : ''} ${isMobile ? mobileClasses.button : ''}`}
                    onClick={createClickHandler(() => setActiveTab('crafting'))}
                >
                    <div className={styles.tabButtonContent}>
                        <span className={styles.tabIcon}>⚒️</span>
                        <span className={styles.tabLabel}>Crafting</span>
                    </div>
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'skills' ? styles.activeTab : ''} ${isMobile ? mobileClasses.button : ''}`}
                    onClick={createClickHandler(() => setActiveTab('skills'))}
                >
                    <div className={styles.tabButtonContent}>
                        <span className={styles.tabIcon}>🎯</span>
                        <span className={styles.tabLabel}>Skills</span>
                    </div>
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'discovery' ? styles.activeTab : ''} ${isMobile ? mobileClasses.button : ''}`}
                    onClick={createClickHandler(() => setActiveTab('discovery'))}
                >
                    <div className={styles.tabButtonContent}>
                        <span className={styles.tabIcon}>🔍</span>
                        <span className={styles.tabLabel}>Discovery</span>
                    </div>
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'random' ? styles.activeTab : ''} ${isMobile ? mobileClasses.button : ''}`}
                    onClick={createClickHandler(() => setActiveTab('random'))}
                >
                    <div className={styles.tabButtonContent}>
                        <span className={styles.tabIcon}>🎲</span>
                        <span className={styles.tabLabel}>Random</span>
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {activeTab === 'crafting' && (
                    <div className={styles.craftingTab}>
                        {/* Materials Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>📦 Your Materials</h3>
                            <div className={styles.materialsGrid}>
                                {playerMaterials.length > 0 ? (
                                    playerMaterials.map((material, index) => (
                                        <div key={index} className={styles.materialCard}>
                                            <div className={styles.materialIcon}>{material.icon}</div>
                                            <div className={styles.materialInfo}>
                                                <div className={styles.materialName}>{material.name}</div>
                                                <div className={styles.materialQuality}>
                                                    Quality: {material.quality}
                                                </div>
                                                <div className={styles.materialRarity}>
                                                    Rarity: {material.rarity}
                                                </div>
                                                <div className={styles.materialValue}>Value: {material.baseValue} boogers</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.noMaterials}>
                                        No materials yet! Complete quests, build habits, and use pomodoros to earn materials.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Recipes Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>📖 Crafting Recipes</h3>
                            <div className={styles.recipesGrid}>
                                {recipes.map((recipe, index) => (
                                    <div key={index} className={styles.recipeCard}>
                                        <div className={styles.recipeHeader}>
                                            <div className={styles.recipeName}>{recipe.name}</div>
                                            <div className={styles.recipeCategory}>{recipe.category}</div>
                                            <div className={styles.recipeDifficulty}>
                                                Difficulty: {recipe.difficulty}
                                            </div>
                                            <div className={styles.recipeSkill}>
                                                Skill: {recipe.skillRequired} Lv.{recipe.requiredLevel}
                                            </div>
                                        </div>
                                        <div className={styles.recipeDescription}>
                                            {recipe.description}
                                        </div>
                                        <div className={styles.recipeMaterials}>
                                            <div className={styles.materialsLabel}>Materials Required:</div>
                                            <div className={styles.materialsList}>
                                                {recipe.materials.map((mat, matIndex) => {
                                                    const hasMaterial = playerMaterials.some(
                                                        pm => pm.id === mat.materialId && pm.quality === mat.qualityRequired
                                                    );
                                                    return (
                                                        <div key={matIndex} className={`${styles.materialRequirement} ${hasMaterial ? styles.hasMaterial : styles.missingMaterial}`}>
                                                            {mat.quantity}x {mat.materialId} ({mat.qualityRequired} quality)
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className={styles.recipeRewards}>
                                            <div>XP: {recipe.skillXp}</div>
                                            <div>Time: {recipe.craftingTime}s</div>
                                        </div>
                                        <button
                                            className={`${styles.craftButton} ${isMobile ? mobileClasses.button : ''}`}
                                            onClick={createClickHandler(() => startCrafting(recipe))}
                                            disabled={!CraftingEngine.canCraftRecipe(recipe, playerMaterials, playerData).canCraft}
                                        >
                                            {CraftingEngine.canCraftRecipe(recipe, playerMaterials, playerData).canCraft ? '⚒️ Craft' : '🔒 Locked'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Crafting Sessions */}
                        {activeSessions.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>⏳ Active Crafting</h3>
                                <div className={styles.activeSessions}>
                                    {activeSessions.map((session, index) => (
                                        <div key={index} className={styles.sessionCard}>
                                            <div className={styles.sessionInfo}>
                                                <div className={styles.sessionName}>Crafted Item</div>
                                                <div className={styles.sessionTime}>Crafted successfully!</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'skills' && (
                    <div className={styles.skillsTab}>
                        {craftingSkill && (
                            <div className={styles.section}>
                                <h3>📊 Crafting Skills</h3>
                                <div className={styles.skillCard}>
                                    <div className={styles.skillHeader}>
                                        <div className={styles.skillIcon}>⚒️</div>
                                        <div className={styles.skillInfo}>
                                            <div className={styles.skillLevel}>Level {craftingSkill.level}</div>
                                            <div className={styles.skillMastery}>Mastery: {craftingSkill.mastery}%</div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.skillProgress}>
                                        <div className={styles.progressBar}>
                                            <div 
                                                className={styles.progressFill}
                                                style={{ width: `${(craftingSkill.experience / craftingSkill.experienceToNext) * 100}%` }}
                                            />
                                        </div>
                                        <span>{craftingSkill.experience} / {craftingSkill.experienceToNext} XP</span>
                                    </div>
                                    
                                    <div className={styles.skillSpecialties}>
                                        <div className={styles.specialtiesLabel}>Specialties:</div>
                                        <div className={styles.specialtiesList}>
                                            {craftingSkill.specialties.length > 0 ? (
                                                craftingSkill.specialties.map(specialty => (
                                                    <div key={specialty} className={styles.specialty}>
                                                        {specialty}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={styles.noSpecialties}>No specialties yet</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.section}>
                            <h3>🏗️ Crafting Stations</h3>
                            <div className={styles.stationsGrid}>
                                {craftingStations.map(station => (
                                    <div key={station.id} className={styles.stationCard}>
                                        <div className={styles.stationHeader}>
                                            <div className={styles.stationIcon}>{station.icon}</div>
                                            <div className={styles.stationInfo}>
                                                <div className={styles.stationName}>{station.name}</div>
                                                <div className={styles.stationType}>{station.type}</div>
                                                <div className={styles.stationLevel}>Level {station.level}</div>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.stationDescription}>
                                            {station.description}
                                        </div>
                                        
                                        <div className={styles.stationBonuses}>
                                            <div className={styles.bonusesLabel}>Bonuses:</div>
                                            <div className={styles.bonusesList}>
                                                <div>Success: +{station.bonuses.successRate}%</div>
                                                <div>Quality: +{station.bonuses.qualityChance}%</div>
                                                <div>Critical: +{station.bonuses.criticalChance}%</div>
                                                <div>Time: -{station.bonuses.timeReduction}%</div>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.stationStatus}>
                                            {station.unlocked ? (
                                                <span className={styles.unlocked}>✅ Unlocked</span>
                                            ) : (
                                                <span className={styles.locked}>🔒 Locked</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'discovery' && (
                    <div className={styles.discoveryTab}>
                        <div className={styles.section}>
                            <h3>🔍 Recipe Discovery</h3>
                            <div className={styles.fragmentsGrid}>
                                {recipeFragments.map(fragment => (
                                    <div key={fragment.id} className={styles.fragmentCard}>
                                        <div className={styles.fragmentHeader}>
                                            <div className={styles.fragmentIcon}>{fragment.icon}</div>
                                            <div className={styles.fragmentInfo}>
                                                <div className={styles.fragmentName}>{fragment.name}</div>
                                                <div className={styles.fragmentProgress}>
                                                    {fragment.fragmentNumber} / {fragment.totalFragments}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.fragmentDescription}>
                                            {fragment.description}
                                        </div>
                                        
                                        <div className={styles.fragmentLocation}>
                                            <span>Location: {fragment.location}</span>
                                            <span className={styles.fragmentRarity}>
                                                {fragment.rarity}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'random' && (
                    <div className={styles.randomTab}>
                        <div className={styles.section}>
                            <h3>🎲 Random Item Generation</h3>
                            <p className={styles.randomDescription}>
                                Combine your materials to create unique items with random effects! 
                                These items can provide real-world activity boosts, in-game buffs, or special crafting bonuses.
                            </p>
                            
                            <div className={styles.randomGenerationPanel}>
                                <button
                                    className={`${styles.generateButton} ${isMobile ? mobileClasses.button : ''}`}
                                    onClick={createClickHandler(generateRandomItem)}
                                    disabled={!playerData || craftableTemplates.length === 0}
                                >
                                    ✨ Generate Random Item
                                </button>
                                
                                {craftableTemplates.length === 0 && (
                                    <p className={styles.noTemplatesMessage}>
                                        No items can be generated with your current materials. Gather more materials to unlock random generation!
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <h3>📋 Available Items (Level {playerData?.level || 1})</h3>
                            <div className={styles.templatesGrid}>
                                {availableTemplates.map(template => {
                                    const canCraft = craftableTemplates.some(ct => ct.id === template.id);
                                    return (
                                        <div key={template.id} className={`${styles.templateCard} ${canCraft ? styles.craftable : styles.notCraftable}`}>
                                            <div className={styles.templateHeader}>
                                                <div className={styles.templateIcon}>{template.icon}</div>
                                                <div className={styles.templateInfo}>
                                                    <div className={styles.templateName}>{template.name}</div>
                                                    <div className={styles.templateRarity}>{template.rarity}</div>
                                                    <div className={styles.templateCategory}>{template.category}</div>
                                                </div>
                                            </div>
                                            
                                            <div className={styles.templateDescription}>
                                                {template.description}
                                            </div>
                                            
                                            <div className={styles.templateRequirements}>
                                                <div className={styles.requirementsLabel}>Materials Required:</div>
                                                <div className={styles.requirementsList}>
                                                    <div>{template.materialRequirements.quantity}x materials from: {template.materialRequirements.categories.join(', ')}</div>
                                                    <div>Min. Rarity: {template.materialRequirements.minRarity}</div>
                                                </div>
                                            </div>
                                            
                                            <div className={styles.templateEffects}>
                                                <div className={styles.effectsLabel}>Possible Effects:</div>
                                                <div className={styles.effectsList}>
                                                    {template.possibleEffects.map((effect, index) => (
                                                        <div key={index} className={styles.effect}>
                                                            • {effect.description}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className={styles.templateStatus}>
                                                {canCraft ? (
                                                    <span className={styles.craftableStatus}>✅ Can Generate</span>
                                                ) : (
                                                    <span className={styles.lockedStatus}>🔒 Need Materials</span>
                                                )}
                                            </div>
                                            
                                            {template.unlockLevel && template.unlockLevel > (playerData?.level || 1) && (
                                                <div className={styles.levelRequirement}>
                                                    Requires Level {template.unlockLevel}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <h3>💡 How Random Generation Works</h3>
                            <div className={styles.randomInfoPanel}>
                                <div className={styles.infoCard}>
                                    <h4>🔍 Material Categories</h4>
                                    <p>Different material types create different kinds of items:</p>
                                    <ul>
                                        <li><strong>Crystal/Mineral:</strong> Focus and productivity items</li>
                                        <li><strong>Herb/Organic:</strong> Energy and health boosters</li>
                                        <li><strong>Essence/Mystical:</strong> Learning and creative enhancement</li>
                                        <li><strong>Mixed categories:</strong> Unique combinations with special effects</li>
                                    </ul>
                                </div>
                                
                                <div className={styles.infoCard}>
                                    <h4>⚡ Effect Types</h4>
                                    <ul>
                                        <li><strong>Real-world Activities:</strong> Meditation, exercise, study sessions</li>
                                        <li><strong>Game Buffs:</strong> XP multipliers, coin bonuses, reward boosts</li>
                                        <li><strong>Crafting Bonuses:</strong> Success rate increases, material efficiency</li>
                                        <li><strong>Currency/XP:</strong> Direct rewards for immediate benefit</li>
                                    </ul>
                                </div>
                                
                                <div className={styles.infoCard}>
                                    <h4>🎯 Tips</h4>
                                    <ul>
                                        <li>Higher rarity materials create more powerful items</li>
                                        <li>Level up to unlock legendary item generation</li>
                                        <li>Mix different material categories for varied effects</li>
                                        <li>Generated items appear in your inventory for immediate use</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
