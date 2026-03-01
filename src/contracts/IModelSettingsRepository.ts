import { ModelInstance } from '../models/modelInstance';

export interface IModelSettingsRepository {
    getAll(): Record<string, ModelInstance>;
    save(settings: Record<string, ModelInstance>): Promise<void>;
}
