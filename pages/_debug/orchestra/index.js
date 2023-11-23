import { OrchestraToggle } from 'libs/orchestra'
import { forwardRef } from 'react'

const Orchestra = forwardRef(function Orchestra({}) {
  return (
    <>
      <OrchestraToggle title="studio" id="studio">
        ⚙️
      </OrchestraToggle>
      <OrchestraToggle title="performance" id="stats">
        📈
      </OrchestraToggle>
      <OrchestraToggle title="grid" id="grid">
        🌐
      </OrchestraToggle>
      <OrchestraToggle title="dev" id="dev">
        🚧
      </OrchestraToggle>
    </>
  )
})

export default Orchestra
