import { types } from '@theatre/core'
import { useBroadcastChannel } from 'hooks/use-broadcast-channel'
import { useOrchestra } from 'lib/orchestra'
import { useSheet } from 'lib/theatre'
import { useTheatre } from 'lib/theatre/hooks/use-theatre'
import { Studio } from 'lib/theatre/studio'
import s from './theatre.module.scss'

function sanitizeConfig(config = {}) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      const { type } = value

      if (type) {
        return [
          key,
          types[type](
            type === 'compound' ? sanitizeConfig(value.props) : value.default,
            type === 'stringLiteral' ? value.valuesAndLabels : value
          ),
        ]
      }
      return [key, value]
    })
  )
}

function TheatreObject({ address, config }) {
  const { sheetId, sheetInstanceId, objectKey } = JSON.parse(address)

  const channel = useBroadcastChannel('theatre' + address)

  const sheet = useSheet(sheetId, sheetInstanceId)
  useTheatre(sheet, objectKey, sanitizeConfig(config), {
    onValuesChange: (values) => {
      channel.emit('studio:change', {
        values,
      })
    },
    deps: [channel],
    external: true,
  })
}

export default function Theatre() {
  // const debug = useDebug()

  // useEffect(() => {
  //   if (!debug) {
  //     // Router.replace('/')
  //   }
  // }, [debug])

  const list = useOrchestra(({ theatreList }) =>
    Object.entries(theatreList).map(([address, config]) => ({
      address,
      config,
    }))
  )

  return (
    <div className={s.theatre}>
      <Studio />
      {list.map(({ address, config }) => (
        <TheatreObject key={address} address={address} config={config} />
      ))}
    </div>
  )
}
