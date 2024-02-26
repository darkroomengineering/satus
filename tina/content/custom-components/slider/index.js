import React from 'react'
import { wrapFieldsWithMeta } from 'tinacms'
import { Pane } from 'tweakpane'

const params = {}

export const slider = ({
  name = 'slider',
  label = 'Slider',
  sliderProps = {
    min: 0,
    max: 1,
    step: 0.01,
    label: 'value',
    defaultValue: 1,
  },
} = {}) => ({
  name,
  label,
  type: 'number',
  ui: {
    parse: (val) => Number(val),
    component: wrapFieldsWithMeta(({ input }) => {
      const [paneControl, setPaneControl] = React.useState(null)
      const elementRef = React.useRef(null)
      params[sliderProps.label] = input?.value ?? sliderProps.defaultValue

      React.useEffect(() => {
        const pane = new Pane({ container: elementRef.current })
        pane.addBinding(params, sliderProps.label, {
          min: sliderProps.min,
          max: sliderProps.max,
          step: sliderProps.step,
        })

        setPaneControl(pane)
      }, [])

      paneControl?.on('change', (ev) => {
        input.onChange(JSON.stringify(ev.value))
      })

      return <div ref={elementRef} />
    }),
  },
})
