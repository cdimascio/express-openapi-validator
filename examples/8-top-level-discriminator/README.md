# example

This example demonstrates top level discriminators using `oneOf`

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

### Discriminator with explict mapping

#### `"pet_type": "cat"

```shell
    curl -X POST 'http://localhost:3000/v1/pets/mapping' \
    -H 'Content-Type: application/json' \
    -d '{"age": 10, "hunts": true,  "pet_type": "cat"}'
{
  "age": 10,
  "hunts": true,
  "pet_type": "cat"
}
```
#### `"pet_type": "dog"

```shell
curl -X POST 'http://localhost:3000/v1/pets/mapping' \
-H 'Content-Type: application/json' \
-d '{"bark": true, "breed": "Retriever",  "pet_type": "dog"}'
{
  "bark": true,
  "breed": "Retriever",
  "pet_type": "dog"
}
```

### Discriminator with implict mapping

#### `"pet_type": "DogObject"

```shell
curl -X POST 'http://localhost:3000/v1/pets/nomapping' \
-H 'Content-Type: application/json' \
-d '{"bark": true, "breed": "Retriever",  "pet_type": "DogObject"}'
{
  "bark": true,
  "breed": "Retriever",
  "pet_type": "DogObject"
}
```
