# example

simple example using express-openapi-validator

## Install

```shell
npm run deps && npm i
```

## Run

From this `2-standard-multi-version` directory, run:

```shell
npm start
```

## Try it

```shell
## invoke GET /v2/pets properly
curl 'localhost:3000/v2/pets?pet_type=kitty' |jq
[
  {
    "pet_id": 1,
    "pet_name": "happy",
    "pet_type": "cat"
  }
]

## invoke GET /v2/pets using `type` as specified in v1, but not v2
curl 'localhost:3000/v2/pets?type=cat' |jq  
{
  "message": "Unknown query parameter 'type'",
  "errors": [
    {
      "path": ".query.type",
      "message": "Unknown query parameter 'type'"
    }
  ]
}

## invoke GET /v1/pets using type='kitty'. kitty is not a valid v1 value. 
## also limit is required in GET /v1/pets
curl 'localhost:3000/v1/pets?type=kitty' |jq
{
  "message": "request.query.type should be equal to one of the allowed values: dog, cat, request.query should have required property 'limit'",
  "errors": [
    {
      "path": ".query.type",
      "message": "should be equal to one of the allowed values: dog, cat",
      "errorCode": "enum.openapi.validation"
    },
    {
      "path": ".query.limit",
      "message": "should have required property 'limit'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```
