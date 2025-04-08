/**
 * Interface representing the inputs for the action
 */
export interface ActionInputs {
  /**
   * Location of the JSON schema file to dereference
   */
  schemaFile: string

  /**
   * Filename to save the dereferenced JSON schema file
   */
  outputFile: string

  /**
   * If true, the action will not fail if the schema file is not found
   */
  allowFileNotFound: boolean
}
