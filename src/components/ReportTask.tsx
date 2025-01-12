import React from 'react'
import classNames from 'classnames'
import { ReportError } from './ReportError'
import { IReportError, IReportTask } from '../report'
import SUGGESTIONS from '../config'

export interface IReportTaskProps {
  task: IReportTask
  taskNumber: number
  tasksCount: number
}

export function ReportTask(props: IReportTaskProps) {
  const { task, taskNumber, tasksCount } = props
  const reportErrors = getReportErrors(task)

  return (
    <div className={classNames({ file: true, valid: task.valid, invalid: !task.valid })}>
      {/* Heading */}
      <p>
        Our automated checker found {task.stats.errors} formatting issues in your tabular
        data file.
      </p>
      <div>
        {/* Original package implementation: maintain by now for doesn't get lint errors,
            since taskNumber and tasksCount are picked above from props. Just adding hidden */}
        <span className="file-count" hidden={true}>
          Task {taskNumber} of {tasksCount}
        </span>
      </div>

      {/* Error groups */}
      {Object.values(reportErrors).map((reportError) => (
        <ReportError key={reportError.code} reportError={reportError} />
      ))}
    </div>
  )
}

// Helpers

export function getReportErrors(task: IReportTask) {
  const reportErrors: { [code: string]: IReportError } = {}
  for (const error of task.errors) {
    const header = task.resource.schema.fields.map((field) => field.name)

    // Prepare reportError
    let reportError = reportErrors[error.code]
    if (!reportError) {
      reportError = {
        count: 0,
        code: error.code,
        name: error.name,
        tags: error.tags,
        description: error.description,
        suggestion: setSuggestion(error.code),
        header,
        messages: [],
        data: {},
      }
    }

    // Prepare cells
    let data = reportError.data[error.rowPosition || 0]
    if (!data) {
      const values = error.cells || error.labels || []
      data = { values, errors: new Set() }
    }

    // Ensure blank row
    if (error.code === 'blank-row') {
      data.values = header.map(() => '')
    }

    // Ensure missing cell
    if (error.code === 'missing-cell') {
      // TODO: use type system instead of "!"
      data.values[error.fieldPosition! - 1] = ''
    }

    // Add row errors
    if (error.fieldPosition) {
      data.errors.add(error.fieldPosition)
    } else if (data.values) {
      data.errors = new Set(data.values.map((_, index) => index + 1))
    }

    // Save reportError
    reportError.count += 1
    reportError.messages.push(error.message)
    reportError.data[error.rowPosition || 0] = data
    reportErrors[error.code] = reportError
  }

  return reportErrors
}

function setSuggestion(errorCode: string) {
  if (errorCode in SUGGESTIONS.errors) {
    type Key = keyof typeof SUGGESTIONS.errors
    const key: Key = errorCode as Key
    return `\n${SUGGESTIONS.header}\n\n${SUGGESTIONS.errors[key]}`
  }

  return ''
}
