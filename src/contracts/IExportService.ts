import { Chat } from '../services/chatService';

export interface IExportService {
    toMarkdown(chat: Chat): string;
    toJSON(chat: Chat): string;
}
