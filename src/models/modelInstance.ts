/**
 * Advanced configuration options for an Ollama model instance.
 * These correspond to the 'options' field in the Ollama API.
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md#parameters
 */
export interface AdvancedModelConfig {
    // Hardware & Performance
    /** The number of layers to send to the GPU(s) */
    num_gpu?: number;
    /** Sets the number of threads to use during generation */
    num_thread?: number;
    /** Use memory-mapped files (mmap) */
    use_mmap?: boolean;
    /** Lock the model into memory (mlock) */
    use_mlock?: boolean;

    // Inference & Generation Limits
    /** Sets the size of the context window used to generate the next token */
    num_ctx?: number;
    /** Maximum number of tokens to predict when generating text */
    num_predict?: number;
    /** The temperature of the model */
    temperature?: number;
    /** Sets the probability threshold for Nucleus sampling */
    top_p?: number;
    /** Reduces the probability of generating nonsense */
    top_k?: number;
    /** Sets how far back for the model to look to prevent repetition */
    repeat_penalty?: number;
    /** Sets the random number seed to use for generation */
    seed?: number;
    /** Sets the stop sequences to use */
    stop?: string[];
}

/**
 * Represents a specific instance of an Ollama model with its own name and configuration.
 */
export interface ModelInstance {
    /** Unique identifier for the instance (UUID or name-slug) */
    id: string;

    /** Display name of the instance (set by the user) */
    name: string;

    /** The base Ollama model name (e.g., 'tinyllama:latest') */
    modelName: string;

    /** Optional notes or description provided by the user */
    description?: string;

    /** Advanced configuration parameters */
    config: AdvancedModelConfig;

    /** Timestamp of creation */
    createdAt: number;

    /** Timestamp of last update */
    updatedAt: number;

    /** 
     * Version of the data structure for migration and compatibility.
     * 1: Initial (implicit if missing)
     * 2: Advanced configuration added
     */
    dataVersion?: number;
}
