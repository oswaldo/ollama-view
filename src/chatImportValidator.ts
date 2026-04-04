/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';

import { Chat, ChatMessage } from './services/chatService';

export interface ChatImportValidationResult {
    chat: Chat | null;
    errors: string[];
    warnings: string[];
}

export function validateChatImport(jsonString: string): ChatImportValidationResult {
    const result: ChatImportValidationResult = {
        chat: null,
        errors: [],
        warnings: [],
    };

    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (e: any) {
        result.errors.push(`Invalid JSON format: ${e.message}`);
        return result;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        result.errors.push('Root element must be a JSON object representing a Chat.');
        return result;
    }

    if (!parsed.messages || !Array.isArray(parsed.messages)) {
        result.errors.push('Missing or invalid "messages" array. Cannot import an empty or malformed chat history.');
        return result;
    }

    const validMessages: ChatMessage[] = [];
    parsed.messages.forEach((msg: any, index: number) => {
        if (!msg || typeof msg !== 'object') {
            result.warnings.push(`Message at index ${index} skipped: Not an object.`);
            return;
        }

        if (!msg.role || !msg.content) {
            result.warnings.push(`Message at index ${index} skipped: Missing role or content.`);
            return;
        }

        if (!['user', 'assistant', 'system'].includes(msg.role)) {
            result.warnings.push(`Message at index ${index} skipped: Invalid role "${msg.role}".`);
            return;
        }

        let timestamp = msg.timestamp;
        if (typeof timestamp !== 'number') {
            result.warnings.push(`Message at index ${index}: Missing or invalid timestamp. Using current time.`);
            timestamp = Date.now();
        }

        const chatMessage: ChatMessage = {
            role: msg.role as 'user' | 'assistant' | 'system',
            content: String(msg.content),
            timestamp,
        };

        // Extract optional metadata
        if (msg.systemTurnPrefix) {chatMessage.systemTurnPrefix = String(msg.systemTurnPrefix);}
        if (msg.userPrefix) {chatMessage.userPrefix = String(msg.userPrefix);}
        if (msg.userSuffix) {chatMessage.userSuffix = String(msg.userSuffix);}
        if (msg.systemTurnSuffix) {chatMessage.systemTurnSuffix = String(msg.systemTurnSuffix);}
        if (msg.framingId) {chatMessage.framingId = String(msg.framingId);}
        if (msg.framingName) {chatMessage.framingName = String(msg.framingName);}
        if (msg.modelName) {chatMessage.modelName = String(msg.modelName);}
        if (msg.instanceName) {chatMessage.instanceName = String(msg.instanceName);}
        if (msg.instanceId) {chatMessage.instanceId = String(msg.instanceId);}
        if (typeof msg.isError === 'boolean') {chatMessage.isError = msg.isError;}

        validMessages.push(chatMessage);
    });

    let id = parsed.id;
    if (!id || typeof id !== 'string') {
        id = uuidv4();
        result.warnings.push(`Missing or invalid chat "id". Generated new ID: ${id}`);
    }

    let modelName = parsed.modelName;
    if (!modelName || typeof modelName !== 'string') {
        modelName = 'unknown';
        result.warnings.push('Missing or invalid "modelName". Defaulting to "unknown".');
    }

    let name = parsed.name;
    if (!name || typeof name !== 'string') {
        name = 'Imported Chat';
        result.warnings.push('Missing or invalid chat "name". Defaulting to "Imported Chat".');
    }

    let createdAt = parsed.createdAt;
    if (typeof createdAt !== 'number') {
        createdAt = Date.now();
        result.warnings.push('Missing or invalid "createdAt". Using current time.');
    }

    const chat: Chat = {
        id,
        modelName,
        name,
        messages: validMessages,
        createdAt,
    };

    if (parsed.activeFramingId && typeof parsed.activeFramingId === 'string') {
        chat.activeFramingId = parsed.activeFramingId;
    }

    result.chat = chat;
    return result;
}
