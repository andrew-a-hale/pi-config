#!/bin/sh
# Clone this repo, then run this script to install everything.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
pi install "$DIR"

# Additional pi packages
pi install git:github.com/DietrichGebert/ponytail
pi install npm:pi-caveman
pi install npm:@firstpick/pi-extension-grill-me
