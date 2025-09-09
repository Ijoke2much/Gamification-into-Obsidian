import React, { useState, useEffect } from 'react';
import { equipmentCraftingSystem, CraftingRecipe, CraftingStats, CraftingResult } from '../../quests/systems/equipmentCraftingSystem';
import { Notice } from 'obsidian';
import styles from './CraftingTab.module.css';

interface CraftingTabProps {
    onCraftingComplete?: (result: CraftingResult) => void;
}

export const CraftingTab: React.FC<CraftingTabProps> = ({ onCraftingComplete }) => {
    const [unlockedRecipes, setUnlockedRecipes] = useState<CraftingRecipe[]>([]);
    const [craftingStats, setCraftingStats] = useState<CraftingStats | null>(null);
    const [playerMaterials, setPlayerMaterials] = useState<Map<string, number>>(new Map());
    const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
    const [craftingQuantity, setCraftingQuantity] = useState<number>(1);
    const [isCrafting, setIsCrafting] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        loadCraftingData();
    }, []);

    const loadCraftingData = () => {
        const recipes = equipmentCraftingSystem.getUnlockedRecipes();
        const stats = equipmentCraftingSystem.getCraftingStats();
        const materials = equipmentCraftingSystem.getPlayerMaterials();

        setUnlockedRecipes(recipes);
        setCraftingStats(stats);
        setPlayerMaterials(materials);
    };

    const getCategories = (): string[] => {
        const categories = new Set<string>();
        unlockedRecipes.forEach(recipe => categories.add(recipe.category));
        return ['all', ...Array.from(categories)];
    };

    const getFilteredRecipes = (): CraftingRecipe[] => {
        if (selectedCategory === 'all') {
            return unlockedRecipes;
        }
        return unlockedRecipes.filter(recipe => recipe.category === selectedCategory);
    };

    const getRarityColor = (rarity: string): string => {
        switch (rarity) {
            case 'common': return '#64748b';
            case 'uncommon': return '#10b981';
            case 'rare': return '#3b82f6';
            case 'epic': return '#8b5cf6';
            case 'legendary': return '#ffd700';
            default: return '#64748b';
        }
    };

    const getCategoryIcon = (category: string): string => {
        switch (category) {
            case 'productivity-tools': return '⚔️';
            case 'focus-equipment': return '🎯';
            case 'workspace-equipment': return '🏠';
            case 'digital-tools': return '💻';
            case 'consumables': return '🧪';
            case 'legendary-equipment': return '👑';
            default: return '📦';
        }
    };

    const canCraft = (recipe: CraftingRecipe, quantity: number): { canCraft: boolean; missingItems: string[] } => {
        const result = equipmentCraftingSystem.canCraftItem(recipe.id, quantity);
        return {
            canCraft: result.canCraft,
            missingItems: result.missingMaterials
        };
    };

    const handleCraft = async (recipe: CraftingRecipe) => {
        if (isCrafting) return;

        setIsCrafting(true);
        try {
            const result = await equipmentCraftingSystem.craftItem(recipe.id, craftingQuantity);
            
            if (result.success) {
                loadCraftingData(); // Refresh data
                onCraftingComplete?.(result);
            }

            // Show detailed result
            console.log('Crafting result:', result);
        } catch (error) {
            console.error('Crafting error:', error);
            new Notice(`❌ Crafting failed: ${error}`, 5000);
        } finally {
            setIsCrafting(false);
        }
    };

    const getPlayerMaterialCount = (materialId: string): number => {
        return playerMaterials.get(materialId) || 0;
    };

    const renderCraftingHeader = () => {
        if (!craftingStats) return null;

        const progressPercentage = craftingStats.experienceToNext > 0 
            ? (craftingStats.experience / (craftingStats.experience + craftingStats.experienceToNext)) * 100 
            : 100;

        return (
            <div className={styles.craftingHeader}>
                <div className={styles.craftingLevel}>
                    <div className={styles.levelBadge}>
                        🔨 Level {craftingStats.level}
                    </div>
                    <div className={styles.experienceBar}>
                        <div className={styles.experienceBarFill} style={{ width: `${progressPercentage}%` }} />
                        <div className={styles.experienceText}>
                            {craftingStats.experience} / {craftingStats.experience + craftingStats.experienceToNext} XP
                        </div>
                    </div>
                </div>
                
                <div className={styles.craftingStats}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{craftingStats.unlockedRecipes}</span>
                        <span className={styles.statLabel}>Recipes</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{Math.round(craftingStats.unlockProgress * 100)}%</span>
                        <span className={styles.statLabel}>Progress</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{craftingStats.activeBonuses.length}</span>
                        <span className={styles.statLabel}>Bonuses</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderCategoryFilters = () => {
        const categories = getCategories();

        return (
            <div className={styles.categoryFilters}>
                {categories.map(category => (
                    <button
                        key={category}
                        className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
                    </button>
                ))}
            </div>
        );
    };

    const renderRecipeCard = (recipe: CraftingRecipe) => {
        const { canCraft: canCraftRecipe, missingItems } = canCraft(recipe, craftingQuantity);
        
        return (
            <div
                key={recipe.id}
                className={`${styles.recipeCard} ${selectedRecipe?.id === recipe.id ? styles.selected : ''}`}
                style={{ borderColor: getRarityColor(recipe.rarity) }}
                onClick={() => setSelectedRecipe(recipe)}
            >
                <div className={styles.recipeHeader}>
                    <div className={styles.recipeIcon}>
                        {getCategoryIcon(recipe.category)}
                    </div>
                    <div 
                        className={styles.recipeRarity}
                        style={{ color: getRarityColor(recipe.rarity) }}
                    >
                        {recipe.rarity.toUpperCase()}
                    </div>
                </div>

                <div className={styles.recipeContent}>
                    <h4 className={styles.recipeName}>{recipe.name}</h4>
                    <p className={styles.recipeDescription}>{recipe.description}</p>
                    
                    <div className={styles.recipeRequirements}>
                        <div className={styles.requirementSection}>
                            <div className={styles.requirementTitle}>Materials:</div>
                            <div className={styles.materialsList}>
                                {Object.entries(recipe.materials).map(([material, required]) => {
                                    const available = getPlayerMaterialCount(material);
                                    const hasEnough = available >= required * craftingQuantity;
                                    
                                    return (
                                        <div
                                            key={material}
                                            className={`${styles.materialItem} ${hasEnough ? styles.available : styles.missing}`}
                                        >
                                            <span className={styles.materialName}>
                                                {material.replace(/-/g, ' ')}
                                            </span>
                                            <span className={styles.materialCount}>
                                                {available}/{required * craftingQuantity}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={styles.requirementSection}>
                            <div className={styles.requirementTitle}>Other:</div>
                            <div className={styles.otherRequirements}>
                                <div className={styles.requirementItem}>
                                    💰 {recipe.coins * craftingQuantity} coins
                                </div>
                                <div className={styles.requirementItem}>
                                    🔨 Level {recipe.craftingLevel}
                                </div>
                                <div className={styles.requirementItem}>
                                    ⏱️ {recipe.craftingTime}s
                                </div>
                                <div className={styles.requirementItem}>
                                    🎯 {Math.round(recipe.successRate * 100)}% success
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.recipeFooter}>
                    <div className={styles.experienceReward}>
                        +{recipe.experience * craftingQuantity} XP
                    </div>
                    <div className={`${styles.craftingStatus} ${canCraftRecipe ? styles.canCraft : styles.cannotCraft}`}>
                        {canCraftRecipe ? '✅ Can Craft' : '❌ Missing Requirements'}
                    </div>
                </div>

                {!canCraftRecipe && missingItems.length > 0 && (
                    <div className={styles.missingItemsTooltip}>
                        <div className={styles.tooltipTitle}>Missing:</div>
                        {missingItems.map((item, index) => (
                            <div key={index} className={styles.tooltipItem}>{item}</div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderCraftingPanel = () => {
        if (!selectedRecipe) {
            return (
                <div className={styles.noCraftingSelection}>
                    <div className={styles.selectionIcon}>🔨</div>
                    <div className={styles.selectionTitle}>Select a Recipe</div>
                    <div className={styles.selectionDescription}>
                        Choose a recipe from the list to start crafting productivity equipment
                    </div>
                </div>
            );
        }

        const { canCraft: canCraftRecipe, missingItems } = canCraft(selectedRecipe, craftingQuantity);
        const maxQuantity = craftingStats?.activeBonuses.some(b => b.type === 'bulk_crafting') ? 10 : 1;

        return (
            <div className={styles.craftingPanel}>
                <div className={styles.selectedRecipe}>
                    <div className={styles.selectedRecipeHeader}>
                        <h3 className={styles.selectedRecipeName}>{selectedRecipe.name}</h3>
                        <div 
                            className={styles.selectedRecipeRarity}
                            style={{ color: getRarityColor(selectedRecipe.rarity) }}
                        >
                            {selectedRecipe.rarity.toUpperCase()}
                        </div>
                    </div>
                    
                    <p className={styles.selectedRecipeDescription}>{selectedRecipe.description}</p>
                </div>

                <div className={styles.quantitySelector}>
                    <label className={styles.quantityLabel}>Quantity:</label>
                    <div className={styles.quantityControls}>
                        <button
                            className={styles.quantityButton}
                            onClick={() => setCraftingQuantity(Math.max(1, craftingQuantity - 1))}
                            disabled={craftingQuantity <= 1}
                        >
                            -
                        </button>
                        <span className={styles.quantityValue}>{craftingQuantity}</span>
                        <button
                            className={styles.quantityButton}
                            onClick={() => setCraftingQuantity(Math.min(maxQuantity, craftingQuantity + 1))}
                            disabled={craftingQuantity >= maxQuantity}
                        >
                            +
                        </button>
                    </div>
                    {maxQuantity > 1 && (
                        <div className={styles.bulkCraftingNote}>
                            💡 Bulk crafting unlocked! (Max: {maxQuantity})
                        </div>
                    )}
                </div>

                <div className={styles.craftingActions}>
                    <button
                        className={`${styles.craftButton} ${canCraftRecipe ? styles.enabled : styles.disabled}`}
                        onClick={() => handleCraft(selectedRecipe)}
                        disabled={!canCraftRecipe || isCrafting}
                    >
                        {isCrafting ? (
                            <>🔄 Crafting...</>
                        ) : (
                            <>🔨 Craft {craftingQuantity}x {selectedRecipe.name}</>
                        )}
                    </button>

                    {!canCraftRecipe && (
                        <div className={styles.craftingErrors}>
                            <div className={styles.errorTitle}>Cannot craft:</div>
                            {missingItems.map((item, index) => (
                                <div key={index} className={styles.errorItem}>• {item}</div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.craftingPreview}>
                    <div className={styles.previewTitle}>Crafting Preview:</div>
                    <div className={styles.previewStats}>
                        <div className={styles.previewStat}>
                            <span className={styles.previewLabel}>Total Cost:</span>
                            <span className={styles.previewValue}>{selectedRecipe.coins * craftingQuantity} coins</span>
                        </div>
                        <div className={styles.previewStat}>
                            <span className={styles.previewLabel}>Total XP:</span>
                            <span className={styles.previewValue}>{selectedRecipe.experience * craftingQuantity} XP</span>
                        </div>
                        <div className={styles.previewStat}>
                            <span className={styles.previewLabel}>Success Rate:</span>
                            <span className={styles.previewValue}>{Math.round(selectedRecipe.successRate * 100)}%</span>
                        </div>
                        <div className={styles.previewStat}>
                            <span className={styles.previewLabel}>Total Time:</span>
                            <span className={styles.previewValue}>{selectedRecipe.craftingTime * craftingQuantity}s</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderActiveBonuses = () => {
        if (!craftingStats || craftingStats.activeBonuses.length === 0) return null;

        return (
            <div className={styles.activeBonuses}>
                <div className={styles.bonusesTitle}>🌟 Active Bonuses</div>
                <div className={styles.bonusesList}>
                    {craftingStats.activeBonuses.map(bonus => (
                        <div key={bonus.id} className={styles.bonusItem}>
                            <div className={styles.bonusName}>{bonus.name}</div>
                            <div className={styles.bonusDescription}>{bonus.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.craftingTab}>
            {renderCraftingHeader()}
            {renderCategoryFilters()}
            
            <div className={styles.craftingContent}>
                <div className={styles.recipesList}>
                    <div className={styles.recipesHeader}>
                        <h3 className={styles.recipesTitle}>📋 Available Recipes</h3>
                        <div className={styles.recipesCount}>
                            {getFilteredRecipes().length} recipes
                        </div>
                    </div>
                    
                    <div className={styles.recipesGrid}>
                        {getFilteredRecipes().map(renderRecipeCard)}
                    </div>
                    
                    {getFilteredRecipes().length === 0 && (
                        <div className={styles.noRecipes}>
                            <div className={styles.noRecipesIcon}>📜</div>
                            <div className={styles.noRecipesTitle}>No Recipes Available</div>
                            <div className={styles.noRecipesDescription}>
                                Complete quests and level up to unlock more crafting recipes!
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.craftingPanelContainer}>
                    {renderCraftingPanel()}
                    {renderActiveBonuses()}
                </div>
            </div>
        </div>
    );
};
