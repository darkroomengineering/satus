import { types } from '@theatre/core'
import { useOrchestra } from 'libs/orchestra'
import { useSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import { Studio } from 'libs/theatre/studio'
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
