import { Link } from '~/components/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 font-mono">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-6xl font-bold">404</h1>
        <p className="mb-2 text-2xl uppercase">Page Not Found</p>
        <p className="mb-8 text-sm text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="rounded bg-black px-6 py-3 text-white uppercase hover:bg-gray-800 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
