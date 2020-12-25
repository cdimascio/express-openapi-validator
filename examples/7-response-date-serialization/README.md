# example

## Install

```shell
npm run deps && npm i
```

## Run

From this `7-schema-object-mapper` directory, run:

```shell
npm start
```

## Try

```shell

## call pets
## the call below should return 400 since it requires additional parameters
curl http://localhost:3000/v1/pets?type=dog&limit=3

## Get the first item id
curl http://localhost:3000/v1/pets/<first item id>
```
