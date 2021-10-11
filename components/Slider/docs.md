# Slider

## Slots
- Header: content for titles/headers/text
- Embla: slider wrapper using embla-carrousel-react
- Order: Rendering order is determined explicitly by the order of declaration of the slots  

## Example
```javascript
      <Slider>
        <Slider.Header>
          content
        </Slider.Header>
        <Slider.Embla emblaApi={{ }}>
          <Slider.Embla.Slide>
            content
          </Slider.Embla.Slide>
          <Slider.Embla.Buttons />
        </Slider.Embla>
      </Slider>
```

## Add new Slider Library
- Just mock the structure use for Embla Slider and add the corresponing slot

## See embla-slider/docs doc for more resources