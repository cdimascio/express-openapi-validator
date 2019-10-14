# express-openapi-validator-example

Provides a simple example demonstrating how [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) can be used to automatically validate api requests.

express-openapi-validator automatically validates each request against an [openapi 3 specification](openapi.yaml). If a request is does not match the spec, the validator automatically returns an appropriate error response.

## Run it

```shell
cd examples
```

Start the server

```shell
npm start
```

## Try it

### Validate a query parameter with a value constraint

```shell
curl -s http://localhost:3000/v1/pets/as |jq
{
  "message": "request.params.id should be integer",
  "errors": [
    {
      "path": ".params.id",
      "message": "should be integer",
      "errorCode": "type.openapi.validation"
    }
  ]
}
```

### Validate a query parameter with a range constraint

```shell
 curl -s 'http://localhost:3000/v1/pets?limit=25' |jq
{
  "message": "request.query should have required property 'type', request.query.limit should be <= 20",
  "errors": [
    {
      "path": ".query.type",
      "message": "should have required property 'type'",
      "errorCode": "required.openapi.validation"
    },
    {
      "path": ".query.limit",
      "message": "should be <= 20",
      "errorCode": "maximum.openapi.validation"
    }
  ]
}
```

### Validate security

```shell
 curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --data '{}' |jq
{
  "message": "'X-API-Key' header required",
  "errors": [
    {
      "path": "/v1/pets",
      "message": "'X-API-Key' header required"
    }
  ]
}
```

### Validate content-type

```shell
curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/xml' \
  --header 'x-api-key: XXXX' \
  --data '{
        "name": "test"
}' |jq
  "message": "unsupported media type application/xml",
  "errors": [
    {
      "path": "/v1/pets",
      "message": "unsupported media type application/xml"
    }
  ]
}
```

### Validate a POST request body

```shell
curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/json' \
  --header 'x-api-key: XXXX' \
  --data '{}'|jq
{
  "message": "request.body should have required property 'name'",
  "errors": [
    {
      "path": ".body.name",
      "message": "should have required property 'name'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

### File upload example

```shell
curl -XPOST http://localhost:3000/v1/pets/10/photos -F file=@app.js|jq
{
  "files_metadata": [
    {
      "originalname": "app.js",
      "encoding": "7bit",
      "mimetype": "application/octet-stream"
    }
  ]
}
```

with the api key and [security handler](https://github.com/cdimascio/express-openapi-validator-example/blob/master/app.js#L24)

```shell
curl -XPOST http://localhost:3000/v1/pets \
  --header 'X-Api-Key: XXXXX' \
  --header 'content-type: application/json' \
  -d '{"name": "spot"}' | jq

{
  "id": 4,
  "name": "spot"
}
```

### Response validation (optional)

_Response validation errors return 500s, instead of 400s_

`/v1/pets/99` will return a response that does not match the spec

```
 curl -s 'http://localhost:3000/v1/pets/99' |jq
{
  "message": ".response should have required property 'name', .response should have required property 'id'",
  "errors": [
    {
      "path": ".response.name",
      "message": "should have required property 'name'",
      "errorCode": "required.openapi.validation"
    },
    {
      "path": ".response.id",
      "message": "should have required property 'id'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

### ...and much more. Try it out!

## Fetch the spec

curl http://localhost:3000/spec
