# Implementation Plan: Advanced Model Configuration

## Overview
This plan outlines the steps to implement model instances (naming and descriptions) and advanced hardware/inference configuration in the Ollama View extension, with a strict focus on data compatibility.

## Phase 1: Data Model and Infrastructure (with Compatibility)
Implement the core data structures and service updates required to support multiple model instances and advanced parameters, ensuring both backward and forward compatibility.

- [ ] Task: Define Interfaces for Advanced Parameters and Model Instances
    - [ ] Update `src/models/` to include `AdvancedModelConfig` and `ModelInstance` interfaces.
    - [ ] Define the schema for hardware (num_gpu, num_thread, etc.) and inference (temperature, num_ctx, etc.) settings.
- [ ] Task: Implement Data Versioning and Migration Logic
    - [ ] Add a versioning field to the model settings schema.
    - [ ] Write failing tests for Version 1 to Version 2 migration in `src/test/modelSettingsService.test.ts`.
    - [ ] Write "Downgrade Simulation" tests to ensure Version 1 code doesn't crash with Version 2 data.
    - [ ] Write tests ensuring that fields unknown to the current version are **not deleted** when saving.
- [ ] Task: Update `ModelSettingsService` for Instance Management
    - [ ] Update `ModelSettingsService` to handle `globalState` with instance-aware keys.
    - [ ] Implement unique naming enforcement logic.
    - [ ] Confirm migration and compatibility tests pass.
- [ ] Task: Ollama API Integration for Model Defaults
    - [ ] Write failing tests for fetching model defaults in `src/test/ollamaApi.test.ts`.
    - [ ] Update `OllamaApi` to expose model configuration via the `show` endpoint.
    - [ ] Implement lazy-loading and caching for "Original" model values.
    - [ ] Confirm all tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Data Model and Infrastructure' (Protocol in workflow.md)

## Phase 2: UI - Model Setup Panel (Core Fields & Advanced Sections)
Enhance the Model Setup webview with the new instance naming fields and collapsible advanced configuration groups.

- [ ] Task: Implement Instance Naming and Description UI
    - [ ] Update `media/setup.html` and `src/webview/setup.ts` to include the editable name field and description text area.
    - [ ] Write failing tests for the name/description UI updates in `src/test/setupPanel.test.ts`.
    - [ ] Implement the two-way binding for these fields.
    - [ ] Confirm all tests pass.
- [ ] Task: Build Advanced Collapsible Sections
    - [ ] Update `media/setup.html` to add `<details>` sections for "Hardware & Performance" and "Inference & Generation Limits".
    - [ ] Style the new sections in `media/common-webview.css`.
- [ ] Task: Implement Interactive Form Components
    - [ ] Create specialized UI components: Slider+Input for ranges, Toggles for booleans.
    - [ ] Implement strict validation for numeric fields.
    - [ ] Write failing tests for parameter validation and UI updates in `src/test/setupPanel.test.ts`.
    - [ ] Confirm all tests pass.
- [ ] Task: Implement "Reset to Original" Functionality
    - [ ] Implement the "Reset" button logic for each group.
    - [ ] Write failing tests for the reset functionality in `src/test/setupPanel.test.ts`.
    - [ ] Confirm all tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI - Model Setup Panel' (Protocol in workflow.md)

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
