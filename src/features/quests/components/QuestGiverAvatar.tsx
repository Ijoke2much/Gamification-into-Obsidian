import React, { useState, useEffect } from "react";
import { App, TFile } from "obsidian";
// import { AvatarPickerModal } from "../../../player/modals/AvatarPickerModal";

interface QuestGiverAvatarProps {
    plugin: { app: App };
    imagePath: string;
    onImageChange: (newPath: string) => void;
    collapsed: boolean;
}

export const QuestGiverAvatar: React.FC<QuestGiverAvatarProps> = ({ 
    plugin, 
    imagePath, 
    onImageChange, 
    collapsed 
}) => {
    const [questGiverImg, setQuestGiverImg] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        async function loadQuestGiverImage() {
            setImgError(false);
            if (imagePath.startsWith("http")) {
                setQuestGiverImg(imagePath);
                return;
            }
            try {
                const vaultFile = plugin.app.vault.getAbstractFileByPath(imagePath);
                if (vaultFile && vaultFile instanceof TFile) {
                    const data = await plugin.app.vault.readBinary(vaultFile);
                    const ext = imagePath.split(".").pop()?.toLowerCase() || "jpg";
                    const mime =
                        ext === "png"
                            ? "image/png"
                            : ext === "gif"
                            ? "image/gif"
                            : "image/jpeg";
                    const base64 = arrayBufferToBase64(data);
                    setQuestGiverImg(`data:${mime};base64,${base64}`);
                    return;
                }
            } catch (e) {
                console.error("Failed to load quest giver image", e);
                setImgError(true);
            }
            setImgError(true);
        }

        function arrayBufferToBase64(buffer: ArrayBuffer) {
            let binary = "";
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }

        loadQuestGiverImage();
    }, [imagePath, plugin]);

    const openAvatarPicker = async () => {
        const avatarFolder = "assets/";
        const files = plugin.app.vault
            .getFiles()
            .filter(
                (file) =>
                    file.path.startsWith(avatarFolder) &&
                    ["png", "jpg", "jpeg", "svg", "gif"].includes(
                        file.extension.toLowerCase()
                    )
            );

        // If no files in assets folder, search entire vault for image files
        const allImageFiles =
            files.length > 0
                ? files
                : plugin.app.vault
                        .getFiles()
                        .filter((file) =>
                            ["png", "jpg", "jpeg", "svg", "gif"].includes(
                                file.extension.toLowerCase()
                            )
                        );

                    // new AvatarPickerModal(plugin.app, allImageFiles, onImageChange).open();
    };

    return (
        <div
            style={{
                textAlign: "center",
                marginBottom: collapsed ? 8 : 16,
                transition: "all 0.3s ease",
            }}
        >
            {imgError ? (
                <div
                    style={{
                        fontSize: collapsed ? "1.5em" : "2em",
                        marginBottom: 8,
                        color: "#888",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                    }}
                    onClick={openAvatarPicker}
                    title="Click to change Quest Giver avatar"
                >
                    🧙‍♂️
                </div>
            ) : questGiverImg ? (
                <img
                    src={questGiverImg}
                    alt="Quest Giver"
                    style={{
                        maxHeight: collapsed ? 60 : 120,
                        maxWidth: "100%",
                        objectFit: "contain",
                        marginBottom: 8,
                        borderRadius: 12,
                        boxShadow: "0 2px 8px #0003",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                    }}
                    onError={() => setImgError(true)}
                    onClick={openAvatarPicker}
                    title="Click to change Quest Giver avatar"
                />
            ) : (
                <div
                    style={{
                        fontSize: collapsed ? "1.5em" : "2em",
                        marginBottom: 8,
                        color: "#888",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                    }}
                    onClick={openAvatarPicker}
                    title="Click to change Quest Giver avatar"
                >
                    🧙‍♂️
                </div>
            )}
            {!collapsed && (
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: "1.1em",
                        color: "#ffd700",
                    }}
                >
                    Quest Giver
                </div>
            )}
        </div>
    );
}; 