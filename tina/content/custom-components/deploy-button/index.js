import React, { useCallback, useState } from 'react'

export const deployButton = (cms) => {
  const screenPlugin = {
    __type: 'screen',
    name: 'Deploy',
    Icon: () => <div className="mr-2">🚀</div>,

    Component: () => {
      const [deployStatus, setDeployStatus] = useState('idle')
      const [error, setError] = useState(null)
      const [success, setSuccess] = useState(null)

      const onClick = useCallback(() => {
        setDeployStatus('deploying')

        const fetchData = async () => {
          const tinaCloudClient = cms.api.tina

          if (!tinaCloudClient?.fetchWithToken) {
            setDeployStatus('error')
            setError('Server Error')
            return
          }

          const response = await tinaCloudClient.fetchWithToken(
            `/api/deploy?clientID=${process.env.NEXT_PUBLIC_TINA_CLIENT_ID}`,
          )

          const inResposne = await response.json()

          if (!response.ok) {
            setDeployStatus('error')
            setError(inResposne.message)
            return
          }

          setDeployStatus('deployed')
          setSuccess(inResposne.message)
        }

        fetchData()
      }, [])

      return (
        <div className="flex flex-col justify-center items-center h-full m-auto">
          <button
            onClick={onClick}
            className={`icon-parent inline-flex items-center font-medium focus:outline-none focus:ring-2 focus:shadow-outline text-center justify-center shadow text-white bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 border-0 text-sm h-10 px-4 rounded-full w-80 ${
              deployStatus === 'deploying' && 'opacity-50 pointer-events-none'
            } ${
              deployStatus === 'deployed' &&
              'opacity-50 pointer-events-none bg-green-500'
            } 
            
            ${
              deployStatus === 'error' &&
              'opacity-50 pointer-events-none bg-red-500'
            }`}
          >
            Deploy to production
          </button>
          {deployStatus === 'deployed' && (
            <p className="font-mono text-xs text-green-600 mt-2">{success}</p>
          )}
          {deployStatus === 'error' && (
            <p className="font-mono text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>
      )
    },
  }

  cms.plugins.add(screenPlugin)

  return cms
}
