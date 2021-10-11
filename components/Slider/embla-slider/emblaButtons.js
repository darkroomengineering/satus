import cn from 'clsx'

const SliderBtn = ({ className, scrollPrev, scrollNext }) => {
  return (
    <div className={className}>
      <button
        onClick={scrollPrev}
        style={{
          width: '50px',
          height: '50px',
          background: '#000',
        }}
      >
        <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37">
          <path
            d="M26.563 18.38H9.956M18.112 10.233 9.956 18.38l8.156 8.156"
            stroke="#fff"
            strokeMiterlimit="10"
          />
          <rect
            x="36.209"
            y="35.857"
            width="35.709"
            height="35.08"
            rx="9.5"
            transform="rotate(-180 36.209 35.857)"
            stroke="#fff"
          />
        </svg>
      </button>
      <button
        onClick={scrollNext}
        style={{ width: '50px', height: '50px', background: '#000' }}
      >
        <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37">
          <path
            d="M9.759 18.315h16.606M18.21 26.463l8.155-8.148-8.156-8.156"
            stroke="#fff"
            strokeMiterlimit="10"
          />
          <rect
            x=".5"
            y=".777"
            width="35.709"
            height="35.08"
            rx="9.5"
            stroke="#fff"
          />
        </svg>
      </button>
    </div>
  )
}

export default SliderBtn
