# example

example using express-openapi-validator with custom operation resolver

## Install

```shell
npm run deps && npm i
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

## [Example Express API Server: with custom operation resolver](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/5-custom-operation-resolver)

By default, when you configure `operationHandlers` to be the base path to your operation handler files, we use `operationId`, `x-eov-operation-id` and `x-eov-operation-handler` to determine what request handler should be used during routing. 

If you ever want _FULL_ control over how that resolution happens (e.g. you want to use your own extended attributes or simply rely on `operationId`), then here's how you can accomplish that following an example where our `operationId` becomes a template that follows `{module}.{function}`.

- First, specifiy the `operationHandlers` option to be an object with a `basePath` and `resolver` properties. `basePath` is the path to where all your handler files are located. `resolver` is a function that **MUST** return an Express `RequestHandler` given `basePath` and `route` (which gives you access to the OpenAPI schema for a specific Operation)

```javascript
new OpenApiValidator({
  apiSpec,
  operationHandlers: {
    basePath: path.join(__dirname, 'routes'),
    resolver: (basePath, route) => {
      // Pluck controller and function names from operationId
      const [controllerName, functionName] = route.schema['operationId'].split('.')
      // Get path to module and attempt to require it
      const modulePath = path.join(basePath, controllerName);
      const handler = require(modulePath)
      // Simplistic error checking to make sure the function actually exists
      // on the handler module
      if (handler[functionName] === undefined) {
        throw new Error(
          `Could not find a [${functionName}] function in ${modulePath} when trying to route [${route.method} ${route.expressRoute}].`
        )
      }
      // Finally return our function
      return handler[functionName]
    }
});
```
- Next, use `operationId` to specify the id of opeartion handler to invoke.
```yaml
/pets:
  get:
    # This means our resolver will look for a file named "pets.js" at our 
    # configured base path and will return an export named "list" from 
    # that module as the Express RequestHandler.
    operationId: pets.list
```
- Finally, create the express handler module e.g. `routes/pets.js`
```javascript
module.exports = {
  // the express handler implementation for the pets collection
  list: (req, res) => res.json(/* ... */),
};
```
