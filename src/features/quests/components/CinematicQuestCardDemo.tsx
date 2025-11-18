import React from "react";
import { CinematicQuestCard } from "./CinematicQuestCard";
import type { Quest } from "../utils/taskParser";

// Demo component to showcase different quest card types
export const CinematicQuestCardDemo: React.FC = () => {
    // Sample quests with different types and themes
    const sampleQuests: Quest[] = [
        {
            id: "1",
            title: "test",
            className: "main-quest",
            stats: ["body builder"],
            description: "heres the description",
            completed: false,
            xp: 565,
            cp: 54,
            coins: 57,
            difficulty: "medium",
            priority: "high",
            skills: ["body builder"],
            subtasks: [
                { text: "task 1", completed: false },
                { text: "task 2", completed: false }
            ],
            isFavorite: false
        },
        {
            id: "2", 
            title: "Debug Authentication System",
            className: "tech-quest",
            stats: ["coding", "programming"],
            description: "Fix the login issues in the user authentication module and implement proper error handling.",
            completed: false,
            xp: 150,
            cp: 75,
            coins: 40,
            difficulty: "hard",
            priority: "high",
            skills: ["coding", "programming"],
            subtasks: [
                { text: "Identify the root cause", completed: true },
                { text: "Write unit tests", completed: false },
                { text: "Implement fix", completed: false },
                { text: "Test thoroughly", completed: false }
            ],
            isFavorite: true
        },
        {
            id: "3",
            title: "Morning Run Challenge", 
            className: "fitness-quest",
            stats: ["fitness", "exercise"],
            description: "Complete a 5K morning run to boost your energy and maintain fitness goals.",
            completed: true,
            xp: 80,
            cp: 40,
            coins: 20,
            difficulty: "medium",
            priority: "low",
            skills: ["fitness", "exercise"],
            subtasks: [
                { text: "Warm up stretches", completed: true },
                { text: "Run 5K distance", completed: true },
                { text: "Cool down walk", completed: true }
            ],
            isFavorite: false
        },
        {
            id: "4",
            title: "Learn React Hooks",
            className: "learning-quest",
            stats: ["learning", "study"],
            description: "Study and practice React hooks to improve your frontend development skills.",
            completed: false,
            xp: 120,
            cp: 60,
            coins: 30,
            difficulty: "medium",
            priority: "medium",
            skills: ["learning", "study"],
            subtasks: [
                { text: "Read documentation", completed: true },
                { text: "Watch tutorial videos", completed: false },
                { text: "Build practice project", completed: false }
            ],
            isFavorite: false
        }
    ];

    const handleEdit = (quest: Quest) => {
        console.log("Edit quest:", quest.title);
    };

    const handleToggleSubtask = (questTitle: string, subtaskIndex: number) => {
        console.log("Toggle subtask:", questTitle, subtaskIndex);
    };

    const handleCompleteQuest = (questTitle: string) => {
        console.log("Complete quest:", questTitle);
    };

    const handleToggleFavorite = (questTitle: string) => {
        console.log("Toggle favorite:", questTitle);
    };

    return (
        <div style={{ 
            padding: "20px", 
            background: "#0a0a0a", 
            minHeight: "100vh",
            maxWidth: "800px",
            margin: "0 auto"
        }}>
            <h1 style={{ 
                color: "#ffffff", 
                textAlign: "center", 
                marginBottom: "30px",
                fontSize: "28px",
                fontWeight: "700"
            }}>
                🎮 Cinematic Quest Cards Demo
            </h1>
            
            <p style={{
                color: "#888",
                textAlign: "center",
                marginBottom: "40px",
                fontSize: "16px",
                lineHeight: "1.5"
            }}>
                Experience the Far Cry-inspired quest interface with different quest types, 
                progress tracking, and mobile-optimized interactions.
            </p>

            {sampleQuests.map((quest) => (
                <CinematicQuestCard
                    key={quest.id}
                    quest={quest}
                    onEdit={handleEdit}
                    onToggleSubtask={handleToggleSubtask}
                    onCompleteQuest={handleCompleteQuest}
                    onToggleFavorite={handleToggleFavorite}
                    collapsed={false}
                />
            ))}

            <div style={{
                marginTop: "40px",
                padding: "20px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
                <h3 style={{ color: "#ffd700", marginBottom: "16px" }}>
                    🎯 Features Demonstrated:
                </h3>
                <ul style={{ color: "#ccc", lineHeight: "1.6" }}>
                    <li>🎨 <strong>Dynamic Theming:</strong> Different visual styles based on quest type</li>
                    <li>📱 <strong>Mobile-First Design:</strong> Touch-friendly interactions and responsive layout</li>
                    <li>📊 <strong>Progress Tracking:</strong> Visual progress bars for multi-step quests</li>
                    <li>🎮 <strong>Game-Like Aesthetics:</strong> Cinematic backgrounds and animations</li>
                    <li>⚡ <strong>Smooth Interactions:</strong> Expand/collapse with fluid animations</li>
                    <li>🏆 <strong>Reward System:</strong> Clear XP, CP, and coin displays</li>
                    <li>⭐ <strong>Difficulty Indicators:</strong> Star ratings and color coding</li>
                    <li>📅 <strong>Due Date Warnings:</strong> Color-coded urgency indicators</li>
                </ul>
            </div>
        </div>
    );
};
