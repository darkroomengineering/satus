# Slider

## Slots
- Header: content for titles/headers/text
- Embla: slider wrapper using embla-carrousel-react


## Embla-Carousel-React
-- Docs: https://www.embla-carousel.com/
-- Use emblaApi: to pass api library methods
-- autoScroll is the only method which not belongs to the library but is used in the same way, see example.

## Example
```javascript

const devs = [
  {
    name: 'Franco',
    position: 'Lords of Lords',
    image: '/devs/franco.png',
  },
  {
    name: 'Clement',
    position: 'Expert on Dark Magic',
    image: '/devs/clement.png',
  },
  {
    name: 'Leandro',
    position: 'He didnt fucked it up',
    image: '/devs/leandro.png',
  },
  {
    name: 'Guido',
    position: 'Avoids owning projects',
    image: '/devs/guido.png',
  },
]
      <Slider>
        <Slider.Header>
          <div className={s['slider-header']}>
            <p>Slider Header</p>
            <p>Slider Title</p>
          </div>
        </Slider.Header>
        <Slider.Embla
         emblaApi={{
            slidesToScroll: 1,
            skipSnaps: false,
            startIndex: 1,
            loop: true,
            autoScroll: true,
          }}>
          <Slider.Embla.Slide>
            {devs.map((item, idx) => (
              <div className={s['slide']} key={`slide-item-${idx}`}>
                <div className={s['slide-inner']}>
                  <img src={item.image} alt="" className={s['slide-img']} />
                  <p className={s['slide-title']}>{item.name}</p>
                  <p className={s['slide-text']}>{item.position}</p>
                </div>
              </div>
            ))}
          </Slider.Embla.Slide>
          <Slider.Embla.Buttons />
        </Slider.Embla>
      </Slider>
```

