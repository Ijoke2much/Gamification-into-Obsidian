// Shopkeeper Personality System
// Creates dynamic shopkeeper interactions, dialogue, and special offers

import type GamifiedObsidianPlugin from "../../../core/main";
import { ShopItem } from "./ShopParser";
import { Notice } from "obsidian";

export interface ShopkeeperPersonality {
    name: string;
    personality: 'friendly' | 'grumpy' | 'mysterious' | 'eccentric' | 'greedy' | 'wise';
    mood: number; // 0-100, affects dialogue and prices
    reputation: number; // Player's reputation with this shopkeeper (0-100)
    specialties: string[]; // Categories this shopkeeper excels in
    quirks: string[]; // Special behavioral traits
    dialogueSet: DialogueSet;
    offers: SpecialOffer[];
    backstory: string;
    avatar: string; // Emoji representation
}

export interface DialogueSet {
    greetings: string[];
    farewells: string[];
    compliments: string[];
    complaints: string[];
    negotiations: string[];
    specialOffers: string[];
    mood_high: string[];
    mood_low: string[];
    reputation_high: string[];
    reputation_low: string[];
}

export interface SpecialOffer {
    id: string;
    type: 'discount' | 'bundle' | 'exclusive' | 'reputation' | 'quest_reward';
    title: string;
    description: string;
    conditions: OfferCondition[];
    rewards: OfferReward[];
    expires?: Date;
    usesRemaining?: number;
    isActive: boolean;
}

export interface OfferCondition {
    type: 'reputation' | 'purchases' | 'item_owned' | 'time' | 'quest_complete' | 'mood';
    value: any;
    operator: '>' | '<' | '==' | '>=' | '<=';
}

export interface OfferReward {
    type: 'discount' | 'free_item' | 'exclusive_access' | 'reputation_boost';
    value: any;
    description: string;
}

export interface ShopkeeperInteraction {
    shopkeeperId: string;
    timestamp: Date;
    type: 'purchase' | 'browse' | 'negotiate' | 'chat';
    items?: string[];
    amount?: number;
    reputationChange: number;
    moodChange: number;
}

export class ShopkeeperPersonalityManager {
    private plugin: GamifiedObsidianPlugin;
    private shopkeepers: Map<string, ShopkeeperPersonality> = new Map();
    private currentShopkeeper: string = '';
    private interactionHistory: ShopkeeperInteraction[] = [];

    constructor(plugin: GamifiedObsidianPlugin) {
        this.plugin = plugin;
        this.initializeShopkeepers();
    }

    /**
     * Initialize default shopkeepers
     */
    private initializeShopkeepers(): void {
        const shopkeepers: ShopkeeperPersonality[] = [
            {
                name: "Gareth the Merchant",
                personality: 'friendly',
                mood: 75,
                reputation: 50,
                specialties: ['consumable', 'material'],
                quirks: ['generous_with_regulars', 'loves_small_talk'],
                avatar: '🧙‍♂️',
                backstory: "A seasoned trader who's traveled the known world. He values loyal customers and always has a story to tell.",
                dialogueSet: {
                    greetings: [
                        "Welcome back, friend! What brings you to my shop today?",
                        "Ah, a familiar face! Come, see what treasures I've acquired!",
                        "Good to see you again! Business has been booming lately.",
                        "Welcome! I just got some fresh supplies from the capital."
                    ],
                    farewells: [
                        "Safe travels, and come back soon!",
                        "May fortune smile upon your journeys!",
                        "Take care out there, and remember me to your friends!",
                        "Until next time, may your coin purse stay heavy!"
                    ],
                    compliments: [
                        "You're one of my favorite customers!",
                        "I always enjoy our business together.",
                        "You have excellent taste in merchandise!",
                        "A true connoisseur, I can tell!"
                    ],
                    complaints: [
                        "Business has been slow lately...",
                        "These supply shortages are killing me!",
                        "I wish more customers appreciated quality like you do.",
                        "The roads have been dangerous for my caravans."
                    ],
                    negotiations: [
                        "For you, I might be able to work something out...",
                        "Well, you are a valued customer...",
                        "I suppose I could make an exception this once.",
                        "Your reputation precedes you - let's make a deal!"
                    ],
                    specialOffers: [
                        "I've got something special just for you!",
                        "This item just came in, and I thought of you immediately!",
                        "A loyal customer like yourself deserves the first look!",
                        "I've been saving this for someone who would appreciate it!"
                    ],
                    mood_high: [
                        "I'm in such a good mood today! Everything's on sale!",
                        "Life is wonderful! Business is booming!",
                        "What a fantastic day for trading!"
                    ],
                    mood_low: [
                        "I'm having a rough day... prices might be a bit higher.",
                        "Sorry, not feeling very generous today.",
                        "Been having supply troubles lately..."
                    ],
                    reputation_high: [
                        "My most trusted customer! What can I do for you?",
                        "For you, anything! You've been so good to me.",
                        "I have some exclusive items for my VIP customers!"
                    ],
                    reputation_low: [
                        "I don't know you well enough for special deals.",
                        "Build some trust with me first, then we'll talk discounts.",
                        "Regular prices for regular customers."
                    ]
                },
                offers: []
            },
            {
                name: "Zara the Mystic",
                personality: 'mysterious',
                mood: 60,
                reputation: 30,
                specialties: ['magic', 'rare', 'epic'],
                quirks: ['speaks_in_riddles', 'mood_swings', 'exclusive_items'],
                avatar: '🔮',
                backstory: "A enigmatic figure who deals in rare and magical items. Her prices change with the phases of the moon.",
                dialogueSet: {
                    greetings: [
                        "The threads of fate bring you here...",
                        "I sensed your approach in the crystal ball.",
                        "The stars told me you would come today.",
                        "Welcome, seeker of mysteries."
                    ],
                    farewells: [
                        "May the shadows guide your path.",
                        "The crystal grows dim... until next time.",
                        "Destiny awaits you beyond these walls.",
                        "The mystic energies fade... farewell."
                    ],
                    compliments: [
                        "You have an aura of power about you.",
                        "The spirits speak favorably of you.",
                        "Your magical potential is... interesting.",
                        "The cosmos aligns in your favor."
                    ],
                    complaints: [
                        "The magical energies have been... unstable lately.",
                        "Dark forces interfere with my supply lines.",
                        "The veil between worlds grows thin...",
                        "Disturbing visions cloud my crystal ball."
                    ],
                    negotiations: [
                        "The price is written in the stars... but perhaps they can be moved.",
                        "Magic has its price, but for you... a different arrangement.",
                        "The ancient laws of commerce bend for few...",
                        "Your destiny intertwines with this item's... interesting."
                    ],
                    specialOffers: [
                        "The spirits whisper of a special item for you...",
                        "This artifact chose you, not the other way around.",
                        "A vision showed me you would need this...",
                        "The cosmic forces align for this transaction."
                    ],
                    mood_high: [
                        "The mystical energies surge today! All is possible!",
                        "The stars smile upon us! Blessed transactions await!",
                        "Such positive energy flows through the shop!"
                    ],
                    mood_low: [
                        "Dark shadows cloud my judgment today...",
                        "The magical currents are... turbulent.",
                        "I sense disturbances in the cosmic order..."
                    ],
                    reputation_high: [
                        "A true seeker of wisdom! The ancient texts speak of you.",
                        "The mystical bonds between us grow strong.",
                        "You have proven worthy of the deepest secrets."
                    ],
                    reputation_low: [
                        "The mysteries reveal themselves only to the worthy.",
                        "Trust must be earned through deeds, not words.",
                        "The ancient ways are not for everyone..."
                    ]
                },
                offers: []
            },
            {
                name: "Thorin Ironforge",
                personality: 'grumpy',
                mood: 40,
                reputation: 60,
                specialties: ['equipment', 'weapon', 'armor'],
                quirks: ['quality_obsessed', 'hates_haggling', 'respects_warriors'],
                avatar: '⚒️',
                backstory: "A master craftsman who takes pride in his work. He's gruff but fair, and respects those who understand quality.",
                dialogueSet: {
                    greetings: [
                        "What do ye want? I haven't got all day.",
                        "Aye, what brings ye to my forge?",
                        "Better not be here to waste me time.",
                        "Speak up! What are ye needin'?"
                    ],
                    farewells: [
                        "Get going then, I've got work to do!",
                        "Don't break anything I made for ye!",
                        "Come back when ye need real quality!",
                        "Off with ye! The forge won't tend itself!"
                    ],
                    compliments: [
                        "Ye got a good eye for quality, I'll give ye that.",
                        "Finally, someone who appreciates fine craftsmanship!",
                        "Not many know good steel when they see it.",
                        "Aye, ye understand what real work looks like."
                    ],
                    complaints: [
                        "Nobody appreciates quality anymore!",
                        "These young'uns want everything cheap and fast!",
                        "Supply problems again! Can't get decent ore!",
                        "Everyone's cutting corners these days!"
                    ],
                    negotiations: [
                        "The price is the price! No haggling!",
                        "I don't bargain on quality work!",
                        "Ye want cheap? Go to the amateur down the street!",
                        "Fine craftsmanship has its price!"
                    ],
                    specialOffers: [
                        "I made this special piece... might suit ye.",
                        "Been working on something different...",
                        "Got a commission that fell through... your lucky day.",
                        "This piece has been calling for the right owner."
                    ],
                    mood_high: [
                        "Having a good day in the forge! Everything's turning out perfect!",
                        "The metal's singing today! Good omens for crafting!",
                        "Quality work deserves quality prices!"
                    ],
                    mood_low: [
                        "Ruined three pieces this morning... not my day.",
                        "Apprentices can't do anything right!",
                        "The forge is being temperamental today..."
                    ],
                    reputation_high: [
                        "Ye've proven yourself worthy of me finest work!",
                        "A true warrior deserves true weapons!",
                        "For someone who appreciates quality..."
                    ],
                    reputation_low: [
                        "Prove ye can handle basic gear first.",
                        "Earn yer stripes before asking for the good stuff.",
                        "Show me ye understand quality, then we'll talk."
                    ]
                },
                offers: []
            }
        ];

        for (const shopkeeper of shopkeepers) {
            this.shopkeepers.set(shopkeeper.name, shopkeeper);
            this.generatePersonalityOffers(shopkeeper);
        }

        // Set default shopkeeper
        this.currentShopkeeper = 'Gareth the Merchant';
        console.log(`Initialized ${shopkeepers.length} shopkeepers`);
    }

    /**
     * Get current shopkeeper
     */
    getCurrentShopkeeper(): ShopkeeperPersonality | null {
        return this.shopkeepers.get(this.currentShopkeeper) || null;
    }

    /**
     * Set active shopkeeper
     */
    setCurrentShopkeeper(name: string): void {
        if (this.shopkeepers.has(name)) {
            this.currentShopkeeper = name;
        }
    }

    /**
     * Get shopkeeper dialogue for a situation
     */
    getDialogue(situation: keyof DialogueSet): string {
        const shopkeeper = this.getCurrentShopkeeper();
        if (!shopkeeper) return "Welcome to the shop!";

        const dialogues = shopkeeper.dialogueSet[situation];
        if (!dialogues || dialogues.length === 0) return "...";

        // Choose dialogue based on mood and reputation
        let availableDialogues = [...dialogues];

        // Filter based on mood
        if (shopkeeper.mood > 70) {
            const moodDialogues = shopkeeper.dialogueSet.mood_high;
            if (moodDialogues && moodDialogues.length > 0 && Math.random() < 0.3) {
                availableDialogues = moodDialogues;
            }
        } else if (shopkeeper.mood < 40) {
            const moodDialogues = shopkeeper.dialogueSet.mood_low;
            if (moodDialogues && moodDialogues.length > 0 && Math.random() < 0.3) {
                availableDialogues = moodDialogues;
            }
        }

        // Filter based on reputation
        if (shopkeeper.reputation > 80) {
            const repDialogues = shopkeeper.dialogueSet.reputation_high;
            if (repDialogues && repDialogues.length > 0 && Math.random() < 0.4) {
                availableDialogues = repDialogues;
            }
        } else if (shopkeeper.reputation < 30) {
            const repDialogues = shopkeeper.dialogueSet.reputation_low;
            if (repDialogues && repDialogues.length > 0 && Math.random() < 0.4) {
                availableDialogues = repDialogues;
            }
        }

        return availableDialogues[Math.floor(Math.random() * availableDialogues.length)];
    }

    /**
     * Calculate price modifier based on shopkeeper mood and reputation
     */
    getPriceModifier(): number {
        const shopkeeper = this.getCurrentShopkeeper();
        if (!shopkeeper) return 1.0;

        let modifier = 1.0;

        // Mood affects prices (±20%)
        const moodModifier = (shopkeeper.mood - 50) / 250; // -0.2 to +0.2
        modifier += moodModifier;

        // Reputation affects prices (up to -25% for high rep)
        const reputationModifier = (shopkeeper.reputation - 50) / 200; // -0.25 to +0.25
        modifier -= reputationModifier; // Higher rep = lower prices

        // Personality affects base pricing
        switch (shopkeeper.personality) {
            case 'greedy':
                modifier += 0.15;
                break;
            case 'friendly':
                modifier -= 0.05;
                break;
            case 'mysterious':
                modifier += 0.1;
                break;
            case 'grumpy':
                modifier += 0.05;
                break;
        }

        return Math.max(0.5, Math.min(2.0, modifier)); // Clamp between 50%-200%
    }

    /**
     * Record an interaction with the shopkeeper
     */
    recordInteraction(type: ShopkeeperInteraction['type'], items?: string[], amount?: number): void {
        const shopkeeper = this.getCurrentShopkeeper();
        if (!shopkeeper) return;

        let reputationChange = 0;
        let moodChange = 0;

        switch (type) {
            case 'purchase':
                reputationChange = Math.min(amount || 0, 100) / 20; // Up to +5 for large purchases
                moodChange = 2;
                break;
            case 'browse':
                reputationChange = 0.1;
                moodChange = 0.5;
                break;
            case 'negotiate':
                reputationChange = -0.5;
                moodChange = -1;
                break;
            case 'chat':
                reputationChange = 0.2;
                moodChange = 1;
                break;
        }

        // Apply personality modifiers
        switch (shopkeeper.personality) {
            case 'friendly':
                reputationChange *= 1.5;
                moodChange *= 1.2;
                break;
            case 'grumpy':
                reputationChange *= 0.7;
                moodChange *= 0.8;
                break;
            case 'greedy':
                if (type === 'purchase') reputationChange *= 2;
                break;
            case 'mysterious':
                reputationChange *= 0.8;
                break;
        }

        // Update shopkeeper stats
        shopkeeper.reputation = Math.max(0, Math.min(100, shopkeeper.reputation + reputationChange));
        shopkeeper.mood = Math.max(0, Math.min(100, shopkeeper.mood + moodChange));

        // Record interaction
        const interaction: ShopkeeperInteraction = {
            shopkeeperId: shopkeeper.name,
            timestamp: new Date(),
            type,
            items,
            amount,
            reputationChange,
            moodChange
        };

        this.interactionHistory.push(interaction);

        // Keep only last 100 interactions
        if (this.interactionHistory.length > 100) {
            this.interactionHistory = this.interactionHistory.slice(-100);
        }

        console.log(`Interaction recorded with ${shopkeeper.name}: ${type}, rep: ${shopkeeper.reputation.toFixed(1)}, mood: ${shopkeeper.mood.toFixed(1)}`);
    }

    /**
     * Get available special offers for current shopkeeper
     */
    getAvailableOffers(): SpecialOffer[] {
        const shopkeeper = this.getCurrentShopkeeper();
        if (!shopkeeper) return [];

        return shopkeeper.offers.filter(offer => {
            if (!offer.isActive) return false;
            if (offer.expires && offer.expires < new Date()) return false;
            if (offer.usesRemaining !== undefined && offer.usesRemaining <= 0) return false;

            // Check conditions
            return offer.conditions.every(condition => this.checkOfferCondition(condition, shopkeeper));
        });
    }

    /**
     * Check if an offer condition is met
     */
    private checkOfferCondition(condition: OfferCondition, shopkeeper: ShopkeeperPersonality): boolean {
        switch (condition.type) {
            case 'reputation':
                return this.compareValues(shopkeeper.reputation, condition.operator, condition.value);
            case 'mood':
                return this.compareValues(shopkeeper.mood, condition.operator, condition.value);
            case 'purchases':
                const purchaseCount = this.interactionHistory.filter(i =>
                    i.shopkeeperId === shopkeeper.name && i.type === 'purchase'
                ).length;
                return this.compareValues(purchaseCount, condition.operator, condition.value);
            // Add more condition types as needed
            default:
                return true;
        }
    }

    /**
     * Compare values with operator
     */
    private compareValues(actual: number, operator: OfferCondition['operator'], expected: number): boolean {
        switch (operator) {
            case '>': return actual > expected;
            case '<': return actual < expected;
            case '>=': return actual >= expected;
            case '<=': return actual <= expected;
            case '==': return actual === expected;
            default: return false;
        }
    }

    /**
     * Generate personality-based offers for a shopkeeper
     */
    private generatePersonalityOffers(shopkeeper: ShopkeeperPersonality): void {
        const offers: SpecialOffer[] = [];

        // Reputation-based loyalty discount
        offers.push({
            id: `${shopkeeper.name}_loyalty`,
            type: 'discount',
            title: "Loyal Customer Discount",
            description: "Long-time customers deserve special treatment!",
            conditions: [
                { type: 'reputation', operator: '>=', value: 75 }
            ],
            rewards: [
                { type: 'discount', value: 0.15, description: "15% off all purchases" }
            ],
            isActive: true
        });

        // Mood-based happy merchant bonus
        offers.push({
            id: `${shopkeeper.name}_happy`,
            type: 'discount',
            title: "Happy Merchant Special",
            description: "When I'm in a good mood, everyone benefits!",
            conditions: [
                { type: 'mood', operator: '>=', value: 80 }
            ],
            rewards: [
                { type: 'discount', value: 0.10, description: "10% off when shopkeeper is happy" }
            ],
            isActive: true
        });

        // First-time buyer incentive
        offers.push({
            id: `${shopkeeper.name}_newcomer`,
            type: 'discount',
            title: "Newcomer Welcome",
            description: "First-time customers get a special welcome!",
            conditions: [
                { type: 'purchases', operator: '==', value: 0 }
            ],
            rewards: [
                { type: 'discount', value: 0.20, description: "20% off first purchase" }
            ],
            isActive: true
        });

        // Personality-specific offers
        switch (shopkeeper.personality) {
            case 'friendly':
                offers.push({
                    id: `${shopkeeper.name}_friendship`,
                    type: 'bundle',
                    title: "Friendship Bundle",
                    description: "Friends help friends save money!",
                    conditions: [
                        { type: 'reputation', operator: '>=', value: 50 }
                    ],
                    rewards: [
                        { type: 'discount', value: 0.25, description: "Buy 3 items, get 25% off total" }
                    ],
                    isActive: true
                });
                break;

            case 'grumpy':
                offers.push({
                    id: `${shopkeeper.name}_quality`,
                    type: 'exclusive',
                    title: "Quality Appreciation",
                    description: "For those who understand true craftsmanship.",
                    conditions: [
                        { type: 'reputation', operator: '>=', value: 60 }
                    ],
                    rewards: [
                        { type: 'exclusive_access', value: 'premium_items', description: "Access to premium quality items" }
                    ],
                    isActive: true
                });
                break;

            case 'mysterious':
                offers.push({
                    id: `${shopkeeper.name}_cosmic`,
                    type: 'exclusive',
                    title: "Cosmic Alignment",
                    description: "The stars have aligned for a special opportunity...",
                    conditions: [
                        { type: 'mood', operator: '>=', value: 70 },
                        { type: 'reputation', operator: '>=', value: 40 }
                    ],
                    rewards: [
                        { type: 'exclusive_access', value: 'mystical_items', description: "Access to rare mystical items" }
                    ],
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                    isActive: true
                });
                break;
        }

        shopkeeper.offers = offers;
    }

    /**
     * Apply offer to a purchase
     */
    applyOffer(offerId: string, items: ShopItem[]): { discount: number, message: string } {
        const shopkeeper = this.getCurrentShopkeeper();
        if (!shopkeeper) return { discount: 0, message: '' };

        const offer = shopkeeper.offers.find(o => o.id === offerId);
        if (!offer || !offer.isActive) return { discount: 0, message: '' };

        let totalDiscount = 0;
        let message = '';

        for (const reward of offer.rewards) {
            if (reward.type === 'discount') {
                totalDiscount += reward.value;
                message = `${shopkeeper.avatar} ${shopkeeper.name}: "${offer.description}"`;
            }
        }

        // Update offer usage
        if (offer.usesRemaining !== undefined) {
            offer.usesRemaining--;
            if (offer.usesRemaining <= 0) {
                offer.isActive = false;
            }
        }

        return { discount: totalDiscount, message };
    }

    /**
     * Get shopkeeper status for UI
     */
    getShopkeeperStatus(): { name: string, avatar: string, mood: number, reputation: number, personality: string, currentDialogue: string } {
        const shopkeeper = this.getCurrentShopkeeper();
        if (!shopkeeper) {
            return {
                name: 'Unknown Merchant',
                avatar: '🏪',
                mood: 50,
                reputation: 50,
                personality: 'neutral',
                currentDialogue: 'Welcome to the shop!'
            };
        }

        return {
            name: shopkeeper.name,
            avatar: shopkeeper.avatar,
            mood: shopkeeper.mood,
            reputation: shopkeeper.reputation,
            personality: shopkeeper.personality,
            currentDialogue: this.getDialogue('greetings')
        };
    }

    /**
     * Rotate to next shopkeeper (daily or manual)
     */
    rotateShopkeeper(): void {
        const shopkeeperNames = Array.from(this.shopkeepers.keys());
        const currentIndex = shopkeeperNames.indexOf(this.currentShopkeeper);
        const nextIndex = (currentIndex + 1) % shopkeeperNames.length;

        this.setCurrentShopkeeper(shopkeeperNames[nextIndex]);

        new Notice(`🏪 ${this.getCurrentShopkeeper()?.avatar} ${this.getCurrentShopkeeper()?.name} is now running the shop!`, 4000);
        console.log(`Shopkeeper rotated to: ${this.currentShopkeeper}`);
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        // Save shopkeeper data if needed
        console.log('Shopkeeper personality system cleaned up');
    }
}
