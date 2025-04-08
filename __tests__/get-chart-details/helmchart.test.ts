import fs from 'fs'
import yaml from 'yaml'
// import * as YAML from '../../__fixtures__/yaml.js'
import { jest } from '@jest/globals'

// jest.unstable_mockModule('yaml', () => YAML)

const { HelmChart } = await import('../../src/get-chart-details/helmchart.js')

describe('HelmChart', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with all parameters', () => {
      const chart = new HelmChart('test-chart', '1.0.0', 'library', {})

      expect(chart.name).toBe('test-chart')
      expect(chart.version).toBe('1.0.0')
      expect(chart.type).toBe('library')
      expect(chart.annotations).toEqual({})
      expect(chart.changelog).toEqual([])
    })

    it('should default type to application when not provided', () => {
      const chart = new HelmChart('test-chart', '1.0.0', '', {})

      expect(chart.type).toBe('application')
    })

    it('should parse changelog from annotations when present', () => {
      const annotations = {
        'artifacthub.io/changes': '- kind: added\n  description: New feature'
      }

      const mockChangelog = [{ kind: 'added', description: 'New feature' }]
      jest.spyOn(yaml, 'parse').mockReturnValueOnce(mockChangelog)

      const chart = new HelmChart(
        'test-chart',
        '1.0.0',
        'application',
        annotations
      )

      expect(chart.changelog).toEqual(mockChangelog)
      expect(yaml.parse).toHaveBeenCalledWith(
        annotations['artifacthub.io/changes']
      )
    })

    it('should handle invalid changelog YAML', () => {
      const annotations = {
        'artifacthub.io/changes': 'invalid: yaml: content'
      }
      const chart = new HelmChart(
        'test-chart',
        '1.0.0',
        'application',
        annotations
      )

      expect(chart.changelog).toEqual([])
    })

    it('should handle annotations without changelog', () => {
      const annotations = {
        'some-other-annotation': 'value'
      }
      const chart = new HelmChart(
        'test-chart',
        '1.0.0',
        'application',
        annotations
      )

      expect(chart.changelog).toEqual([])
    })

    it('should handle empty changelog string', () => {
      const annotations = {
        'artifacthub.io/changes': '1'
      }
      const chart = new HelmChart(
        'test-chart',
        '1.0.0',
        'application',
        annotations
      )

      expect(chart.changelog).toHaveLength(0)
    })
  })

  describe('loadFromYaml', () => {
    it('should create a HelmChart instance from valid YAML string', () => {
      const yamlString = `
        name: test-chart
        version: 2.0.0
        type: library
        annotations:
          test: value
      `
      const mockParsedYaml = {
        name: 'test-chart',
        version: '2.0.0',
        type: 'library',
        annotations: { test: 'value' }
      }

      jest.spyOn(yaml, 'parse').mockReturnValueOnce(mockParsedYaml)

      const chart = HelmChart.loadFromYaml(yamlString)

      expect(yaml.parse).toHaveBeenCalledWith(yamlString)
      expect(chart).toBeInstanceOf(HelmChart)
      expect(chart.name).toBe('test-chart')
      expect(chart.version).toBe('2.0.0')
      expect(chart.type).toBe('library')
      expect(chart.annotations).toEqual({ test: 'value' })
    })

    it('should set default type when not provided in YAML', () => {
      const yamlString = `
        name: test-chart
        version: 2.0.0
        annotations: {}
      `
      const mockParsedYaml = {
        name: 'test-chart',
        version: '2.0.0',
        annotations: {}
      }

      jest.spyOn(yaml, 'parse').mockReturnValueOnce(mockParsedYaml)

      const chart = HelmChart.loadFromYaml(yamlString)

      expect(chart.type).toBe('application')
    })
  })

  describe('loadFromYamlFile', () => {
    it('should create a HelmChart instance from a YAML file', () => {
      const yamlContent = `
        name: test-chart
        version: 2.0.0
        type: library
        annotations:
          test: value
      `
      const mockParsedYaml = {
        name: 'test-chart',
        version: '2.0.0',
        type: 'library',
        annotations: { test: 'value' }
      }

      // Mock the file read
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(yamlContent)
      jest.spyOn(yaml, 'parse').mockReturnValueOnce(mockParsedYaml)

      const chart = HelmChart.loadFromYamlFile('chart.yaml')

      expect(fs.readFileSync).toHaveBeenCalledWith('chart.yaml', 'utf8')
      expect(yaml.parse).toHaveBeenCalledWith(yamlContent)
      expect(chart).toBeInstanceOf(HelmChart)
      expect(chart.name).toBe('test-chart')
      expect(chart.version).toBe('2.0.0')
      expect(chart.type).toBe('library')
      expect(chart.annotations).toEqual({ test: 'value' })
    })

    it('should throw error when file cannot be read', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('File not found')
      })

      expect(() => {
        HelmChart.loadFromYamlFile('nonexistent.yaml')
      }).toThrow('File not found')
    })
  })

  describe('validate', () => {
    describe('without changelog requirement', () => {
      it('should validate a minimal valid chart', () => {
        const chart = new HelmChart('test-chart', '1.0.0', '', {})
        const result = chart.validate(false)

        expect(result.success).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should fail validation for missing required fields', () => {
        const chart = new HelmChart('', '', '', {})
        const result = chart.validate(false)

        expect(result.success).toBe(false)
        expect(result.errors).toContain(
          'name: String must contain at least 1 character(s)'
        )
        expect(result.errors).toContain(
          'version: String must contain at least 1 character(s)'
        )
      })

      it('should accept explicit type field', () => {
        const chart = new HelmChart('test-chart', '1.0.0', 'library', {})
        const result = chart.validate(false)

        expect(result.success).toBe(true)
      })

      it('should reject invalid type value', () => {
        const chart = new HelmChart('test-chart', '1.0.0', 'invalid-type', {})
        const result = chart.validate(false)

        expect(result.success).toBe(false)
        expect(result.errors).toContain(
          "type: Invalid enum value. Expected 'application' | 'library', received 'invalid-type'"
        )
      })
    })

    describe('with changelog requirement', () => {
      it('should validate chart with valid changelog', () => {
        const annotations = {
          'artifacthub.io/changes':
            '- kind: added\n  description: New feature added'
        }

        const chart = new HelmChart(
          'test-chart',
          '1.0.0',
          'application',
          annotations
        )
        const result = chart.validate(true)

        expect(result.success).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should fail validation when changelog is missing', () => {
        const chart = new HelmChart('test-chart', '1.0.0', 'application', {})
        const result = chart.validate(true)

        expect(result.success).toBe(false)
        expect(result.errors).toContain(
          'annotations.artifacthub.io/changes: Required'
        )
      })

      it('should fail validation for invalid changelog format', () => {
        const annotations = {
          'artifacthub.io/changes': '- invalid: changelog'
        }
        jest
          .spyOn(yaml, 'parse')
          .mockReturnValueOnce([{ invalid: 'changelog' }])
        const chart = new HelmChart(
          'test-chart',
          '1.0.0',
          'application',
          annotations
        )
        const result = chart.validate(true)

        expect(result.success).toBe(false)
      })

      it('should validate complex changelog with links', () => {
        const annotations = {
          'artifacthub.io/changes': `
            - kind: added
              description: New feature
              links:
                - name: GitHub Issue
                  url: https://github.com/org/repo/issues/1
            - kind: fixed
              description: Bug fix
              links:
                - name: PR
                  url: https://github.com/org/repo/pull/2`
        }
        const chart = new HelmChart(
          'test-chart',
          '1.0.0',
          'application',
          annotations
        )
        const result = chart.validate(true)

        expect(result.success).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should fail validation for invalid changelog entry fields', () => {
        const annotations = {
          'artifacthub.io/changes': `
            - kind: invalid
              description: ''`
        }
        jest
          .spyOn(yaml, 'parse')
          .mockReturnValueOnce([{ kind: 'invalid', description: '' }])
        const chart = new HelmChart(
          'test-chart',
          '1.0.0',
          'application',
          annotations
        )
        const result = chart.validate(true)

        expect(result.success).toBe(false)
        expect(result.errors).toContain(
          "changelog.0.kind: Invalid enum value. Expected 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security', received 'invalid'"
        )
        expect(result.errors).toContain(
          'changelog.0.description: String must contain at least 1 character(s)'
        )
      })
    })
  })
})
