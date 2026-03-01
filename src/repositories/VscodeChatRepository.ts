import * as vscode from 'vscode';

import { IChatRepository } from '../contracts/IChatRepository';
import { Chat } from '../services/chatService';

export class VscodeChatRepository implements IChatRepository {
    private static readonly STORAGE_KEY = 'ollama-view.chats';

    constructor(private context: vscode.ExtensionContext) {}

    getAll(): Chat[] {
        return this.context.globalState.get<Chat[]>(VscodeChatRepository.STORAGE_KEY, []);
    }

    getById(id: string): Chat | undefined {
        return this.getAll().find((c) => c.id === id);
    }

    async save(chats: Chat[]): Promise<void> {
        await this.context.globalState.update(VscodeChatRepository.STORAGE_KEY, chats);
    }

    async saveOne(chat: Chat): Promise<void> {
        const chats = this.getAll();
        const index = chats.findIndex((c) => c.id === chat.id);
        if (index !== -1) {
            chats[index] = chat;
        } else {
            chats.push(chat);
        }
        await this.save(chats);
    }
}
