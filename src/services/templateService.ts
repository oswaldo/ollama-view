import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { Template, TemplateSource, Tag } from '../models/template';

const BUILT_IN_TEMPLATES: Template[] = [
    {
        id: 'builtin-helpful-assistant',
        name: 'Helpful Assistant',
        description: 'General purpose assistant that is helpful, polite, and concise.',
        systemMessage: 'You are a helpful assistant. You always answer politely and concisely, focusing on the most important information first.',
        tags: ['Built-in', 'General'],
        source: TemplateSource.BuiltIn,
        createdAt: 1704067200000, // 2024-01-01
        updatedAt: 1704067200000
    },
    {
        id: 'builtin-software-engineer',
        name: 'Software Engineer',
        description: 'Expert software engineer that writes clean, documented, and efficient code.',
        systemMessage: 'You are an expert software engineer. When writing code, you follow industry best practices, prioritize readability, and ensure efficient algorithms. You provide brief explanations for your technical decisions.',
        tags: ['Built-in', 'Programming'],
        source: TemplateSource.BuiltIn,
        createdAt: 1704067200000,
        updatedAt: 1704067200000
    },
    {
        id: 'builtin-concise-editor',
        name: 'Concise Editor',
        description: 'Edits text to be more professional, clear, and brief.',
        systemMessage: 'You are a professional editor. Your goal is to rewrite the user\'s input to be more professional, clear, and as concise as possible without losing the original meaning.',
        tags: ['Built-in', 'Writing'],
        source: TemplateSource.BuiltIn,
        createdAt: 1704067200000,
        updatedAt: 1704067200000
    }
];

export class TemplateService {
    private static readonly STORAGE_KEY = 'ollama-view.templates';

    constructor(private context: vscode.ExtensionContext) { }

    /**
     * Gets all templates (Built-in + User).
     */
    getAllTemplates(): Template[] {
        const userTemplates = this.context.globalState.get<any[]>(TemplateService.STORAGE_KEY, []);
        
        // Migration: map old 'content' to 'systemMessage'
        const migratedUserTemplates: Template[] = userTemplates.map(t => {
            if (t.content !== undefined && t.systemMessage === undefined) {
                const { content, ...rest } = t;
                return { ...rest, systemMessage: content } as Template;
            }
            return t as Template;
        });

        return [...BUILT_IN_TEMPLATES, ...migratedUserTemplates];
    }

    /**
     * Gets only user-created templates.
     */
    private getUserTemplates(): Template[] {
        const userTemplates = this.context.globalState.get<any[]>(TemplateService.STORAGE_KEY, []);
        return userTemplates.map(t => {
            if (t.content !== undefined && t.systemMessage === undefined) {
                const { content, ...rest } = t;
                return { ...rest, systemMessage: content } as Template;
            }
            return t as Template;
        });
    }

    /**
     * Saves user templates to global state.
     */
    private async saveUserTemplates(templates: Template[]): Promise<void> {
        await this.context.globalState.update(TemplateService.STORAGE_KEY, templates);
    }

    /**
     * Gets a template by its ID.
     */
    getTemplate(id: string): Template | undefined {
        return this.getAllTemplates().find(t => t.id === id);
    }

    /**
     * Filters out reserved tags from user input.
     */
    private filterTags(tags: string[]): string[] {
        const reserved = ['Built-in', 'Untagged'];
        return tags.filter(t => !reserved.some(r => r.toLowerCase() === t.trim().toLowerCase()));
    }

    /**
     * Creates a new user template.
     */
    async createTemplate(templateData: Partial<Template>): Promise<Template> {
        const userTemplates = this.getUserTemplates();
        const now = Date.now();
        
        const newTemplate: Template = {
            id: uuidv4(),
            name: templateData.name || 'New Template',
            description: templateData.description || '',
            systemMessage: templateData.systemMessage || '',
            userMessagePrefix: templateData.userMessagePrefix || '',
            userMessageSuffix: templateData.userMessageSuffix || '',
            systemTurnPrefix: templateData.systemTurnPrefix || '',
            systemTurnSuffix: templateData.systemTurnSuffix || '',
            tags: this.filterTags(templateData.tags || []),
            source: TemplateSource.User,
            createdAt: now,
            updatedAt: now,
        };

        userTemplates.push(newTemplate);
        await this.saveUserTemplates(userTemplates);
        return newTemplate;
    }

    /**
     * Updates an existing user template.
     */
    async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
        const userTemplates = this.getUserTemplates();
        const index = userTemplates.findIndex(t => t.id === id);
        
        if (index === -1) {
            return undefined;
        }

        const filteredUpdates = { ...updates };
        if (filteredUpdates.tags) {
            filteredUpdates.tags = this.filterTags(filteredUpdates.tags);
        }

        const updatedTemplate: Template = {
            ...userTemplates[index],
            ...filteredUpdates,
            id, // Ensure ID doesn't change
            source: TemplateSource.User, // Ensure source remains 'user'
            updatedAt: Date.now()
        };

        userTemplates[index] = updatedTemplate;
        await this.saveUserTemplates(userTemplates);
        return updatedTemplate;
    }

    /**
     * Deletes a user template.
     */
    async deleteTemplate(id: string): Promise<boolean> {
        let userTemplates = this.getUserTemplates();
        const initialLength = userTemplates.length;
        userTemplates = userTemplates.filter(t => t.id !== id);
        
        if (userTemplates.length === initialLength) {
            return false; // Template was built-in or not found
        }

        await this.saveUserTemplates(userTemplates);
        return true;
    }

    /**
     * Duplicates an existing template.
     */
    async duplicateTemplate(id: string): Promise<Template | undefined> {
        const sourceTemplate = this.getTemplate(id);
        if (!sourceTemplate) {
            return undefined;
        }

        const newTemplateData: Partial<Template> = {
            name: `${sourceTemplate.name} (Copy)`,
            description: sourceTemplate.description,
            systemMessage: sourceTemplate.systemMessage,
            userMessagePrefix: sourceTemplate.userMessagePrefix,
            userMessageSuffix: sourceTemplate.userMessageSuffix,
            systemTurnPrefix: sourceTemplate.systemTurnPrefix,
            systemTurnSuffix: sourceTemplate.systemTurnSuffix,
            tags: this.filterTags(sourceTemplate.tags),
        };

        return this.createTemplate(newTemplateData);
    }

    /**
     * Gets all unique tags across all templates.
     */
    getAllTags(): Tag[] {
        const templates = this.getAllTemplates();
        const tagNames = new Set<string>();
        
        templates.forEach(t => {
            t.tags.forEach(tag => tagNames.add(tag));
        });

        const tags: Tag[] = Array.from(tagNames).map(name => ({
            id: `tag-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name: name
        }));

        // Add special 'Untagged' tag if there are templates without tags
        if (templates.some(t => t.tags.length === 0)) {
            tags.push({
                id: 'tag-untagged',
                name: 'Untagged',
                isReserved: true
            });
        }

        return tags.sort((a, b) => {
            if (a.isReserved) return 1;
            if (b.isReserved) return -1;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Gets templates by tag.
     */
    getTemplatesByTag(tagName: string): Template[] {
        const templates = this.getAllTemplates();
        
        if (tagName === 'Untagged') {
            return templates.filter(t => t.tags.length === 0);
        }

        return templates.filter(t => t.tags.includes(tagName));
    }
}
