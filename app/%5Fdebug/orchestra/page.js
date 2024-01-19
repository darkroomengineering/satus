import { OrchestraToggle } from 'libs/orchestra/react'

function OrchestraPage({}) {
  return (
    <>
      <OrchestraToggle id="studio">⚙️</OrchestraToggle>
      <OrchestraToggle id="stats">📈</OrchestraToggle>
      <OrchestraToggle id="grid">🌐</OrchestraToggle>
      <OrchestraToggle id="dev">🚧</OrchestraToggle>
    </>
  )
}

export default OrchestraPage
