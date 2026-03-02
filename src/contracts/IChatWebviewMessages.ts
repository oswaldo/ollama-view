import { ChatMessage } from '../services/chatService';

/**
 * Commands sent from the Chat Webview to the ChatPanel (Extension).
 */
export type ChatWebviewToExtensionCommand =
    | {
          command: 'sendMessage';
          text: string;
          editOptions?: { mode: 'truncate' | 'fork'; index: number };
          framingId?: string;
      }
    | { command: 'requestFraming' }
    | { command: 'revertFraming' }
    | { command: 'requestMoreActions' }
    | { command: 'requestLoadMore'; offset: number }
    | { command: 'requestTruncate'; index: number; content: string; framingId?: string; framingName?: string }
    | { command: 'requestFork'; index: number; content: string; framingId?: string; framingName?: string }
    | { command: 'requestRegenerate'; index: number }
    | { command: 'requestForkAssistant'; index: number };

/**
 * Commands sent from the ChatPanel (Extension) to the Chat Webview.
 */
export type ChatExtensionToWebviewCommand =
    | {
          command: 'initState';
          modelName: string;
          messages: ChatMessage[];
          total: number;
          activeFramingId?: string;
          activeFramingName?: string;
      }
    | { command: 'setMessages'; messages: ChatMessage[] }
    | { command: 'updateFraming'; framingId?: string; framingName?: string }
    | {
          command: 'addMessage';
          role: 'user' | 'assistant' | 'system' | 'error';
          content: string;
          systemTurnPrefix?: string;
          userPrefix?: string;
          userSuffix?: string;
          systemTurnSuffix?: string;
          framingId?: string;
          framingName?: string;
          modelName?: string;
          isError?: boolean;
      }
    | { command: 'startAssistantMessage'; modelName?: string }
    | { command: 'appendToken'; content: string }
    | { command: 'endAssistantMessage' }
    | {
          command: 'enterEditMode';
          mode: 'truncate' | 'fork';
          index: number;
          content: string;
          framingId?: string;
          framingName?: string;
      }
    | { command: 'addErrorMessage'; content: string }
    | { command: 'setLoading'; loading: boolean }
    | { command: 'moreMessagesLoaded'; messages: ChatMessage[]; total: number };
