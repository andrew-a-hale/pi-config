#!/bin/sh
# Clone this repo, then run this script to install everything.
# --docker  also install Docker, build the pi container, and install bin/isolate
set -e

INSTALL_DOCKER=false
for arg in "$@"; do
	case "$arg" in
		--docker) INSTALL_DOCKER=true ;;
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

# Symlink directories
rm -rf "$HOME/.pi/agent/agents"
ln -sfn "$AGENT_DIR" "$HOME/.pi/agent/agents"

for dir in prompts extensions skills; do
	rm -rf "$HOME/.pi/agent/$dir"
	ln -sfn "$DIR/$dir" "$HOME/.pi/agent/$dir"
done

# --- Docker / isolate setup (opt-in) ---
if $INSTALL_DOCKER; then
	echo ""
	echo "==> Docker setup..."

	# Install Docker if missing
	if ! command -v docker >/dev/null 2>&1; then
		echo "    Installing Docker..."
		curl -fsSL https://get.docker.com | sudo sh
		sudo usermod -aG docker "$USER"
		echo "    Docker installed. You may need to log out/in or run: newgrp docker"
	fi

	# Build pi container image
	echo "    Building pi-sandbox image..."
	docker build --pull -t pi-sandbox -f "$DIR/docker/Dockerfile.pi" "$DIR/docker"

	# Install isolate script
	echo "    Installing isolate to /usr/local/bin..."
	sudo cp "$DIR/bin/isolate" /usr/local/bin/isolate
	sudo chmod +x /usr/local/bin/isolate

	# Prompt for secrets if missing
	if [ ! -f "$DIR/docker/.pi-env" ]; then
		echo ""
		echo "    ==> No .pi-env found. Create one now:"
		echo "        cp $DIR/docker/.pi-env.example $DIR/docker/.pi-env"
		echo "        chmod 600 $DIR/docker/.pi-env"
		echo "        # Edit with your API keys"
	fi

	echo "    Done. Test with: isolate ~/projects/some-project 'say hello world'"
fi

