#!/bin/sh
# Clone this repo, then run this script to install everything.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# Symlink config files
mkdir -p "$HOME/.pi/agent"
ln -sf "$DIR/keybindings.json" "$HOME/.pi/agent/keybindings.json"
ln -sf "$DIR/settings.json" "$HOME/.pi/agent/settings.json"
ln -sf "$DIR/caveman.json" "$HOME/.pi/agent/caveman.json"

# Symlink directories
rm -rf "$HOME/.pi/agent/agents"
ln -sfn "$DIR/skills/parallel-todos/agents" "$HOME/.pi/agent/agents"

for dir in prompts extensions skills; do
	rm -rf "$HOME/.pi/agent/$dir"
	ln -sfn "$DIR/$dir" "$HOME/.pi/agent/$dir"
done

# Additional pi packages
pi install git:github.com/DietrichGebert/ponytail
pi install npm:@firstpick/pi-extension-grill-me
