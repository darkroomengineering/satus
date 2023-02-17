import { useFrame } from '@studio-freight/hamo'
import { editable as e } from '@theatre/r3f'
import { useRef } from 'react'

export function Demo({ scale, ...props }) {
  const ref = useRef()

  useFrame(() => {
    ref.current.rotation.y += 0.01
  })

  return (
    <>
      <e.group scale={scale.xy.min() * 0.5} {...props} theatreKey="Cube">
        <mesh
          ref={ref}
          onClick={() => console.log('click')}
          onPointerOver={() => console.log('hover')}
          onPointerOut={() => console.log('unhover')}
        >
          <boxGeometry />
          <meshStandardMaterial color="hotpink" />
        </mesh>
      </e.group>
    </>
  )
}
