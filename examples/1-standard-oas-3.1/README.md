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

## Text examples

### GET /pets

success

```shell
curl -s 'localhost:3000/v1/pets?limit=5' |jq
[
  {
    "id": 1,
    "name": "sparky",
    "type": "dog",
    "tags": [
      "sweet"
    ]
  },
  {
    "id": 2,
    "name": "buzz",
    "type": "cat",
    "tags": [
      "purrfect"
    ]
  },
  {
    "id": 3,
    "name": "max",
    "type": "dog",
    "tags": []
  }
]
```

error

```shell
 curl -s 'localhost:3000/v1/pets' |jq
{
  "message": "request/query must have required property 'limit'",
  "errors": [
    {
      "path": "/query/limit",
      "message": "must have required property 'limit'",
      "errorCode": "required.openapi.validation"
    }
  ],
  "code": 400
}
```

### POST /pets

success

```shell
curl -s -XPOST 'localhost:3000/v1/pets' -d '{"id": 1, "name": "jobe"}' -H 'Content-type: application/json'|jq
{
  "id": 1,
  "name": "jobe"
}
```

error

```shell
curl -s -XPOST 'localhost:3000/v1/pets' -d '{"id": "sdfsf", "name": "jobe"}' -H 'Content-type: application/json'|jq
{
  "message": "request/body/id must be integer",
  "errors": [
    {
      "path": "/body/id",
      "message": "must be integer",
      "errorCode": "type.openapi.validation"
    }
  ],
  "code": 400
}
```

### GET /pets/:id

success

```shell
curl -s 'localhost:3000/v1/pets/1' |jq
{
  "id": 1,
  "name": "sparky",
  "type": "dog",
  "tags": [
    "sweet"
  ]
}
```

error: bad id type

```shell
curl -s 'localhost:3000/v1/pets/lkl' |jq
{
  "message": "request/params/petId must be number",
  "errors": [
    {
      "path": "/params/petId",
      "message": "must be number",
      "errorCode": "type.openapi.validation"
    }
  ],
  "code": 400
}
```

### /v1/pets/1/photos

success

```shell
curl  -XPOST 'localhost:3000/v1/pets/1/photos' -H 'Content-type: multipart/form-data' -F 'file=@test.txt'|jq
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   304  100    90  100   214  25996  61813 --:--:-- --:--:-- --:--:--   98k
{
  "files_metadata": [
    {
      "originalname": "test.txt",
      "encoding": "7bit",
      "mimetype": "text/plain"
    }
  ]
}
```

error: no file

```shell
 curl -s  -XPOST 'localhost:3000/v1/pets/1/photos' -H 'Content-type: multipart/form-data' |jq
{
  "message": "request/body must have required property 'file'",
  "errors": [
    {
      "path": "/body/file",
      "message": "must have required property 'file'",
      "errorCode": "required.openapi.validation"
    }
  ],
  "code": 400
}
```
