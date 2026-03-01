import { v4 as uuidv4 } from 'uuid';

import { IModelSettingsRepository } from '../contracts/IModelSettingsRepository';
import { IOllamaClient } from '../contracts/IOllamaClient';
import { Logger } from '../logger';
import { ModelInstance } from '../models/modelInstance';

export interface ModelSettings {
    systemMessage?: string;
    userMessagePrefix?: string;
    userMessageSuffix?: string;
    systemTurnPrefix?: string;
    systemTurnSuffix?: string;
    /** Version of the data structure */
    dataVersion?: number;
    /** Allow for unknown fields to be preserved */
    [key: string]: unknown;
}

export class ModelService {
    public static readonly DEFAULT_SYSTEM_MESSAGE = 'You are a helpful AI assistant.';
    public static readonly CURRENT_VERSION = 2;

    constructor(
        private repository: IModelSettingsRepository,
        private api: IOllamaClient,
    ) {}

    /**
     * Gets settings for a specific instance.
     * If instanceId matches a modelName, it returns the primary instance for that model.
     */
    getSettings(instanceIdOrModelName: string): ModelInstance {
        const allSettings = this.repository.getAll();
        let entry = allSettings[instanceIdOrModelName];

        if (!entry) {
            // Return a default instance for the model name
            return this.createDefaultInstance(instanceIdOrModelName);
        }

        // Migration from V1 (ModelSettings) to V2 (ModelInstance)
        if (!entry.id || !entry.modelName) {
            entry = this.migrateToInstance(instanceIdOrModelName, entry as unknown as ModelSettings);
        }

        return entry as ModelInstance;
    }

    private createDefaultInstance(modelName: string): ModelInstance {
        return {
            id: modelName,
            name: modelName,
            modelName: modelName,
            ollamaModelName: modelName, // Primary instance uses the base name
            config: {},
            systemMessage: ModelService.DEFAULT_SYSTEM_MESSAGE,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dataVersion: ModelService.CURRENT_VERSION,
        };
    }

    private migrateToInstance(modelName: string, legacy: ModelSettings): ModelInstance {
        return {
            ...legacy,
            id: modelName,
            name: modelName,
            modelName: modelName,
            ollamaModelName: modelName,
            config: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dataVersion: ModelService.CURRENT_VERSION,
        } as ModelInstance;
    }

    async setSystemMessage(instanceId: string, message: string): Promise<void> {
        const allSettings = this.repository.getAll();
        const instance = this.getSettings(instanceId);
        instance.systemMessage = message;
        instance.updatedAt = Date.now();

        allSettings[instanceId] = instance;
        await this.repository.save(allSettings);
    }

    async setSettings(instanceId: string, settings: Partial<ModelInstance>): Promise<void> {
        const allSettings = this.repository.getAll();
        const existing = this.getSettings(instanceId);

        const updated: ModelInstance = {
            ...existing,
            ...settings,
            updatedAt: Date.now(),
            dataVersion: ModelService.CURRENT_VERSION,
        };

        // If it's a managed instance (not the primary one), update the model in Ollama
        if (updated.ollamaModelName && updated.ollamaModelName !== updated.modelName) {
            await this.syncWithOllama(updated);
        }

        allSettings[instanceId] = updated;
        await this.repository.save(allSettings);
    }

    /**
     * Lists all instances for a specific base model.
     */
    getInstancesForModel(modelName: string): ModelInstance[] {
        const allSettings = this.repository.getAll();
        const instances: ModelInstance[] = [];

        // Always include the default instance
        const defaultInstance = this.getSettings(modelName);
        instances.push(defaultInstance);

        for (const key in allSettings) {
            if (key === modelName) {
                continue;
            }
            const entry = allSettings[key];
            if (entry.modelName === modelName) {
                instances.push(entry);
            }
        }

        return instances.sort((a, b) => a.createdAt - b.createdAt);
    }

    async createInstance(modelName: string, name: string): Promise<ModelInstance> {
        const allSettings = this.repository.getAll();

        // Ensure name uniqueness within our UI
        const instances = this.getInstancesForModel(modelName);
        let finalName = name;
        let counter = 1;
        while (instances.some((i) => i.name === finalName)) {
            finalName = `${name} (${++counter})`;
        }

        // Generate a valid Ollama model name (slug)
        const slug = finalName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        let ollamaName = `${modelName.split(':')[0]}-${slug}`;

        // Ensure ollamaName uniqueness by checking with API or local state
        if (Object.values(allSettings).some((inst: ModelInstance) => inst.ollamaModelName === ollamaName)) {
            ollamaName = `${ollamaName}-${uuidv4().substring(0, 4)}`;
        }

        const newInstance: ModelInstance = {
            id: uuidv4(),
            name: finalName,
            modelName: modelName,
            ollamaModelName: ollamaName,
            config: {},
            systemMessage: ModelService.DEFAULT_SYSTEM_MESSAGE,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dataVersion: ModelService.CURRENT_VERSION,
        };

        // Create the model in Ollama
        await this.syncWithOllama(newInstance);

        allSettings[newInstance.id] = newInstance;
        await this.repository.save(allSettings);
        return newInstance;
    }

    async deleteSettings(instanceId: string): Promise<void> {
        const allSettings = this.repository.getAll();
        const instance = allSettings[instanceId];

        if (instance) {
            // Delete from Ollama if it's a managed instance
            if (instance.ollamaModelName && instance.ollamaModelName !== instance.modelName) {
                try {
                    await this.api.deleteModel(instance.ollamaModelName);
                } catch (e: unknown) {
                    Logger.error(`Failed to delete managed model ${instance.ollamaModelName} from Ollama`, e);
                }
            }

            delete allSettings[instanceId];
            await this.repository.save(allSettings);
        }
    }

    async cleanupOrphanedSettings(activeModelNames: string[]): Promise<void> {
        const allSettings = this.repository.getAll();
        const activeSet = new Set(activeModelNames);
        let changed = false;

        for (const key in allSettings) {
            const entry = allSettings[key];
            const baseModelName = entry.modelName || key;

            if (!activeSet.has(baseModelName)) {
                // If we delete the base model setting, we should probably delete all its instances too
                // and their Ollama models.
                if (entry.ollamaModelName && entry.ollamaModelName !== entry.modelName) {
                    try {
                        await this.api.deleteModel(entry.ollamaModelName);
                    } catch (e: unknown) {
                        // Ignore deletion errors for orphaned managed models
                    }
                }
                delete allSettings[key];
                changed = true;
            }
        }

        if (changed) {
            await this.repository.save(allSettings);
        }
    }

    private async syncWithOllama(instance: ModelInstance): Promise<void> {
        if (!instance.ollamaModelName || instance.ollamaModelName === instance.modelName) {
            return;
        }

        // Based on latest manual validation:
        // Use structured parameters object instead of raw Modelfile where possible
        const options = {
            model: instance.ollamaModelName,
            from: instance.modelName,
            system: instance.systemMessage,
            parameters: {
                ...instance.config,
            },
        };

        await this.api.createModel(options);
    }
}
