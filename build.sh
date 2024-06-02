#!/bin/bash

set -e

rm -rf node_modules
npm ci

npm run compile:release
npm t

echo 'publishing...'
npm publish