'use client'

export function Console({ log }: { log: Parameters<Console['log']>[0] }) {
  console.log(log)

  return null
}
