import * as vscode from 'vscode';

export interface ModelSettings {
    systemMessage?: string;
    userMessagePrefix?: string;
    userMessageSuffix?: string;
    systemTurnPrefix?: string;
    systemTurnSuffix?: string;
}

export class ModelSettingsService {
    private static readonly STORAGE_KEY = 'ollama-view.modelSettings';
    public static readonly DEFAULT_SYSTEM_MESSAGE = 'You are a helpful AI assistant.';

    constructor(private context: vscode.ExtensionContext) { }

    private getAllSettings(): Record<string, ModelSettings> {
        return this.context.globalState.get<Record<string, ModelSettings>>(ModelSettingsService.STORAGE_KEY, {});
    }

    private async saveAllSettings(settings: Record<string, ModelSettings>): Promise<void> {
        await this.context.globalState.update(ModelSettingsService.STORAGE_KEY, settings);
    }

    getSettings(modelName: string): ModelSettings {
        const allSettings = this.getAllSettings();
        return allSettings[modelName] || { systemMessage: ModelSettingsService.DEFAULT_SYSTEM_MESSAGE };
    }

    async setSystemMessage(modelName: string, message: string): Promise<void> {
        const allSettings = this.getAllSettings();
        if (!allSettings[modelName]) {
            allSettings[modelName] = {};
        }
        allSettings[modelName].systemMessage = message;
        await this.saveAllSettings(allSettings);
    }

    async setSettings(modelName: string, settings: ModelSettings): Promise<void> {
        const allSettings = this.getAllSettings();
        allSettings[modelName] = settings;
        await this.saveAllSettings(allSettings);
    }

    async deleteSettings(modelName: string): Promise<void> {
        const allSettings = this.getAllSettings();
        if (allSettings[modelName]) {
            delete allSettings[modelName];
            await this.saveAllSettings(allSettings);
        }
    }

    async cleanupOrphanedSettings(activeModelNames: string[]): Promise<void> {
        const allSettings = this.getAllSettings();
        const activeSet = new Set(activeModelNames);
        let changed = false;

        for (const modelName in allSettings) {
            if (!activeSet.has(modelName)) {
                delete allSettings[modelName];
                changed = true;
            }
        }

        if (changed) {
            await this.saveAllSettings(allSettings);
        }
    }
}
