# Coercion

Below is a description of the express-openapi-validator coerion behavior:

- The validator will validate the types of all path params for all routes using the types declared in your spec. Specifically, this includes routes associated with the top level express app, router, or nested routers.
- In v4, the validator will coerce and modify the path params e.g. req.params.your_param_name to the type declared in the spec for all routes declared directly on the express app.
- In v3, the validator will coerce and modify the path params e.g. req.params.your_param_name to the type declared in the spec for all routes declared directly on the express app or directly on the specified top level router.
- For both v3 and v4, nested routers will be coerced and validation time, but will not be modified.

What does modified mean?

The validator updates value of req.params.id to the appropriate type. Thus, once your handler function is invoked each value in req.params is of the to the expected type (as declared in the spec).

In cases, where the value is not modified, your handler will receive each value in req.params as a string, not the declared type. Ultimately, you as the dev has to coerce it e.g. parseInt(req.params.id) :(

**Here's why this is the case**

In order for the validator to modify the req.params, express requires that you register a param handler via app.param or router.param. The validator always does this for app (Additionally, in v3, it can do this for a top level router that is passed to install(...). The validator cannot do this for nested routers because express provides no mechanism to determine the current router. Because, of this, the validator can ensure the appropriate type at validation time, but cannot modify the req.params object.

**Are there any alternatives?**
Yes, we could potentially require developers to manually register a param handler for each route. IMO, this provides a poorer, more complex experience, when compared to a developer simply casting the value to the appropriate type themselves e.g. parseInt(req.params.id)

All in all, it's not ideal, perhaps express 5 (whenever that arrives) will provide a better mechanism to determine the router context.
