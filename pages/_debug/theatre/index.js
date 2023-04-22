import { types } from '@theatre/core'
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

function TheatreObject({ objectAddress, config }) {
  const { sheetId, sheetInstanceId, objectKey } = JSON.parse(objectAddress)

  const sheet = useSheet(sheetId, sheetInstanceId)
  useTheatre(sheet, objectKey, sanitizeConfig(config))
}

export default function Theatre() {
  // const debug = useDebug()

  // useEffect(() => {
  //   if (!debug) {
  //     // Router.replace('/')
  //   }
  // }, [debug])

  const list = useOrchestra(({ theatreList }) =>
    Object.entries(theatreList).map(([objectAddress, config]) => ({
      objectAddress,
      config,
    }))
  )

  return (
    <div className={s.theatre}>
      <Studio>
        {list.map(({ objectAddress, config }) => (
          <TheatreObject
            key={objectAddress}
            objectAddress={objectAddress}
            config={config}
          />
        ))}
      </Studio>
    </div>
  )
}
