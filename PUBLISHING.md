# Publishing Ollama View

To make your extension available to the public, you can publish it to the **VS Code Marketplace** (for official VS Code users) and the **Open VSX Registry** (for VSCodium, Gitpod, and others).

## 1. VS Code Marketplace (Microsoft)

**Web Upload (Easiest)**
1.  Go to the [VS Code Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
2.  Log in with a Microsoft/GitHub account.
3.  Create a **Publisher** (e.g., `oswaldo`).
4.  Click **New Extension** -> **Visual Studio Code**.
5.  Upload the `ollama-view-0.0.1.vsix` file generated in this project.

**CLI Publishing (Automated)**
1.  Install `vsce`: `npm install -g @vscode/vsce`
2.  **Get a Personal Access Token (PAT)**:
    - Log in to [Azure DevOps](https://dev.azure.com/).
    - Click **User Settings** (icon next to profile) > **Personal access tokens**.
    - Click **+ New Token**.
    - **Organization**: Select *All accessible organizations*.
    - **Scopes**: Select *Custom defined*. Click *Show all scopes* at the bottom.
    - Find **Marketplace** and check **Acquire** and **Publish**.
    - Click **Create** and copy your token.
3.  Login: `vsce login <publisher id>` (paste token when prompted).
4.  Publish: `vsce publish`

## 2. Open VSX Registry (Eclipse)

**Web Upload**
1.  Go to [open-vsx.org](https://open-vsx.org/).
2.  Log in with your GitHub account.
3.  Go to your [Settings/Namespace](https://open-vsx.org/user-settings/namespaces) and claim your namespace.
4.  Upload the `.vsix` file manually via the web interface.

**CLI Publishing**
1.  Install `ovsx`: `npm install -g ovsx`
2.  Get your Access Token from your Open VSX settings page.
3.  Publish: `ovsx publish ollama-view-0.0.1.vsix -p <token>`

## 3. Recommended: Automate with GitHub Actions

For a robust pipeline, you can set up a GitHub Action to publish automatically when you push a new tag (e.g., `v0.0.2`).

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Extension
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - run: npm install
    - run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
```
