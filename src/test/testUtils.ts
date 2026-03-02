import * as sinon from 'sinon';

import { IOllamaClient } from '../contracts/IOllamaClient';
import { ModelInstance } from '../models/modelInstance';
import { Chat, ChatService } from '../services/chatService';
import { ModelService } from '../services/modelService';

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
        ...overrides,
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
        ...overrides,
    };
}

/**
 * Creates mock dependencies for OllamaProvider to simplify tree tests.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function createMockProviderDeps(sandbox: sinon.SinonSandbox) {
    const mockChatService = {
        getChatsForModel: sandbox.stub(),
        deleteChatsForModel: sandbox.stub(),
    } as any as sinon.SinonStubbedInstance<ChatService>;

    const mockModelService = {
        getInstancesForModel: sandbox.stub().returns([]), // Default to no instances to avoid crashes
        getSettings: sandbox.stub(),
        getInstanceByOllamaName: sandbox.stub(),
        cleanupOrphanedSettings: sandbox.stub(),
    } as any as sinon.SinonStubbedInstance<ModelService>;

    const mockApi = {
        listModels: sandbox.stub().resolves([]),
        listRunning: sandbox.stub().resolves([]),
        startModel: sandbox.stub().resolves(),
        stopModel: sandbox.stub().resolves(),
        deleteModel: sandbox.stub().resolves(),
    } as any as sinon.SinonStubbedInstance<IOllamaClient>;

    return {
        mockChatService,
        mockModelService,
        mockApi,
    };
}
