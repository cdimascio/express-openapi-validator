# TODOs

- throw error if path param id's don't match
  Note: app.params will not have registered for an unknown path param i.e. when express defines a different path name param than express (we should attempt to detect this and flag it)
- (done) add tests with an indepently defined router
- (done) throw error (e.g 404) when route is defined in express but not in openapi spec
- (done) exclude routes
- (done) only throw not found on routes with a openapi base path
- test with merge middleware
- test with case insensitive and case sensitive routing
- (done) test empty base path
- (done) test base path with trailing slash
- add support for discriminators
