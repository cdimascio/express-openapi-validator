# example

simple example using express-openapi-validator

## Install

```shell
npm i && npm run deps
```

## Run

From this `4-standard-multi-version` directory, run:

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
