import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';

import { FramingSource, FramingTag, ModelFraming } from '../models/modelFraming';

const BUILT_IN_FRAMINGS: ModelFraming[] = [
    {
        id: 'builtin-helpful-assistant',
        name: 'Helpful Assistant',
        description: 'General purpose assistant that is helpful, polite, and concise.',
        systemMessage:
            'You are a helpful assistant. You always answer politely and concisely, focusing on the most important information first.',
        tags: ['Built-in', 'General'],
        source: FramingSource.BuiltIn,
        createdAt: 1704067200000, // 2024-01-01
        updatedAt: 1704067200000,
    },
    {
        id: 'builtin-software-engineer',
        name: 'Software Engineer',
        description: 'Expert software engineer that writes clean, documented, and efficient code.',
        systemMessage:
            'You are an expert software engineer. When writing code, you follow industry best practices, prioritize readability, and ensure efficient algorithms. You provide brief explanations for your technical decisions.',
        tags: ['Built-in', 'Programming'],
        source: FramingSource.BuiltIn,
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
    },
    {
        id: 'builtin-concise-editor',
        name: 'Concise Editor',
        description: 'Edits text to be more professional, clear, and brief.',
        systemMessage:
            "You are a professional editor. Your goal is to rewrite the user's input to be more professional, clear, and as concise as possible without losing the original meaning.",
        tags: ['Built-in', 'Writing'],
        source: FramingSource.BuiltIn,
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
    },
];

export class FramingService {
    private static readonly STORAGE_KEY = 'ollama-view.framings';

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Gets all framings (Built-in + User).
     */
    getAllFramings(): ModelFraming[] {
        const userFramings = this.context.globalState.get<ModelFraming[]>(FramingService.STORAGE_KEY, []);

        // Migration logic if needed could go here, but for this track we start fresh or assuming fresh keys.
        return [...BUILT_IN_FRAMINGS, ...userFramings];
    }

    /**
     * Gets only user-created framings.
     */
    private getUserFramings(): ModelFraming[] {
        return this.context.globalState.get<ModelFraming[]>(FramingService.STORAGE_KEY, []);
    }

    /**
     * Saves user framings to global state.
     */
    private async saveUserFramings(framings: ModelFraming[]): Promise<void> {
        await this.context.globalState.update(FramingService.STORAGE_KEY, framings);
    }

    /**
     * Gets a framing by its ID.
     */
    getFraming(id: string): ModelFraming | undefined {
        return this.getAllFramings().find((f) => f.id === id);
    }

    /**
     * Filters out reserved tags from user input.
     */
    private filterTags(tags: string[]): string[] {
        const reserved = ['Built-in', 'Untagged'];
        return tags.filter((t) => !reserved.some((r) => r.toLowerCase() === t.trim().toLowerCase()));
    }

    /**
     * Creates a new user framing.
     */
    async createFraming(framingData: Partial<ModelFraming>): Promise<ModelFraming> {
        const userFramings = this.getUserFramings();
        const now = Date.now();

        const newFraming: ModelFraming = {
            id: uuidv4(),
            name: framingData.name || 'New Framing',
            description: framingData.description || '',
            systemMessage: framingData.systemMessage || '',
            userMessagePrefix: framingData.userMessagePrefix || '',
            userMessageSuffix: framingData.userMessageSuffix || '',
            systemTurnPrefix: framingData.systemTurnPrefix || '',
            systemTurnSuffix: framingData.systemTurnSuffix || '',
            tags: this.filterTags(framingData.tags || []),
            source: FramingSource.User,
            createdAt: now,
            updatedAt: now,
        };

        userFramings.push(newFraming);
        await this.saveUserFramings(userFramings);
        return newFraming;
    }

    /**
     * Updates an existing user framing.
     */
    async updateFraming(id: string, updates: Partial<ModelFraming>): Promise<ModelFraming | undefined> {
        const userFramings = this.getUserFramings();
        const index = userFramings.findIndex((f) => f.id === id);

        if (index === -1) {
            return undefined;
        }

        const filteredUpdates = { ...updates };
        if (filteredUpdates.tags) {
            filteredUpdates.tags = this.filterTags(filteredUpdates.tags);
        }

        const updatedFraming: ModelFraming = {
            ...userFramings[index],
            ...filteredUpdates,
            id, // Ensure ID doesn't change
            source: FramingSource.User, // Ensure source remains 'user'
            updatedAt: Date.now(),
        };

        userFramings[index] = updatedFraming;
        await this.saveUserFramings(userFramings);
        return updatedFraming;
    }

    /**
     * Deletes a user framing.
     */
    async deleteFraming(id: string): Promise<boolean> {
        let userFramings = this.getUserFramings();
        const initialLength = userFramings.length;
        userFramings = userFramings.filter((f) => f.id !== id);

        if (userFramings.length === initialLength) {
            return false; // Framing was built-in or not found
        }

        await this.saveUserFramings(userFramings);
        return true;
    }

    /**
     * Duplicates an existing framing.
     */
    async duplicateFraming(id: string): Promise<ModelFraming | undefined> {
        const sourceFraming = this.getFraming(id);
        if (!sourceFraming) {
            return undefined;
        }

        const newFramingData: Partial<ModelFraming> = {
            name: `${sourceFraming.name} (Copy)`,
            description: sourceFraming.description,
            systemMessage: sourceFraming.systemMessage,
            userMessagePrefix: sourceFraming.userMessagePrefix,
            userMessageSuffix: sourceFraming.userMessageSuffix,
            systemTurnPrefix: sourceFraming.systemTurnPrefix,
            systemTurnSuffix: sourceFraming.systemTurnSuffix,
            tags: this.filterTags(sourceFraming.tags),
        };

        return this.createFraming(newFramingData);
    }

    /**
     * Gets all unique tags across all framings.
     */
    getAllTags(): FramingTag[] {
        const framings = this.getAllFramings();
        const tagNames = new Set<string>();

        framings.forEach((f) => {
            f.tags.forEach((tag) => tagNames.add(tag));
        });

        const tags: FramingTag[] = Array.from(tagNames).map((name) => ({
            id: `tag-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name: name,
        }));

        // Add special 'Untagged' tag if there are framings without tags
        if (framings.some((f) => f.tags.length === 0)) {
            tags.push({
                id: 'tag-untagged',
                name: 'Untagged',
                isReserved: true,
            });
        }

        return tags.sort((a, b) => {
            if (a.isReserved) {
                return 1;
            }
            if (b.isReserved) {
                return -1;
            }
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Gets framings by tag.
     */
    getFramingsByTag(tagName: string): ModelFraming[] {
        const framings = this.getAllFramings();

        if (tagName === 'Untagged') {
            return framings.filter((f) => f.tags.length === 0);
        }

        return framings.filter((f) => f.tags.includes(tagName));
    }
}
