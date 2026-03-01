import { Chat } from '../services/chatService';

export interface IChatRepository {
    getAll(): Chat[];
    getById(id: string): Chat | undefined;
    save(chats: Chat[]): Promise<void>;
    saveOne(chat: Chat): Promise<void>;
}
