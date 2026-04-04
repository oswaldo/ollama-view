import * as vscode from 'vscode';

import { validateChatImport } from '../chatImportValidator';
import { IOllamaClient } from '../contracts/IOllamaClient';
import { ChatService, MessageMetadata } from './chatService';
import { FramingService } from './framingService';
import { ModelService } from './modelService';

export interface ChatOrchestrationResult {
    fullResponse: string;
}

export class ChatOrchestrator {
    constructor(
        private chatService: ChatService,
        private modelService: ModelService,
        private framingService: FramingService,
        private ollamaClient: IOllamaClient,
    ) {}

    /**
     * Orchestrates a single chat turn:
     * 1. Prepares messages for Ollama (including framing prefixes/suffixes).
     * 2. Calls the Ollama API.
     * 3. Streams tokens to the provided callback.
     * 4. Saves the final assistant message to history.
     */
    async generateResponse(
        chatId: string,
        onToken: (token: string) => void,
        onStart?: () => void,
    ): Promise<ChatOrchestrationResult> {
        const chat = this.chatService.getChat(chatId);
        if (!chat) {
            throw new Error(`Chat ${chatId} not found`);
        }

        const instance = this.modelService.getSettings(chat.modelName);
        const apiMessages: { role: string; content: string }[] = [];

        for (const m of chat.messages) {
            if (m.role === 'system') {
                apiMessages.push({ role: 'system', content: m.content });
            } else if (m.role === 'user') {
                if (m.systemTurnPrefix) {
                    apiMessages.push({ role: 'system', content: m.systemTurnPrefix });
                }

                let userContent = m.content;
                if (m.userPrefix) {
                    userContent = `${m.userPrefix}${userContent}`;
                }
                if (m.userSuffix) {
                    userContent = `${userContent}${m.userSuffix}`;
                }
                apiMessages.push({ role: 'user', content: userContent });

                if (m.systemTurnSuffix) {
                    apiMessages.push({ role: 'system', content: m.systemTurnSuffix });
                }
            } else {
                apiMessages.push({ role: m.role, content: m.content });
            }
        }

        let fullResponse = '';
        let hasStarted = false;

        const ollamaName = instance.ollamaModelName || instance.modelName;
        const options = instance.config;

        await this.ollamaClient.chat(
            ollamaName,
            apiMessages,
            (token) => {
                if (!hasStarted) {
                    hasStarted = true;
                    if (onStart) {
                        onStart();
                    }
                }
                fullResponse += token;
                onToken(token);
            },
            options,
        );

        const activeFramingId = chat.activeFramingId;
        const activeFraming = activeFramingId ? this.framingService.getFraming(activeFramingId) : undefined;

        await this.chatService.addMessage(chat.id, 'assistant', fullResponse, {
            modelName: instance.modelName,
            instanceName: instance.name,
            instanceId: instance.id,
            framingId: activeFraming?.id,
            framingName: activeFraming?.name,
        });

        return { fullResponse };
    }

    /**
     * Prepares and adds a user message to the chat, handling system prompts and metadata.
     */
    async handleUserMessage(
        chatId: string,
        text: string,
        options?: {
            activeFramingId?: string;
        },
    ): Promise<void> {
        const chat = this.chatService.getChat(chatId);
        if (!chat) {
            throw new Error(`Chat ${chatId} not found`);
        }

        const instance = this.modelService.getSettings(chat.modelName);
        let settings = { ...instance };
        let activeFraming = undefined;

        const framingId = options?.activeFramingId || chat.activeFramingId;
        if (framingId) {
            activeFraming = this.framingService.getFraming(framingId);
            if (activeFraming) {
                settings = {
                    ...settings,
                    systemMessage: activeFraming.systemMessage,
                };
            }
        }

        const lastSystemPrompt = chat.messages.filter((m) => m.role === 'system').pop()?.content;

        if (chat.messages.length === 0 || (settings.systemMessage && settings.systemMessage !== lastSystemPrompt)) {
            await this.chatService.addMessage(chat.id, 'system', settings.systemMessage || '', {
                modelName: instance.modelName,
                instanceName: instance.name,
                instanceId: instance.id,
                framingId: activeFraming?.id,
                framingName: activeFraming?.name,
            });
        }

        const metadata: MessageMetadata = {
            systemTurnPrefix: activeFraming?.systemTurnPrefix,
            userPrefix: activeFraming?.userMessagePrefix,
            userSuffix: activeFraming?.userMessageSuffix,
            systemTurnSuffix: activeFraming?.systemTurnSuffix,
            framingId: activeFraming?.id,
            framingName: activeFraming?.name,
            modelName: instance.modelName,
            instanceName: instance.name,
            instanceId: instance.id,
        };

        await this.chatService.addMessage(chat.id, 'user', text.trim(), metadata);
    }

    /**
     * Orchestrates importing a chat from JSON, including validation, model resolution, and collision handling.
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    async handleChatImport(jsonString: string, targetModelName?: string): Promise<any> {
        const validationResult = validateChatImport(jsonString);

        if (!validationResult.chat) {
            await vscode.window.showErrorMessage(
                `Failed to import chat:\n${validationResult.errors.join('\n')}`
            );
            return undefined;
        }

        const importedChat = validationResult.chat;

        if (validationResult.warnings.length > 0) {
            const proceed = await vscode.window.showWarningMessage(
                `Chat import has warnings:\n${validationResult.warnings.join('\n')}`,
                { modal: true },
                'Proceed (Best Effort)',
                'Abort'
            );
            if (proceed !== 'Proceed (Best Effort)') {
                return undefined;
            }
        }

        if (targetModelName) {
            importedChat.modelName = targetModelName;
        } else {
            // Check if model exists locally
            const localModels = await this.ollamaClient.listModels();
            const modelExists = localModels.some((m) => m.name === importedChat.modelName || m.name === `${importedChat.modelName}:latest`);

            if (!modelExists) {
                const action = await vscode.window.showInformationMessage(
                    `The model '${importedChat.modelName}' is not available locally. What would you like to do?`,
                    { modal: true },
                    'Download & Import',
                    'Import Anyway',
                    'Cancel'
                );

                if (action === 'Cancel' || !action) {
                    return undefined;
                }

                if (action === 'Download & Import') {
                    try {
                        await vscode.window.withProgress(
                            {
                                location: vscode.ProgressLocation.Notification,
                                title: `Downloading ${importedChat.modelName}...`,
                                cancellable: false,
                            },
                            async (progress) => {
                                await this.ollamaClient.pullModel(importedChat.modelName, (status, completed, total) => {
                                    if (completed && total) {
                                        const p = Math.round((completed / total) * 100);
                                        progress.report({ message: `${p}% - ${status}` });
                                    } else {
                                        progress.report({ message: status });
                                    }
                                });
                            }
                        );
                    } catch (e: any) {
                        await vscode.window.showErrorMessage(`Failed to download model: ${e.message}`);
                        return undefined;
                    }
                }
            }
        }

        const existingChat = this.chatService.getChat(importedChat.id);
        let collisionAction: 'overwrite' | 'new' | 'abort' = 'new';

        if (existingChat) {
            const action = await vscode.window.showInformationMessage(
                `A chat with this ID already exists. Do you want to overwrite it or import as a new chat?`,
                { modal: true },
                'Overwrite',
                'Import as New',
                'Cancel'
            );

            if (action === 'Cancel' || !action) {
                return undefined;
            }

            collisionAction = action === 'Overwrite' ? 'overwrite' : 'new';
        }

        return await this.chatService.importChat(importedChat, collisionAction);
    }
}
