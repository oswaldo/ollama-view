import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
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
}

export class ChatService {
    private static readonly STORAGE_KEY = 'ollama-view.chats';

    constructor(private context: vscode.ExtensionContext) { }

    private getAllChats(): Chat[] {
        return this.context.globalState.get<Chat[]>(ChatService.STORAGE_KEY, []);
    }

    private async saveChats(chats: Chat[]): Promise<void> {
        await this.context.globalState.update(ChatService.STORAGE_KEY, chats);
    }

    private getUniqueChatName(baseName: string, chats: Chat[]): string {
        const existingNames = new Set(chats.map(c => c.name));
        if (!existingNames.has(baseName)) {
            return baseName;
        }

        // Regex to parse name and optional number suffix (e.g., "Name (2)")
        // Matches "Name" in group 1, and "2" in group 3.
        const regex = /^(.*?)(\s*\((\d+)\))?$/;

        // Find all names that start with baseName
        let maxNumber = 1;
        let found = false;

        // If baseName itself has a number, we should handle it, but the requirement is:
        // "New Chat" -> "New Chat (2)"
        // "Hello" (if exists) -> "Hello (2)"
        // "Hello (5)" (if exists) -> "Hello (6)"

        // Let's iterate all existing names to find collisions
        for (const name of existingNames) {
            const match = name.match(regex);
            if (match) {
                const currentBase = match[1];
                const numberPart = match[3] ? parseInt(match[3], 10) : 1;

                if (currentBase === baseName) {
                    if (numberPart >= maxNumber) {
                        maxNumber = numberPart;
                        found = true;
                    }
                }
            }
        }

        if (found) {
            return `${baseName} (${maxNumber + 1})`;
        }

        return baseName;
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
        return chats.filter(c => c.modelName === modelName).sort((a, b) => b.createdAt - a.createdAt);
    }

    getChat(chatId: string): Chat | undefined {
        return this.getAllChats().find(c => c.id === chatId);
    }

    async deleteChat(chatId: string): Promise<void> {
        let chats = this.getAllChats();
        chats = chats.filter(c => c.id !== chatId);
        await this.saveChats(chats);
    }

    async addMessage(chatId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<Chat | undefined> {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === chatId);
        if (chatIndex === -1) {
            return undefined;
        }

        const chat = chats[chatIndex];
        chat.messages.push({
            role,
            content,
            timestamp: Date.now(),
        });

        // Update name if it's the first user message and name is still default (or default with number)
        if (role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1 && chat.name.startsWith('New Chat')) {
            const baseName = content.slice(0, 30) + (content.length > 30 ? '...' : '');
            // We need to calculate unique name against OTHER chats, but the current chat is already in the list if we look at 'chats' array from getAllChats.
            // However, we are modifying 'chat' object which is a reference if obtained via find (but getAllChats returns a fresh array from globalState usually? No, globalState.get returns value).
            // Actually, getAllChats returns the array from memento.
            // We should check uniqueness against OTHER chats.
            const otherChats = chats.filter(c => c.id !== chatId);
            chat.name = this.getUniqueChatName(baseName, otherChats);
        }

        chats[chatIndex] = chat;
        await this.saveChats(chats);
        return chat;
    }
    async truncateChat(chatId: string, messageIndex: number, newContent: string): Promise<Chat | undefined> {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === chatId);
        if (chatIndex === -1) {
            return undefined;
        }

        const chat = chats[chatIndex];
        // Keep messages up to the index (exclusive of the one being edited, as we will replace it/add new one)
        // Actually, if we are editing message at index N, we want to keep 0..N-1, and then add the new message.
        // Wait, the UI will likely send the index of the message being edited.
        // If I edit message 2, I want message 0 and 1 to stay, message 2 to be replaced by new content, and 3+ to be removed.
        chat.messages = chat.messages.slice(0, messageIndex);

        chat.messages.push({
            role: 'user',
            content: newContent,
            timestamp: Date.now(),
        });

        chats[chatIndex] = chat;
        await this.saveChats(chats);
        return chat;
    }

    async forkChat(chatId: string, messageIndex: number, newContent: string): Promise<Chat | undefined> {
        const sourceChat = this.getChat(chatId);
        if (!sourceChat) {
            return undefined;
        }

        const baseName = newContent.slice(0, 30) + (newContent.length > 30 ? '...' : '');
        const chats = this.getAllChats(); // Get latest

        const newChat: Chat = {
            id: uuidv4(),
            modelName: sourceChat.modelName,
            name: this.getUniqueChatName(baseName, chats),
            messages: sourceChat.messages.slice(0, messageIndex),
            createdAt: Date.now(),
        };

        newChat.messages.push({
            role: 'user',
            content: newContent,
            timestamp: Date.now(), // New timestamp for the new message
        });

        chats.push(newChat);
        await this.saveChats(chats);
        return newChat;
    }

    async deleteMessagesFrom(chatId: string, index: number): Promise<Chat | undefined> {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === chatId);
        if (chatIndex === -1) {
            return undefined;
        }

        const chat = chats[chatIndex];
        // Remove message at index and all subsequent
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

        // We want to keep messages up to index (exclusive)
        // If we fork at index 1 (assistant response), we want message 0 (user prompt).
        const messagesToKeep = sourceChat.messages.slice(0, index);

        // Ensure the last message is a user message (sanity check, though not strictly required by logic, it makes sense for a chat flow)
        // For now, simple slice is enough.

        const chats = this.getAllChats();
        const baseName = sourceChat.name + ' (Fork)';

        const newChat: Chat = {
            id: uuidv4(),
            modelName: sourceChat.modelName,
            name: this.getUniqueChatName(baseName, chats),
            messages: messagesToKeep, // Clone? Slice returns new array
            createdAt: Date.now(),
        };

        chats.push(newChat);
        await this.saveChats(chats);
        return newChat;
    }
}
