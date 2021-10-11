import Embla from './embla-slider/emblaSlider.js'
import s from './slider.module.scss'

const Header = () => null

const Slider = ({ children }) => {
  const childrens = children[0] ? children : [children]

  const Renders = (el) => {
    switch (el.type) {
      case Header:
        return el.props.children
      case Embla:
        return (
          <Embla key={'Embla'} emblaApi={el.props.emblaApi}>
            {el.props.children}
          </Embla>
        )
    }
  }
  return childrens.map((item) => Renders(item))
}

Slider.Header = Header
Slider.Embla = Embla

export default Slider
