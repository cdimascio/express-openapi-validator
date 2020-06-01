# example

example using express-openapi-validator with custom operation resolver

## Install

```shell
npm i && npm run deps
```

## Run

From this `5-custom-operation-resolver` directory, run:

```shell
npm start
```

## Try

```shell
## call ping
curl http://localhost:3000/v1/ping

## call pets
## the call below should return 400 since it requires additional parameters
curl http://localhost:3000/v1/pets
```
