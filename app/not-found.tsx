import { Link } from '@/components/ui/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 font-mono">
      <div className="max-w-md text-center">
        <h1 className="mb-4 font-bold text-6xl">404</h1>
        <p className="mb-2 text-2xl uppercase">Page Not Found</p>
        <p className="mb-8 text-gray-600 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="rounded bg-black px-6 py-3 text-white uppercase transition-colors hover:bg-gray-800"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
