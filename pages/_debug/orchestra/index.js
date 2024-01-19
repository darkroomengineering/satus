import { OrchestraToggle } from 'libs/orchestra/react'
import { forwardRef } from 'react'

const OrchestraPage = forwardRef(function OrchestraPage({}) {
  return (
    <>
      <OrchestraToggle id="studio">⚙️</OrchestraToggle>
      <OrchestraToggle id="stats">📈</OrchestraToggle>
      <OrchestraToggle id="grid">🌐</OrchestraToggle>
      <OrchestraToggle id="dev">🚧</OrchestraToggle>
    </>
  )
})

export default OrchestraPage
