import Tempus from 'tempus'

const readQueue: Array<() => unknown> = []
const writeQueue: Array<() => unknown> = []

Tempus.add(
  () => {
    // Process all reads first
    for (const fn of readQueue) fn()
    readQueue.length = 0

    // Then process all writes
    for (const fn of writeQueue) fn()
    writeQueue.length = 0
  },
  { priority: 1000 }
)

export function measure<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    readQueue.push(() => resolve(fn()))
  })
}

export function mutate<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    writeQueue.push(() => resolve(fn()))
  })
}
