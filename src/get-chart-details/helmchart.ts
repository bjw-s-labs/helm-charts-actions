import fs from 'node:fs'
import yaml from 'yaml'
import { z } from 'zod'

export interface HelmChartValidationResult {
  success: boolean
  errors: string[]
}

export class HelmChart {
  name: string
  version: string
  type: string
  annotations: object
  changelog: object[]

  constructor(
    name: string,
    version: string,
    type: string,
    annotations: object
  ) {
    this.name = name
    this.version = version
    this.type = type || 'application'
    this.annotations = annotations

    this.changelog = []
    if (annotations !== undefined && 'artifacthub.io/changes' in annotations) {
      this.changelog =
        yaml.parse(annotations['artifacthub.io/changes'] as string) || []
    }
  }

  static loadFromYaml(yamlString: string): HelmChart {
    const data = yaml.parse(yamlString)
    return new HelmChart(data.name, data.version, data.type, data.annotations)
  }

  static loadFromYamlFile(filePath: string): HelmChart {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    return HelmChart.loadFromYaml(fileContent)
  }

  validate(requireChangelog: boolean): HelmChartValidationResult {
    let schema = z.object({
      name: z.string().nonempty(),
      version: z.string().nonempty(),
      type: z.enum(['application', 'library']).optional()
    })
    if (requireChangelog) {
      schema = schema.extend({
        annotations: z
          .object({
            'artifacthub.io/changes': z.string().nonempty()
          })
          .required()
      })
      schema = schema.extend({
        changelog: z.array(
          z.object({
            kind: z.enum([
              'added',
              'changed',
              'deprecated',
              'removed',
              'fixed',
              'security'
            ]),
            description: z.string().nonempty(),
            links: z
              .array(
                z
                  .object({
                    name: z.string().nonempty(),
                    url: z.string().url().nonempty()
                  })
                  .required()
              )
              .optional()
          })
        )
      })
    }
    const output = {} as HelmChartValidationResult
    const errors = [] as string[]

    const result = schema.safeParse(this)

    output.success = result.success

    result.error?.issues.forEach(function (error) {
      // errors.push(`${error.path.filter((obj) => {return typeof obj === "string"}).join('.')}: ${error.message}`)
      errors.push(`${error.path.join('.')}: ${error.message}`)
    })
    output.errors = errors
    return output
  }
}
