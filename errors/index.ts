export const methodNotAllowed = (path, method) => ({
  status: 405,
  errors: [
    {
      path,
      message: `${method} method not allowed`,
    },
  ],
});

export const notFoundError = path => ({
  status: 404,
  errors: [
    {
      path,
      message: 'Not found',
    },
  ],
});
