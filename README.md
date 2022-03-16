# Pair-ls

VS Code extension for pair-ls

See the main [pair-ls](https://github.com/stevearc/pair-ls) repo for how it
works and configuration options.

## Settings

| Option               | Default                 | Description                      |
| -------------------- | ----------------------- | -------------------------------- |
| `pair-ls.executable` | packaged with extension | Path to the `pair-ls` executable |
| `pair-ls.flags`      | `lsp -port 8080`        | CLI args to pass to `pair-ls`    |

## Commands

These commands are provided to the command palette

| Command                     | Description                                     |
| --------------------------- | ----------------------------------------------- |
| Pair-ls: Start              | Start pair-ls in your current session           |
| Pair-ls: Stop               | Stop pair-ls                                    |
| Pair-ls: Create share url   | Create a URL to share your session using WebRTC |
| Pair-ls: Connect with token | Connect to a WebRTC client using a token        |
