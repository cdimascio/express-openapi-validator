export const validationError = (
  status: number,
  path: string,
  message: string,
  errors?: any, // TODO rename - normalize...something else
) => ({
  status,
  errors: [
    {
      path,
      message,
      ...({errors } || {})
    },
  ],
});
