# example

simple example using express-openapi-validator

## Install

```shell
npm run deps && npm i
```

## Run

From this `1-standard` directory, run:

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
