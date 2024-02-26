import * as SelectPrimitive from '@radix-ui/react-select'
import React from 'react'
import { wrapFieldsWithMeta } from 'tinacms'

/* eslint-disable */

const parseLabel = (content) => {
  if (!content) return ''

  const filename = content.split('/').pop()
  const title = filename.replace('.md', '').replace(/-/g, ' ')

  return title[0].toUpperCase() + title.slice(1)
}

export const customReference = ({
  name = 'reference',
  label = 'Reference Field',
  filePath,
} = {}) => ({
  name,
  label,
  type: 'string',
  ui: {
    parse: (val) => String(val),
    component: wrapFieldsWithMeta(({ input }) => {
      const [list, setList] = React.useState([])
      const [checkIntegrity, setCheckIntegrity] = React.useState([])

      const dataFetcher = React.useCallback(() => {
        const fetchTest = async () => {
          const response = await fetch('/api/tina/read-files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filePath }),
          })
          return response.json()
        }

        fetchTest().then(({ file }) => {
          const content = JSON.parse(file)

          setList(
            content.map(({ fileName }) => ({
              label: parseLabel(fileName),
              value: fileName,
            })),
          )
        })
      }, [])

      React.useEffect(() => {
        dataFetcher()
      }, [dataFetcher])

      const filterListByValue = React.useCallback(
        (inputValue = null, list) => {
          if (!inputValue || !list.length) return

          const value = list.find(({ value }) => value === inputValue)

          return value
        },
        [list],
      )

      React.useEffect(() => {
        const integrity = filterListByValue(input?.value, list)

        setCheckIntegrity(!integrity)
      }, [list, input])

      return (
        <div>
          <SelectPrimitive.Root
            onValueChange={input.onChange}
            value={input.value}
          >
            <SelectPrimitive.Trigger className="flex items-center justify-center rounded px-[15px] text-[13px] leading-none h-[35px] gap-[5px] bg-white  shadow-[0_2px_10px] shadow-black/10 hover:bg-mauve3 focus:shadow-[0_0_0_2px] focus:shadow-black max-w-sm overflow-hidden">
              <SelectPrimitive.Value placeholder="Select a Reference" />
              <SelectPrimitive.Icon>
                <Chevron />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Content
              className="overflow-hidden bg-white rounded-md shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] mt-2 max-w-sm z-[100]"
              position="popper"
            >
              <SelectPrimitive.Viewport className="relative p-[5px] max-h-96 overflow-auto">
                {list?.map(({ label, value }) => (
                  <SelectItem key={label} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Root>
          {checkIntegrity && (
            <p
              className="bg-red-100 border border-red-400 text-red-700 text-xs px-4 py-3 mt-2 rounded relative"
              role="alert"
            >
              Warning: Selected reference has been deleted
            </p>
          )}
        </div>
      )
    }),
  },
})

const SelectItem = ({ children, ...props }) => {
  return (
    <SelectPrimitive.Item
      className="text-[13px] leading-none rounded-[3px] flex items-center h-[25px] pr-[35px] pl-[25px] relative SelectPrimitive-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none hover:bg-gray-100"
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
