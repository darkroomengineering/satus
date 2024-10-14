'use client'

import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react'
import s from './progress-text.module.scss'

function SplitWords({ children }) {
  return children.split(' ').map((char, i) => (
    <Fragment key={i}>
      <div className={s.word}>{char}</div>{' '}
    </Fragment>
  ))
}

function recursiveMap(children, fn) {
  console.log('-----')
  console.log(children)

  return Children.map(children, (child) => {
    console.log(child)

    if (typeof child === 'string') {
      return <SplitWords>{child}</SplitWords>
    }

    if (!isValidElement(child)) {
      return child
    }

    if (child.props.children) {
      return Children.map(child.props.children, (child) => {
        if (typeof child === 'string') {
          return <SplitWords>{child}</SplitWords>
        }

        child = cloneElement(child, {
          children: recursiveMap(child.props.children, fn),
        })

        return child
      })
    }

    return child
  })
}

export function ProgressText({ children }) {
  const ref = useRef()

  const [words, setWords] = useState([])
  console.log(words)

  useEffect(() => {
    setWords(ref.current.querySelectorAll('.' + s.word))
  }, [children])

  return (
    <div className={s.progressText} ref={ref}>
      {recursiveMap(children)}
    </div>
  )
}

// Marquee.propTypes = {
//   repeat: PropTypes.number,
//   speed: PropTypes.number,
//   scrollVelocity: PropTypes.bool,
//   reversed: PropTypes.bool,
//   pauseOnHover: PropTypes.bool,
// }

// Marquee.defaultProps = {
//   repeat: 2,
//   speed: 1,
//   scrollVelocity: true,
//   reversed: false,
//   pauseOnHover: false,
// }
