export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-03-15'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
    process.env.SANITY_STUDIO_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
)

export const studioUrl = assertValue(
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/studio'
    : `${process.env.NEXT_PUBLIC_BASE_URL}/studio`,
  'Missing environment variable: NEXT_PUBLIC_BASE_URL'
)

export const publicToken = assertValue(
  process.env.NEXT_PUBLIC_SANITY_API_READ_TOKEN,
  'Missing environment variable: NEXT_PUBLIC_SANITY_API_READ_TOKEN'
)

export const privateToken = process.env.SANITY_PRIVATE_TOKEN

export const previewURL = assertValue(
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_BASE_URL,
  'Missing environment variable: NEXT_PUBLIC_BASE_URL'
)

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }

  return v
}
