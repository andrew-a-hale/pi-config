#!/bin/sh
# pi-config setup — install extensions, skills, and config.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Installing extensions..."

# Install npm deps for package-style extensions
for pkg_dir in "$DIR/extensions"/*/; do
  if [ -f "$pkg_dir/package.json" ]; then
    name="$(basename "$pkg_dir")"
    echo "    Installing deps for $name..."
    cd "$pkg_dir" && npm install --ignore-scripts
  fi
done

# Symlink config files
mkdir -p "$HOME/.pi/agent"
ln -sf "$DIR/keybindings.json" "$HOME/.pi/agent/keybindings.json"
ln -sf "$DIR/settings.json" "$HOME/.pi/agent/settings.json"
ln -sf "$DIR/system.md" "$HOME/.pi/agent/APPEND_SYSTEM.md"
ln -sf "$DIR/cloak.json" "$HOME/.pi/agent/cloak.json"

# Symlink herdr config
mkdir -p "$HOME/.config/herdr"
ln -sf "$DIR/herdr/config.toml" "$HOME/.config/herdr/config.toml"

# Symlink extensions and skills
rm -rf "$HOME/.pi/agent/extensions"
ln -sfn "$DIR/extensions" "$HOME/.pi/agent/extensions"
rm -rf "$HOME/.pi/agent/skills"
ln -sfn "$DIR/skills" "$HOME/.pi/agent/skills"

echo "==> Installing pi packages..."
pi install npm:pi-mcp-adapter 2>/dev/null || echo "    pi-mcp-adapter already installed"
pi install npm:pi-extmgr 2>/dev/null || echo "    pi-extmgr already installed"

echo "==> Installing MCP config..."
if [ -f "$DIR/mcp.json" ]; then
  cp "$DIR/mcp.json" "$HOME/.pi/agent/mcp.json"
  echo "    mcp.json installed"
fi

echo ""
echo "==> Done. Run pi with /reload to pick up changes."
