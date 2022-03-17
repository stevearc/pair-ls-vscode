#!/bin/bash
set -e

if [ -z "$(docker images -q vsce)" ]; then
  DOCKER_BUILDKIT=1 docker build --tag vsce "https://github.com/microsoft/vscode-vsce.git#main"
fi

docker run --rm -it -v "$(pwd)":/workspace vsce "$@"
