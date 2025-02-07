'use client'

import dynamic from 'next/dynamic'
import s from './orchestra.module.css'

const OrchestraToggle = dynamic(
  () =>
    import('~/app/debug/orchestra/react').then((mod) => mod.OrchestraToggle),
  { ssr: false }
)

function OrchestraPage() {
  return (
    <div className={s.buttons}>
      <OrchestraToggle id="studio" className={s.button}>
        ⚙️
      </OrchestraToggle>
      <OrchestraToggle id="stats" className={s.button}>
        📈
      </OrchestraToggle>
      <OrchestraToggle id="grid" className={s.button}>
        🌐
      </OrchestraToggle>
      <OrchestraToggle id="dev" className={s.button}>
        🚧
      </OrchestraToggle>
      <OrchestraToggle id="minimap" className={s.button}>
        🗺️
      </OrchestraToggle>
      <OrchestraToggle id="webgl" className={s.button}>
        🧊
      </OrchestraToggle>
    </div>
  )
}

export default OrchestraPage
