#!/bin/bash

set -e
trap 'mv _README.md README.md' EXIT

mv README.md _README.md

cp assets/README.md README.md

rm -rf node_modules
npm ci

npm run compile
npm t

echo 'publishing...'
npm publish