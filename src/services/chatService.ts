import { v4 as uuidv4 } from 'uuid';

import { IChatRepository } from '../contracts/IChatRepository';

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
    constructor(private repository: IChatRepository) {}

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
        const chats = this.repository.getAll();
        const newChat: Chat = {
            id: uuidv4(),
            modelName,
            name: this.getUniqueChatName('New Chat', chats),
            messages: [],
            createdAt: Date.now(),
        };
        chats.push(newChat);
        await this.repository.save(chats);
        return newChat;
    }

    async importChat(chatData: Chat, collisionAction: 'overwrite' | 'new' | 'abort'): Promise<Chat | undefined> {
        const chats = this.repository.getAll();
        const existingChatIndex = chats.findIndex((c) => c.id === chatData.id);

        if (existingChatIndex === -1) {
            // No collision, just import
            chats.push(chatData);
            await this.repository.save(chats);
            return chatData;
        }

        // Collision occurred
        if (collisionAction === 'abort') {
            return undefined;
        }

        if (collisionAction === 'overwrite') {
            chats[existingChatIndex] = chatData;
            await this.repository.save(chats);
            return chatData;
        }

        if (collisionAction === 'new') {
            const newChat = { ...chatData, id: uuidv4() };
            newChat.name = this.getUniqueChatName(chatData.name, chats);
            chats.push(newChat);
            await this.repository.save(chats);
            return newChat;
        }

        return undefined;
    }

    getChatsForModel(modelName: string): Chat[] {
        const chats = this.repository.getAll();
        return chats.filter((c) => c.modelName === modelName).sort((a, b) => b.createdAt - a.createdAt);
    }

    getChat(chatId: string): Chat | undefined {
        return this.repository.getById(chatId);
    }

    async deleteChat(chatId: string): Promise<void> {
        let chats = this.repository.getAll();
        chats = chats.filter((c) => c.id !== chatId);
        await this.repository.save(chats);
    }

    async deleteChatsForModel(modelId: string): Promise<void> {
        let chats = this.repository.getAll();
        chats = chats.filter((c) => c.modelName !== modelId);
        await this.repository.save(chats);
    }

    async setActiveFraming(chatId: string, framingId: string | undefined): Promise<void> {
        const chat = this.repository.getById(chatId);
        if (chat) {
            chat.activeFramingId = framingId;
            await this.repository.saveOne(chat);
        }
    }

    async addMessage(
        chatId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        metadata?: MessageMetadata,
    ): Promise<Chat | undefined> {
        const chat = this.repository.getById(chatId);
        if (!chat) {
            return undefined;
        }

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
            const otherChats = this.repository.getAll().filter((c: Chat) => c.id !== chatId);
            chat.name = this.getUniqueChatName(baseName, otherChats);
        }

        await this.repository.saveOne(chat);
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
        const chat = this.repository.getById(chatId);
        if (!chat) {
            return undefined;
        }

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

        await this.repository.saveOne(chat);
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
        const chats = this.repository.getAll();

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
        await this.repository.save(chats);
        return newChat;
    }

    async deleteMessagesFrom(chatId: string, index: number): Promise<Chat | undefined> {
        const chat = this.repository.getById(chatId);
        if (!chat) {
            return undefined;
        }

        chat.messages = chat.messages.slice(0, index);
        await this.repository.saveOne(chat);
        return chat;
    }

    async forkChatFrom(chatId: string, index: number): Promise<Chat | undefined> {
        const sourceChat = this.getChat(chatId);
        if (!sourceChat) {
            return undefined;
        }

        const messagesToKeep = sourceChat.messages.slice(0, index);
        const chats = this.repository.getAll();
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
        await this.repository.save(chats);
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
