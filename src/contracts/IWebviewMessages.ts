import { ModelInstance } from '../models/modelInstance';
import { OllamaModel, OllamaShowResponse } from '../ollamaApi';

/**
 * Commands sent from the Setup Webview to the SetupPanel (VS Code extension side).
 */
export type SetupWebviewToExtensionCommand =
    | { command: 'save'; instance: ModelInstance }
    | { command: 'applyFraming' }
    | { command: 'resetGroup'; group: 'hardware' | 'inference' }
    | { command: 'cancel' };

/**
 * Commands sent from the SetupPanel (VS Code extension side) to the Setup Webview.
 */
export type SetupExtensionToWebviewCommand =
    | {
          command: 'init';
          model: OllamaModel;
          settings: ModelInstance;
          originalValues?: OllamaShowResponse;
          originalParams?: Record<string, string | number | boolean | string[]>;
          defaultMessage: string;
          isRunning: boolean;
      }
    | {
          command: 'updateFields';
          settings: Partial<ModelInstance>;
      };
