# example

example using express-openapi-validator with auto-wiring via `operationHandlers`

## Install

```shell
npm run deps && npm i
```

## Run

From this `3-eov-operations-babel` directory, run:

```shell
npm run dev
```

## Try

```shell
## call ping
curl http://localhost:3000/v1/ping

## call pets
## the call below should return 400 since it requires additional parameters
curl http://localhost:3000/v1/pets
```
