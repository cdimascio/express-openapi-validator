# example

multi file spec example with express-openapi-validator

## Install

```shell
npm run deps && npm i
```

## Run

From this `6-multi-file-spec` directory, run:

```shell
npm start
```

## Try

correct validation response with a multi-file spec

```
curl -s -XPOST localhost:3000/v1/queries -H 'content-type: application/json' -d '{}'|jq
{
  "message": "request/body must have required property 'id'",
  "errors": [
    {
      "path": "/body/id",
      "message": "must have required property 'id'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

add the required id and it returns correct

```
curl -XPOST localhost:3000/v1/queries -H 'content-type: application/json' -d '{"id": 123}'
{} # note this test server returns empty object upon valid request
```
