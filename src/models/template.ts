/**
 * Source of the template: Built-in (Read-Only) or User (Editable).
 */
export enum TemplateSource {
    BuiltIn = 'builtin',
    User = 'user'
}

/**
 * Represents a single system prompt template.
 */
export interface Template {
    /** Unique identifier for the template */
    id: string;
    
    /** Display name of the template */
    name: string;
    
    /** Brief description of the template's purpose */
    description: string;
    
    /** The core system prompt */
    systemMessage: string;

    /** Prefix injected into the user message turn */
    userMessagePrefix?: string;

    /** Suffix injected into the user message turn */
    userMessageSuffix?: string;

    /** System turn sent before the user message */
    systemTurnPrefix?: string;

    /** System turn sent after the user message */
    systemTurnSuffix?: string;
    
    /** Tags associated with this template for organization */
    tags: string[];
    
    /** Source of the template */
    source: TemplateSource;
    
    /** Timestamp of creation */
    createdAt: number;
    
    /** Timestamp of last update */
    updatedAt: number;
}

/**
 * Represents a tag for organizing templates.
 */
export interface Tag {
    /** Unique identifier for the tag */
    id: string;
    
    /** Display name of the tag */
    name: string;
    
    /** Whether this is a system-reserved tag (e.g., 'Untagged') */
    isReserved?: boolean;
}
