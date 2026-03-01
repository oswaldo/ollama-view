# Specification: Dynamic Model Tree Hierarchy

## Overview
Currently, the model tree in the side panel uses a fixed three-level hierarchy: Model Group (Base Model) -> Instance -> Chat. This structure adds an unnecessary level of nesting for users who only use the base model without custom instances. This track implements a dynamic tree structure that flattens the hierarchy when only a single instance of a model exists.

## Functional Requirements

### 1. Flattened View (Single Instance)
- **Condition:** When a base model has exactly one instance (typically the "default" instance created upon pulling the model) and no other custom instances.
- **Behavior:**
    - The root-level node represents the model instance directly.
    - The label for the root node should be the Instance Name.
    - The icon for the root node should be the Base Model Icon (model-icon.svg).
    - Chat nodes are direct children of this root-level node.
- **Structure:** `Instance (Root) -> Chat (Leaf)`

### 2. Grouped View (Multiple Instances)
- **Condition:** When a base model has two or more instances (e.g., the default instance plus one or more custom instances).
- **Behavior:**
    - The tree reverts to the current hierarchical structure.
    - The root-level node represents the Model Group (Base Model).
    - Instances are children of the Model Group.
    - Chats are children of their respective Instances.
- **Structure:** `Model Group (Root) -> Instance -> Chat (Leaf)`

### 3. Dynamic Transition
- The tree view must automatically refresh and switch between Flattened and Grouped views when:
    - A new custom instance is created from a base model.
    - A custom instance is deleted, leaving only one instance remaining.
    - A new model is pulled (initial state: Flattened).

## Non-Functional Requirements
- **Performance:** Tree transitions should be seamless and not cause noticeable lag in the side panel.
- **Consistency:** The UI should remain consistent with the overall VS Code aesthetic and existing `ollama-view` patterns.

## Acceptance Criteria
- [ ] If I have only pulled `llama3` and haven't created any instances, `llama3` appears as a root node with its chats directly inside.
- [ ] If I create a custom instance "My Llama" from `llama3`, the tree updates to show `llama3` as a folder containing both the default instance and "My Llama".
- [ ] If I delete "My Llama", the tree updates to show the remaining `llama3` instance as a root node again.
- [ ] The icons and labels correctly reflect the state (Instance Name/Base Icon for flattened, Model Group Name/Group Icon for grouped).

## Out of Scope
- Changing the persistence layer for models or instances.
- Modifying the chat interface or logic.
- Adding new model management features beyond the tree display logic.
