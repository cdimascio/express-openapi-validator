import ono from 'ono';

const _validationError = (
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

export function validationError(status, path, message) {
  const err = _validationError(status, path, message);
  return ono(err, message);
}

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
