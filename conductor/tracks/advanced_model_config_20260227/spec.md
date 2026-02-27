# Specification: Advanced Model Configuration

## Overview
This track introduces the ability to create and manage multiple instances of the same Ollama model with unique names and advanced configuration parameters. Users will be able to customize hardware performance and inference limits for each instance, providing granular control for local LLM experimentation.

## Functional Requirements

### 1. Model Instances & Naming
- **Named Instances**: Users can differentiate between the base model (e.g., `tinyllama:latest`) and a custom instance name (e.g., "Small Test Model").
- **Instance Rename**: The current setup panel title "Setup: [modelname:version]" will be replaced by an editable text field for the instance name.
- **Base Model Reference**: A read-only field will display the original base model name.
- **Instance Description**: An optional text area for users to save notes about their instance's purpose.
- **Uniqueness**: The extension will enforce unique instance names within the same base model group.

### 2. Advanced Configuration Groups
Two new collapsible sections (using `<details>`, closed by default) will be added to the Model Setup panel:

#### A. Hardware & Performance
- **Controls**: `num_gpu`, `num_thread`, `use_mmap`, `use_mlock`.
- **Reset**: A "Reset to Original" button to revert all values in this group to the model's default (fetched via Ollama API).

#### B. Inference & Generation Limits
- **Controls**: `num_ctx`, `num_predict`, `temperature`, `top_p`, `top_k`, `repeat_penalty`, `seed`, `stop`.
- **Reset**: A "Reset to Original" button to revert all values in this group to the model's default.

### 3. User Interface Components
- **Sliders + Inputs**: Numeric ranges (e.g., temperature) will use a slider alongside a numeric input field for precision.
- **Toggles**: Boolean values (e.g., `use_mmap`) will use toggle switches.
- **Validation**: Strict UI-level validation will enforce valid ranges for all numeric parameters based on Ollama standards.

### 4. Sidebar Integration
- **Grouped Display**: Model instances will be grouped under their base model name in the sidebar.
- **Expandable List**: Clicking a model name will expand a list of its named instances.
- **Selection**: Users start a chat by selecting a specific instance from the expanded list.

### 5. Data Management & Compatibility
- **Persistence**: All instance names, descriptions, and advanced parameters will be stored within the existing `globalState` model settings.
- **Backward Compatibility**: Existing model settings (Version 1) must be transparently migrated or supported without user intervention.
- **Forward Compatibility**: The data structure must be designed so that if a user downgrades the extension, the older version can still read the basic model information without crashing or corrupting the state.
- **Lazy Loading**: "Original" values for reset functionality will be fetched from the Ollama API when the setup panel is first opened for a given model.

## Non-Functional Requirements
- **Performance**: Fetching model defaults should be non-blocking and happen lazily.
- **Consistency**: UI components should match the existing "Ollama View" aesthetic and VS Code's native look and feel.

## Acceptance Criteria
- [ ] Users can create and rename multiple instances of the same model.
- [ ] The sidebar correctly groups and expands instances under their base model.
- [ ] Advanced parameters are correctly persisted and applied during chat sessions.
- [ ] The "Reset" button correctly restores original model values fetched from Ollama.
- [ ] **Verification**: Unit tests prove that Version 1 data is correctly migrated.
- [ ] **Verification**: Manual/Unit tests prove that a "downgraded" extension state remains stable.

## Out of Scope
- Modifying the underlying model files on disk (all changes are session/instance-level configurations).
- Support for remote Ollama instances with different hardware capabilities (assumes local hardware context).
