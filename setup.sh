#!/bin/sh
# Clone this repo, then run this script to install everything.
# --gondolin  also install Gondolin micro-VM sandbox (requires QEMU)
set -e

INSTALL_GONDOLIN=false
for arg in "$@"; do
	case "$arg" in
		--gondolin) INSTALL_GONDOLIN=true ;;
	esac
done

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
ln -sf "$DIR/system.md" "$HOME/.pi/agent/APPEND_SYSTEM.md"

# Symlink directories
rm -rf "$HOME/.pi/agent/agents"
ln -sfn "$AGENT_DIR" "$HOME/.pi/agent/agents"

for dir in prompts extensions skills; do
	rm -rf "$HOME/.pi/agent/$dir"
	ln -sfn "$DIR/$dir" "$HOME/.pi/agent/$dir"
done

# --- Gondolin setup (opt-in) ---
if $INSTALL_GONDOLIN; then
	echo ""
	echo "==> Gondolin setup..."

	# Check QEMU
	if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
		echo "    WARNING: qemu-system-x86_64 not found. Install it:"
		echo "      Debian/Ubuntu: sudo apt install qemu-system-x86"
		echo "      macOS:         brew install qemu"
	else
		echo "    QEMU found."
	fi

	# Install npm deps for gondolin extension
	if [ -f "$DIR/extensions/gondolin/package.json" ]; then
		echo "    Installing gondolin npm dependencies..."
		cd "$DIR/extensions/gondolin" && npm install --ignore-scripts
		echo "    Done."
	else
		echo "    ERROR: extensions/gondolin/package.json not found."
	fi
fi

