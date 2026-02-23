/**
 * Source of the framing: Built-in (Read-Only) or User (Editable).
 */
export enum FramingSource {
    BuiltIn = 'builtin',
    User = 'user'
}

/**
 * Represents a single system prompt framing.
 */
export interface ModelFraming {
    /** Unique identifier for the framing */
    id: string;
    
    /** Display name of the framing */
    name: string;
    
    /** Brief description of the framing's purpose */
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
    
    /** Tags associated with this framing for organization */
    tags: string[];
    
    /** Source of the framing */
    source: FramingSource;
    
    /** Timestamp of creation */
    createdAt: number;
    
    /** Timestamp of last update */
    updatedAt: number;
}

/**
 * Represents a tag for organizing framings.
 */
export interface FramingTag {
    /** Unique identifier for the tag */
    id: string;
    
    /** Display name of the tag */
    name: string;
    
    /** Whether this is a system-reserved tag (e.g., 'Untagged') */
    isReserved?: boolean;
}
