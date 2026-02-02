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

    async createChat(modelName: string): Promise<Chat> {
        const chats = this.getAllChats();
        const newChat: Chat = {
            id: uuidv4(),
            modelName,
            name: 'New Chat',
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

        // Update name if it's the first user message and name is still default
        if (role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1 && chat.name === 'New Chat') {
            chat.name = content.slice(0, 30) + (content.length > 30 ? '...' : '');
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

        const newChat: Chat = {
            id: uuidv4(),
            modelName: sourceChat.modelName,
            name: newContent.slice(0, 30) + (newContent.length > 30 ? '...' : ''),
            messages: sourceChat.messages.slice(0, messageIndex),
            createdAt: Date.now(),
        };

        newChat.messages.push({
            role: 'user',
            content: newContent,
            timestamp: Date.now(), // New timestamp for the new message
        });

        const chats = this.getAllChats();
        chats.push(newChat);
        await this.saveChats(chats);
        return newChat;
    }
}
