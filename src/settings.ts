export interface GamificationPluginSettings {
  xpPerTask: number;
  coinPerTask: number;
  levelingFormula: string;
  shopkeeperImagePath: string; // Path or URL to the shopkeeper image
  avatarFolder: string; // Folder for avatar images
  inventoryFilePath: string; // Path to the inventory file
  masterClassFolder: string; // Folder for master class files
  classFolder: string; // Folder for class files
  skillFolder: string; // Folder for skill files
  statFolder: string; // Folder for stat files
}

export const DEFAULT_SETTINGS: GamificationPluginSettings = {
  xpPerTask: 10,
  coinPerTask: 5,
  levelingFormula: "linear",
  shopkeeperImagePath: "assets/shopkeeper.jpg", // Default image path
  avatarFolder: 'assets/',
  inventoryFilePath: 'Inventory.md', // Default inventory file path
  masterClassFolder: 'SkillTree/Master-Class',
  classFolder: 'SkillTree/Master-Class/Class',
  skillFolder: 'SkillTree/Master-Class/Class/Skills',
  statFolder: 'SkillTree/Master-Class/Class/Stat',
}; 