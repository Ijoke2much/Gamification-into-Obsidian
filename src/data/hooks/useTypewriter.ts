import { useState, useEffect, useRef } from "react";

/**
 * THIS FILE FOCUSES ON THE TYPEWRITER EFFECT FOR THE QUEST GIVER
 * Custom hook for typewriter effect
 * @param text - The text to animate
 * @param speed - Speed of typing in milliseconds (default: 30)
 * @returns Object with displayed text, animation state, and reveal function
 */
export function useTypewriter(text: string, speed = 30) {
    const [displayed, setDisplayed] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setDisplayed("");
        setIsAnimating(true);
        let i = 0;

        function type() {
            if (i < text.length) {
                setDisplayed((prev) => prev + text[i]);
                i++;
                timeoutRef.current = setTimeout(type, speed);
            } else {
                setIsAnimating(false);
            }
        }

        type();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [text, speed]);

    const revealAll = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setDisplayed(text);
        setIsAnimating(false);
    };

    return { displayed, isAnimating, revealAll };
} 