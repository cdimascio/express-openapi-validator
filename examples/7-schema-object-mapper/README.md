# example

The `schemaObjectMapper` option enables the use of a custom serializer and deserializer for explicitly declared schema objects. 

Using `schemaObjectMapper`, one can deserialize a string value received in a request and convert it to an object. For example, you might convert a string representing a date to a `Date` object. Furthermore, one must also define its serializer. For example, converting a `Date` object to a string. The string representation is then sent in the response.

Some common use cases include:
- converting a string to/from `Date`
- converting a string to/from a MongoDb `ObjectId`

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
