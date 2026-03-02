import * as vscode from 'vscode';

import { IModelSettingsRepository } from '../contracts/IModelSettingsRepository';
import { ModelInstance } from '../models/modelInstance';

export class VscodeModelSettingsRepository implements IModelSettingsRepository {
    private static readonly STORAGE_KEY = 'ollama-view.modelSettings';

    constructor(private context: vscode.ExtensionContext) {}

    getAll(): Record<string, ModelInstance> {
        return this.context.globalState.get<Record<string, ModelInstance>>(
            VscodeModelSettingsRepository.STORAGE_KEY,
            {},
        );
    }

    async save(settings: Record<string, ModelInstance>): Promise<void> {
        await this.context.globalState.update(VscodeModelSettingsRepository.STORAGE_KEY, settings);
    }
}
