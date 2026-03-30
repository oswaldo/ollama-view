import { IExportService } from '../contracts/IExportService';
import { Chat } from './chatService';

export class ExportService implements IExportService {
    toMarkdown(chat: Chat): string {
        const lines: string[] = [];

        // Metadata Header
        lines.push(`# Chat: ${chat.name}`);
        lines.push(`**Model:** ${chat.modelName}`);
        lines.push(`**Date:** ${new Date(chat.createdAt).toLocaleString()}`);
        if (chat.activeFramingId) {
            lines.push(`**Framing ID:** ${chat.activeFramingId}`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');

        // Messages
        for (const msg of chat.messages) {
            const roleCap = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
            lines.push(`### ${roleCap}`);
            
            // Turn metadata (optional display)
            if (msg.timestamp) {
                lines.push(`*${new Date(msg.timestamp).toLocaleString()}*`);
            }
            if (msg.isError) {
                lines.push('**[Error]**');
            }
            lines.push('');
            lines.push(msg.content);
            lines.push('');
        }

        return lines.join('\n');
    }

    toJSON(chat: Chat): string {
        return JSON.stringify(chat, null, 2);
    }
}
