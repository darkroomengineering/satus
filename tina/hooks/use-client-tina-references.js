import { isEmptyArray } from 'libs/utils'
import { useEffect, useState } from 'react'
import { getReferencesData } from 'tina/libs/utils'
import { useEditState } from 'tinacms/dist/react'

const setEditModeData = (data, targets) =>
  targets
    .map((target) => data[target]?.map(({ reference }) => ({ reference })))
    .flat()

const checkIfDataHasUpdated = (newData, oldData) => {
  if (!newData || !oldData) return true

  if (isEmptyArray(oldData)) return true
  if (isEmptyArray(newData)) return false

  return newData?.some(
    (item, idx) => item?.reference !== oldData[idx]?.reference,
  )
}

export const useTinaClientReferenceBlock = ({
  data,
  targets = ['references'],
  callback = () => {},
}) => {
  const [currentResources, setCurrentResources] = useState([])
  const { edit } = useEditState()

  useEffect(() => {
    if (edit) {
      const editModeData = setEditModeData(data, targets)

      if (!checkIfDataHasUpdated(editModeData, currentResources)) return

      getReferencesData(editModeData)
        .then((newData) => {
          callback(newData)
          setCurrentResources(editModeData)
        })
        .catch((e) => {
          console.error(e)
        })

      return
    }
  }, [data, edit, callback, targets, currentResources])
}

export const useFetchTinaHuspotForm = ({
  data,
  setter,
  callback = () => {},
}) => {
  const [currentForm, setCurrentForm] = useState(null)
  const { edit } = useEditState()

  const checkIfDataHasUpdated = (newData, oldData) =>
    !oldData && oldData !== newData

  useEffect(() => {
    if (!checkIfDataHasUpdated(data?.form?.hubspotForms, currentForm)) return

    if (edit) {
      fetch('/api/hubspot/get-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formId: data?.form?.hubspotForms }),
      })
        .then((res) => res.json())
        .then((updatedData) => {
          setter(updatedData)
          setCurrentForm(updatedData?.hubspotForms)
        })
        .catch((e) => {
          console.error(e)
        })

      return
    }

    callback()
  }, [edit, data, setter, callback, currentForm])
}
