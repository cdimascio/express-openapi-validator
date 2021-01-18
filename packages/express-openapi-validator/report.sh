#!/bin/bash
echo "$CODACY_PROJECT_TOKEN"
bash <(curl -Ls https://coverage.codacy.com/get.sh) report --project-token "$CODACY_PROJECT_TOKEN" --language typescript -r coverage/lcov.info