# NestJS Example

This example demonstrates how to use `express-openapi-validator` with [NestJS](https://nestjs.com/).

## Install

From this `9-nestjs` directory, run:

```shell
npm ci
```

## Run

### Start Server

#### Watch Mode

```shell
npm run start
```

or

```shell
npm run start:dev
```

#### Production Mode

```shell
npm run build
npm run start:prod
```

### Requests

```shell
curl --request GET --url http://localhost:3000/ping/foo
```

```shell
curl --request POST \
  --url http://localhost:3000/ping \
  --header 'Content-Type: application/json' \
  --data '{"ping": "GNU Terry Pratchett"}'
```

validation error

```shell
curl --request POST \
  --url http://localhost:3000/ping \
  --header 'Content-Type: application/json' \
  --data '{"pingoo": "GNU Terry Pratchett"}'|jq
```

## Tests

```shell
npm run test
```
