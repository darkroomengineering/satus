import { useDebug } from '@studio-freight/hamo'
import { types } from '@theatre/core'
import { useSheet } from 'lib/theatre'
import { useOrchestra, useTheatre } from 'lib/theatre/hooks/use-theatre'
import { Studio } from 'lib/theatre/studio'
import { useEffect } from 'react'
import s from './theatre.module.scss'

const channel = typeof window !== 'undefined' && new BroadcastChannel('theatre')

function TheatreObject({ address, config }) {
  const parsedAddress = JSON.parse(address)
  const parsedConfig = JSON.parse(config)

  const { sheetId, sheetInstanceId, objectKey } = parsedAddress

  const sheet = useSheet(sheetId, sheetInstanceId)
  useTheatre(
    sheet,
    objectKey,
    Object.fromEntries(
      Object.entries(parsedConfig).map(([key, value]) => [
        key,
        value.type ? types[value.type](value.default, { ...value }) : value,
      ])
    ),
    {
      onValuesChange: (values) => {
        channel.postMessage({
          address,
          values,
        })
      },
      deps: [],
      external: true,
    }
  )
}

export default function Theatre() {
  const debug = useDebug()

  useEffect(() => {
    if (!debug) {
      // Router.replace('/')
    }
  }, [debug])

  const list = useOrchestra(({ theatreList }) =>
    Object.entries(theatreList).map(([address, config]) => ({
      address,
      config,
    }))
  )

  return (
    debug === true && (
      <div className={s.theatre}>
        <Studio />
        {list.map(({ address, config }) => (
          <TheatreObject key={address} address={address} config={config} />
        ))}
      </div>
    )
  )
}
