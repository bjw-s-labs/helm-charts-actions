/**
 * Interface representing the inputs for the action
 */
export interface ActionInputs {
  /**
   * Local path to the Helm chart directory
   */
  path: string

  /**
   * Allow Chart.yaml to not be present
   */
  allowChartToNotExist: boolean

  /**
   * Should Chart.yaml be validated
   */
  validateChartYaml: boolean

  /**
   * Should Chart.yaml validation check for presence of a changelog
   */
  requireChangelog: boolean
}
