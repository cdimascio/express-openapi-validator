# TODOs

- throw error if path param id's don't match
  Note: app.params will not have registered for an unknown path param i.e. when express defines a different path name param than express (we should attempt to detect this and flag it)
- add tests with an indepently defined router
- throw error (e.g 404) when route is defined in express but not in openapi spec
