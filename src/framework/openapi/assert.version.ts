/**
 * Asserts open api version
 * 
 * @param openApiVersion  SemVer version
 * @returns destructured major and minor
 */
export const assertVersion = (openApiVersion: string) => {
  const [ok, major, minor] = /^(\d+)\.(\d+).(\d+)?$/.exec(openApiVersion);
     
  if (!ok) { 
    throw Error('Version missing from OpenAPI specification')
  };

  if (major !== '3' || minor !== '0' && minor !== '1') {
    throw new Error('OpenAPI v3.0 or v3.1 specification version is required');
  }

  return { major, minor }
}