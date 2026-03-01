import { ModelInstance } from '../models/modelInstance';
import { Chat } from '../services/chatService';

/**
 * Creates a mock ModelInstance with sensible defaults for testing.
 */
export function createMockInstance(overrides: Partial<ModelInstance> = {}): ModelInstance {
    const id = overrides.id || 'test-instance-id';
    const modelName = overrides.modelName || 'llama3';
    
    return {
        id,
        name: overrides.name || 'Test Instance',
        modelName,
        ollamaModelName: overrides.ollamaModelName || modelName,
        config: overrides.config || {},
        systemMessage: overrides.systemMessage || 'You are a helpful assistant.',
        isManaged: overrides.isManaged ?? false,
        createdAt: overrides.createdAt || Date.now(),
        updatedAt: overrides.updatedAt || Date.now(),
        dataVersion: overrides.dataVersion || 2,
        ...overrides
    };
}

/**
 * Creates a mock Chat with sensible defaults for testing.
 */
export function createMockChat(overrides: Partial<Chat> = {}): Chat {
    return {
        id: overrides.id || 'test-chat-id',
        modelName: overrides.modelName || 'test-instance-id',
        name: overrides.name || 'Test Chat',
        messages: overrides.messages || [],
        createdAt: overrides.createdAt || Date.now(),
        activeFramingId: overrides.activeFramingId,
        ...overrides
    };
}
