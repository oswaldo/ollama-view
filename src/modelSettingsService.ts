import * as vscode from 'vscode';
import { ModelInstance, AdvancedModelConfig } from './models/modelInstance';
import { v4 as uuidv4 } from 'uuid';

export interface ModelSettings {
    systemMessage?: string;
    userMessagePrefix?: string;
    userMessageSuffix?: string;
    systemTurnPrefix?: string;
    systemTurnSuffix?: string;
    /** Version of the data structure */
    dataVersion?: number;
    /** Allow for unknown fields to be preserved */
    [key: string]: any;
}

export class ModelSettingsService {
    private static readonly STORAGE_KEY = 'ollama-view.modelSettings';
    public static readonly DEFAULT_SYSTEM_MESSAGE = 'You are a helpful AI assistant.';
    public static readonly CURRENT_VERSION = 2;

    constructor(private context: vscode.ExtensionContext) { }

    private getAllSettings(): Record<string, any> {
        return this.context.globalState.get<Record<string, any>>(ModelSettingsService.STORAGE_KEY, {});
    }

    private async saveAllSettings(settings: Record<string, any>): Promise<void> {
        await this.context.globalState.update(ModelSettingsService.STORAGE_KEY, settings);
    }

    /**
     * Gets settings for a specific instance.
     * If instanceId matches a modelName, it returns the primary instance for that model.
     */
    getSettings(instanceIdOrModelName: string): ModelInstance {
        const allSettings = this.getAllSettings();
        let entry = allSettings[instanceIdOrModelName];

        if (!entry) {
            // Return a default instance for the model name
            return this.createDefaultInstance(instanceIdOrModelName);
        }

        // Migration from V1 (ModelSettings) to V2 (ModelInstance)
        if (!entry.id || !entry.modelName) {
            entry = this.migrateToInstance(instanceIdOrModelName, entry);
        }

        return entry as ModelInstance;
    }

    private createDefaultInstance(modelName: string): ModelInstance {
        return {
            id: modelName,
            name: modelName,
            modelName: modelName,
            config: {},
            systemMessage: ModelSettingsService.DEFAULT_SYSTEM_MESSAGE,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dataVersion: ModelSettingsService.CURRENT_VERSION
        };
    }

    private migrateToInstance(modelName: string, legacy: ModelSettings): ModelInstance {
        return {
            ...legacy,
            id: modelName,
            name: modelName,
            modelName: modelName,
            config: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dataVersion: ModelSettingsService.CURRENT_VERSION
        } as ModelInstance;
    }

    async setSystemMessage(instanceId: string, message: string): Promise<void> {
        const allSettings = this.getAllSettings();
        const instance = this.getSettings(instanceId);
        instance.systemMessage = message;
        instance.updatedAt = Date.now();
        
        allSettings[instanceId] = instance;
        await this.saveAllSettings(allSettings);
    }

    async setSettings(instanceId: string, settings: Partial<ModelInstance>): Promise<void> {
        const allSettings = this.getAllSettings();
        const existing = this.getSettings(instanceId);
        
        const updated: ModelInstance = {
            ...existing,
            ...settings,
            updatedAt: Date.now(),
            dataVersion: ModelSettingsService.CURRENT_VERSION
        };
        
        allSettings[instanceId] = updated;
        await this.saveAllSettings(allSettings);
    }

    /**
     * Lists all instances for a specific base model.
     */
    getInstancesForModel(modelName: string): ModelInstance[] {
        const allSettings = this.getAllSettings();
        const instances: ModelInstance[] = [];

        // Always include the default instance if it exists or even if not (it will be created on the fly)
        const defaultInstance = this.getSettings(modelName);
        instances.push(defaultInstance);

        for (const key in allSettings) {
            if (key === modelName) {
                continue; // already added
            }
            const entry = allSettings[key];
            if (entry.modelName === modelName || (entry.id && entry.modelName === modelName)) {
                instances.push(this.getSettings(key));
            }
        }

        return instances.sort((a, b) => a.createdAt - b.createdAt);
    }

    async createInstance(modelName: string, name: string): Promise<ModelInstance> {
        const allSettings = this.getAllSettings();
        
        // Ensure name uniqueness within the model
        const instances = this.getInstancesForModel(modelName);
        let finalName = name;
        let counter = 1;
        while (instances.some(i => i.name === finalName)) {
            finalName = `${name} (${++counter})`;
        }

        const newInstance: ModelInstance = {
            id: uuidv4(),
            name: finalName,
            modelName: modelName,
            config: {},
            systemMessage: ModelSettingsService.DEFAULT_SYSTEM_MESSAGE,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dataVersion: ModelSettingsService.CURRENT_VERSION
        };

        allSettings[newInstance.id] = newInstance;
        await this.saveAllSettings(allSettings);
        return newInstance;
    }

    async deleteSettings(instanceId: string): Promise<void> {
        const allSettings = this.getAllSettings();
        if (allSettings[instanceId]) {
            delete allSettings[instanceId];
            await this.saveAllSettings(allSettings);
        }
    }

    async cleanupOrphanedSettings(activeModelNames: string[]): Promise<void> {
        const allSettings = this.getAllSettings();
        const activeSet = new Set(activeModelNames);
        let changed = false;

        for (const key in allSettings) {
            const entry = allSettings[key];
            const baseModelName = entry.modelName || key; // If legacy, key is the model name
            
            if (!activeSet.has(baseModelName)) {
                delete allSettings[key];
                changed = true;
            }
        }

        if (changed) {
            await this.saveAllSettings(allSettings);
        }
    }
}
