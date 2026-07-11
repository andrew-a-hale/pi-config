#!/bin/sh
# Clone this repo, then run this script to install everything.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# Load per-machine model config (gitignored; copy machine.conf.example if missing)
if [ ! -f "$DIR/machine.conf" ]; then
	echo "==> No machine.conf found, copying from machine.conf.example"
	echo "    Edit $DIR/machine.conf if your models differ."
	cp "$DIR/machine.conf.example" "$DIR/machine.conf"
fi
. "$DIR/machine.conf"

# Generate agent files from templates
echo "==> Generating agent files..."
AGENT_DIR="$DIR/skills/parallel-todos/agents-generated"
rm -rf "$AGENT_DIR"
mkdir -p "$AGENT_DIR"
for template in "$DIR/skills/parallel-todos/agents"/*.md.in; do
	name="$(basename "$template" .md.in).md"
	sed "s|@PRO@|${PRO_MODEL}|g; s|@FLASH@|${FLASH_MODEL}|g" "$template" > "$AGENT_DIR/$name"
done

# Symlink config files
mkdir -p "$HOME/.pi/agent"
ln -sf "$DIR/keybindings.json" "$HOME/.pi/agent/keybindings.json"
ln -sf "$DIR/settings.json" "$HOME/.pi/agent/settings.json"

# Symlink directories
rm -rf "$HOME/.pi/agent/agents"
ln -sfn "$AGENT_DIR" "$HOME/.pi/agent/agents"

for dir in prompts extensions skills; do
	rm -rf "$HOME/.pi/agent/$dir"
	ln -sfn "$DIR/$dir" "$HOME/.pi/agent/$dir"
done

