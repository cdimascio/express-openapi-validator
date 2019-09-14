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
      ...({ errors } || {}),
    },
  ],
});

export function ajvErrorsToValidatorError(status, errors) {
  return {
    status,
    errors: errors.map(e => {
      const required =
        e.params &&
        e.params.missingProperty &&
        e.dataPath + '.' + e.params.missingProperty;
      return {
        path: required || e.dataPath || e.schemaPath,
        message: e.message,
        errorCode: `${e.keyword}.openapi.validation`,
      };
    }),
  };
}
