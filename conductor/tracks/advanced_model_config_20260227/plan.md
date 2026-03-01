# Implementation Plan: Advanced Model Configuration

## Overview
This plan outlines the steps to implement model instances (naming and descriptions) and advanced hardware/inference configuration in the Ollama View extension, with a strict focus on data compatibility.

## Phase 1: Data Model and Infrastructure (with Compatibility) [checkpoint: a83c45b]
Implement the core data structures and service updates required to support multiple model instances and advanced parameters, ensuring both backward and forward compatibility.

- [x] Task: Define Interfaces for Advanced Parameters and Model Instances (fb2cfc4)
    - [x] Update `src/models/` to include `AdvancedModelConfig` and `ModelInstance` interfaces.
    - [x] Define the schema for hardware (num_gpu, num_thread, etc.) and inference (temperature, num_ctx, etc.) settings.
- [x] Task: Implement Data Versioning and Migration Logic (e393110)
    - [x] Add a versioning field to the model settings schema.
    - [x] Write failing tests for Version 1 to Version 2 migration in `src/test/modelSettingsService.test.ts`.
    - [x] Write "Downgrade Simulation" tests to ensure Version 1 code doesn't crash with Version 2 data.
    - [x] Write tests ensuring that fields unknown to the current version are **not deleted** when saving.
- [x] Task: Update ModelSettingsService for Instance Management (e393110)
    - [x] Update `ModelSettingsService` to handle `globalState` with instance-aware keys.
    - [x] Implement unique naming enforcement logic.
    - [x] Confirm migration and compatibility tests pass.
- [x] Task: Ollama API Integration for Model Defaults (40bf9d2)
    - [x] Write failing tests for fetching model defaults in `src/test/ollamaApi.test.ts`.
    - [x] Update `OllamaApi` to expose model configuration via the `show` endpoint.
    - [x] Implement lazy-loading and caching for "Original" model values.
    - [x] Confirm all tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Data Model and Infrastructure' (Protocol in workflow.md)

## Phase 2: UI - Model Setup Panel (Core Fields & Advanced Sections)
Enhance the Model Setup webview with the new instance naming fields and collapsible advanced configuration groups.

- [x] Task: Implement Instance Naming and Description UI (c05565a)
    - [x] Update `media/setup.html` and `src/webview/setup.ts` to include the editable name field and description text area.
    - [x] Write failing tests for the name/description UI updates in `src/test/setupPanel.test.ts`.
    - [x] Implement the two-way binding for these fields.
    - [x] Confirm all tests pass.
- [x] Task: Build Advanced Collapsible Sections (c05565a)
    - [x] Update `media/setup.html` to add `<details>` sections for "Hardware & Performance" and "Inference & Generation Limits".
    - [x] Style the new sections in `media/common-webview.css`.
- [x] Task: Implement Interactive Form Components (c05565a)
    - [x] Create specialized UI components: Slider+Input for ranges, Toggles for booleans.
    - [x] Implement strict validation for numeric fields.
    - [x] Write failing tests for parameter validation and UI updates in `src/test/setupPanel.test.ts`.
    - [x] Confirm all tests pass.
- [x] Task: Implement "Reset to Original" Functionality (c05565a)
    - [x] Implement the "Reset" button logic for each group.
    - [x] Write failing tests for the reset functionality in `src/test/setupPanel.test.ts`.
    - [x] Confirm all tests pass.
- [~] Task: Conductor - User Manual Verification 'Phase 2: UI - Model Setup Panel' (Protocol in workflow.md)

## Phase 3: Sidebar and Instance Selection
Update the extension's sidebar to support grouping model instances and navigating between them.

- [ ] Task: Grouped Sidebar Display
    - [ ] Update `src/providers/ollamaProvider.ts` to group instances under their base model.
    - [ ] Write failing tests for the grouped tree structure in `src/test/ollamaProvider.test.ts`.
    - [ ] Implement the expandable list logic.
    - [ ] Confirm all tests pass.
- [ ] Task: Handle Instance Selection and Context
    - [ ] Update command handlers to correctly identify the selected instance.
    - [ ] Ensure clicking an instance correctly opens the chat or setup panel with the specific instance's context.
    - [ ] Write failing tests for instance selection commands.
    - [ ] Confirm all tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Sidebar and Instance Selection' (Protocol in workflow.md)

## Phase 4: Chat Integration and Final Verification
Ensure that the advanced configuration parameters are correctly applied during model execution and chat sessions.

- [ ] Task: Pass Advanced Parameters to Ollama Chat
    - [ ] Update `src/chatService.ts` to include the `AdvancedModelConfig` in the API request payload.
    - [ ] Write failing tests to verify that advanced parameters are sent to the Ollama API.
    - [ ] Confirm all tests pass.
- [ ] Task: Final System Integration Test
    - [ ] Run a comprehensive test suite covering the entire flow from instance creation to customized chat execution.
    - [ ] Verify that hardware-specific flags (like `num_gpu`) are correctly applied.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Chat Integration and Final Verification' (Protocol in workflow.md)

## Phase 5: Post-Implementation & Documentation
Finalize the track with updated visuals and documentation.

- [ ] Task: Capture Updated Screenshots
    - [ ] Take screenshots of the new sidebar grouping.
    - [ ] Take screenshots of the advanced Setup panel (expanded sections, reset icons, dice icon).
    - [ ] Take screenshots of the updated Chat panel (tab titles, error messages).
- [x] Task: Review README and Product Documentation (docs synchronized)
    - [x] Update README.md to highlight "Advanced Model Configuration" and "Named Instances".
    - [x] Ensure wording is compelling for developers.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Post-Implementation & Documentation' (Protocol in workflow.md)
