# Accordion

## Slots
- Group: groups several `<Accordion>`
- Header: content inside button that toggle `Body` visibility
- Body: content to toggle

## Example
```javascript
<Accordion.Group maxAccordionsOpenSimultaniously={3}>
  {Array(6)
    .fill({ header: 'this is header', body: 'this is body' })
    .map((item, idx) => (
      <Accordion
        className={s.pageHome__accordion}
        key={`accordion-item-${idx}`}
      >
        <Accordion.Header>
          <div className={s.pageHome__accordion__header}>
            header : {`accordion-item-${idx}`}
          </div>
        </Accordion.Header>
        <Accordion.Body>
          <div className={s.pageHome__accordion__body}>{item.body}</div>
        </Accordion.Body>
      </Accordion>
    ))}
</Accordion.Group>

```
