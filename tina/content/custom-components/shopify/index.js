import * as SelectPrimitive from '@radix-ui/react-select'
import React from 'react'
import { wrapFieldsWithMeta } from 'tinacms'
import { CopyToClipboard } from '../copy-to-clipboard'

const useShopify = ({ setter }) => {
  React.useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/shopify')

      return response.json()
    }

    fetchData().then(({ products }) => {
      setter(products)
    })
  }, [setter])
}

const description =
  'If you want to use the same handle than in shopify, copy and paste it into the slug field to link product.'

export const copyHandle = ({ name = 'handleForSlug' } = {}) => ({
  name,
  type: 'string',
  ui: {
    description: description,
    parse: (val) => Number(val),
    component: wrapFieldsWithMeta(({ tinaForm }) => {
      let slug = 'select first a product'

      if (tinaForm.values.product) {
        slug = tinaForm.values.product[0].slug
      }

      return CopyToClipboard({ content: slug })
    }),
  },
})

export const shopify = () => ({
  name: 'slug',
  label: 'Slug',
  type: 'string',
  required: true,
  description:
    'Select a product from Shopify, refresh the page to see the product update.',
  ui: {
    component: wrapFieldsWithMeta(({ input }) => {
      const [list, setList] = React.useState([])
      useShopify({ setter: setList })

      return (
        <div>
          <SelectPrimitive.Root
            onValueChange={input.onChange}
            value={input.value}
          >
            <SelectPrimitive.Trigger
              className="inline-flex items-center justify-center rounded px-[15px] text-[13px] leading-none h-[35px] gap-[5px] bg-white  shadow-[0_2px_10px] shadow-black/10 hover:bg-mauve3 focus:shadow-[0_0_0_2px] focus:shadow-black"
              style={{ backgroundColor: '#fff' }}
            >
              <SelectPrimitive.Value placeholder="Select a Shopify Product" />
              <SelectPrimitive.Icon>
                <Chevron />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Content
              className="overflow-hidden bg-white rounded-md shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] mt-2 max-w-sm"
              position="popper"
            >
              <SelectPrimitive.Viewport className="relative p-[5px] max-h-96 overflow-auto">
                {list.map((value) => (
                  <SelectItem key={`product-${value}`} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Root>
        </div>
      )
    }),
  },
})

const SelectItem = ({ children, ...props }) => {
  return (
    <SelectPrimitive.Item
      className="bg-white text-[13px] leading-none rounded-[3px] flex items-center h-[25px] pr-[35px] pl-[25px] relative SelectPrimitive-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none"
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center" />
    </SelectPrimitive.Item>
  )
}

const Chevron = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
      fill="currentColor"
    ></path>
  </svg>
)
