/**
 * Advanced configuration options for an Ollama model instance.
 * These correspond to the 'options' field in the Ollama API.
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md#parameters
 */
export interface AdvancedModelConfig {
    num_gpu?: number;
    num_thread?: number;
    use_mmap?: boolean;
    use_mlock?: boolean;
    num_ctx?: number;
    num_predict?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    stop?: string[];
    [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Represents a logical instance of an Ollama model with its specific configuration.
 * A single Ollama base model (e.g. 'llama3') can have multiple named instances
 * with different system prompts or hardware configurations.
 */
export interface ModelInstance {
    /** Unique identifier for this instance (UUID) */
    id: string;

    /** User-visible name for this configuration (e.g. 'Creative Writing', 'Fast Code') */
    name: string;

    /** Optional notes about this instance */
    description?: string;

    /** The base Ollama model name (e.g. 'llama3', 'mistral') */
    modelName: string;

    /**
     * The actual model name used in Ollama.
     * For primary instances, this matches modelName.
     * For custom instances, this is a slug generated from the instance name.
     */
    ollamaModelName?: string;

    /** The configuration options applied to this instance */
    config: AdvancedModelConfig;

    /** Default system message for this instance */
    systemMessage?: string;

    /** Text injected before every user message */
    userMessagePrefix?: string;

    /** Text injected after every user message */
    userMessageSuffix?: string;

    /** Separate system message turn sent before the user message */
    systemTurnPrefix?: string;

    /** Separate system message turn sent after the user message */
    systemTurnSuffix?: string;

    /** Optional framing override ID */
    activeFramingId?: string;

    /**
     * Whether this is a managed custom instance created by the extension.
     * If false, it represents a primary/base model instance.
     */
    isManaged: boolean;

    /** Timestamp when the instance was created */
    createdAt: number;

    /** Timestamp of the last configuration update */
    updatedAt: number;

    /**
     * Version of the datastructure for migration and compatibility.
     * 1: Initial (implicit if missing)
     * 2: Advanced configuration added
     */
    dataVersion?: number;

    /** Allow for unknown fields to be preserved */
    [key: string]: unknown;
}
