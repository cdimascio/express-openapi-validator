import * as RefParser from 'json-schema-ref-parser';
import { loopWhile } from 'deasync';

export const $RefParser = {
  bundle: (schema, options?) => {
    var savedError,
      savedResult,
      done = false;

    RefParser.bundle(schema, options, (error, result) => {
      savedError = error;
      savedResult = result;
      done = true;
    });

    loopWhile(() => !done);

    if (savedError) throw savedError;
    return savedResult;
  },
};
