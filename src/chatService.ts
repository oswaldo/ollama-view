import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';

export interface MessageMetadata {
    systemTurnPrefix?: string;
    userPrefix?: string;
    userSuffix?: string;
    systemTurnSuffix?: string;
    // Model Framing metadata
    framingId?: string;
    framingName?: string;
    // Turn metadata
    modelName?: string;
    instanceName?: string;
    instanceId?: string;
    isError?: boolean;
}

export interface ChatMessage extends MessageMetadata {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface Chat {
    id: string;
    modelName: string;
    name: string; // Title of the chat (e.g. first user message snippet)
    messages: ChatMessage[];
    createdAt: number;
    activeFramingId?: string;
}

export class ChatService {
    private static readonly STORAGE_KEY = 'ollama-view.chats';

    constructor(private context: vscode.ExtensionContext) {}

    private getAllChats(): Chat[] {
        return this.context.globalState.get<Chat[]>(ChatService.STORAGE_KEY, []);
    }

    private async saveChats(chats: Chat[]): Promise<void> {
        await this.context.globalState.update(ChatService.STORAGE_KEY, chats);
    }

    private getUniqueChatName(baseName: string, chats: Chat[]): string {
        const existingNames = new Set(chats.map((c) => c.name));
        if (!existingNames.has(baseName)) {
            return baseName;
        }

        let i = 2;
        while (true) {
            const newName = `${baseName} (${i})`;
            if (!existingNames.has(newName)) {
                return newName;
            }
            i++;
        }
    }

    async createChat(modelName: string): Promise<Chat> {
        const chats = this.getAllChats();
        const newChat: Chat = {
            id: uuidv4(),
            modelName,
            name: this.getUniqueChatName('New Chat', chats),
            messages: [],
            createdAt: Date.now(),
        };
        chats.push(newChat);
        await this.saveChats(chats);
        return newChat;
    }

    getChatsForModel(modelName: string): Chat[] {
        const chats = this.getAllChats();
        return chats.filter((c) => c.modelName === modelName).sort((a, b) => b.createdAt - a.createdAt);
    }

    getChat(chatId: string): Chat | undefined {
        return this.getAllChats().find((c) => c.id === chatId);
    }

    async deleteChat(chatId: string): Promise<void> {
        let chats = this.getAllChats();
        chats = chats.filter((c) => c.id !== chatId);
        await this.saveChats(chats);
    }

    async setActiveFraming(chatId: string, framingId: string | undefined): Promise<void> {
        const chats = this.getAllChats();
        const chat = chats.find((c) => c.id === chatId);
        if (chat) {
            chat.activeFramingId = framingId;
            await this.saveChats(chats);
        }
    }

    async addMessage(
        chatId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        metadata?: MessageMetadata,
    ): Promise<Chat | undefined> {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex((c) => c.id === chatId);
        if (chatIndex === -1) {
            return undefined;
        }

        const chat = chats[chatIndex];

        // Default modelName from chat if not provided in metadata
        const finalMetadata = {
            modelName: chat.modelName,
            ...metadata,
        };

        chat.messages.push({
            role,
            content,
            timestamp: Date.now(),
            ...finalMetadata,
        });

        // Update name if it's the first user message and name is still default (or default with number)
        if (
            role === 'user' &&
            chat.messages.filter((m) => m.role === 'user').length === 1 &&
            chat.name.startsWith('New Chat')
        ) {
            const baseName = content.slice(0, 30) + (content.length > 30 ? '...' : '');
            const otherChats = chats.filter((c) => c.id !== chatId);
            chat.name = this.getUniqueChatName(baseName, otherChats);
        }

        chats[chatIndex] = chat;
        await this.saveChats(chats);
        return chat;
    }

    async truncateChat(
        chatId: string,
        messageIndex: number,
        newContent: string,
        metadata?: MessageMetadata,
    ): Promise<Chat | undefined> {
        if (!newContent || newContent.trim() === '') {
            return this.getChat(chatId);
        }
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex((c) => c.id === chatId);
        if (chatIndex === -1) {
            return undefined;
        }

        const chat = chats[chatIndex];
        chat.messages = chat.messages.slice(0, messageIndex);

        const finalMetadata = {
            modelName: chat.modelName,
            ...metadata,
        };

        chat.messages.push({
            role: 'user',
            content: newContent,
            timestamp: Date.now(),
            ...finalMetadata,
        });

        chats[chatIndex] = chat;
        await this.saveChats(chats);
        return chat;
    }

    async forkChat(
        chatId: string,
        messageIndex: number,
        newContent: string,
        metadata?: MessageMetadata,
    ): Promise<Chat | undefined> {
        if (!newContent || newContent.trim() === '') {
            return undefined;
        }
        const sourceChat = this.getChat(chatId);
        if (!sourceChat) {
            return undefined;
        }

        const baseName = newContent.slice(0, 30) + (newContent.length > 30 ? '...' : '');
        const chats = this.getAllChats();

        const newChat: Chat = {
            id: uuidv4(),
            modelName: sourceChat.modelName,
            name: this.getUniqueChatName(baseName, chats),
            messages: sourceChat.messages.slice(0, messageIndex),
            createdAt: Date.now(),
            activeFramingId: sourceChat.activeFramingId,
        };

        const finalMetadata = {
            modelName: newChat.modelName,
            ...metadata,
        };

        newChat.messages.push({
            role: 'user',
            content: newContent,
            timestamp: Date.now(),
            ...finalMetadata,
        });

        chats.push(newChat);
        await this.saveChats(chats);
        return newChat;
    }

    async deleteMessagesFrom(chatId: string, index: number): Promise<Chat | undefined> {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex((c) => c.id === chatId);
        if (chatIndex === -1) {
            return undefined;
        }

        const chat = chats[chatIndex];
        chat.messages = chat.messages.slice(0, index);

        chats[chatIndex] = chat;
        await this.saveChats(chats);
        return chat;
    }

    async forkChatFrom(chatId: string, index: number): Promise<Chat | undefined> {
        const sourceChat = this.getChat(chatId);
        if (!sourceChat) {
            return undefined;
        }

        const messagesToKeep = sourceChat.messages.slice(0, index);
        const chats = this.getAllChats();
        const baseName = sourceChat.name;

        const newChat: Chat = {
            id: uuidv4(),
            modelName: sourceChat.modelName,
            name: this.getUniqueChatName(baseName, chats),
            messages: messagesToKeep,
            createdAt: Date.now(),
            activeFramingId: sourceChat.activeFramingId,
        };

        chats.push(newChat);
        await this.saveChats(chats);
        return newChat;
    }

    getPaginatedMessages(chatId: string, limit: number, offset: number): { messages: ChatMessage[]; total: number } {
        const chat = this.getChat(chatId);
        if (!chat) {
            return { messages: [], total: 0 };
        }
        const total = chat.messages.length;
        const end = total - offset;
        const start = end - limit;

        return {
            messages: chat.messages.slice(Math.max(0, start), Math.max(0, end)),
            total,
        };
    }
}
