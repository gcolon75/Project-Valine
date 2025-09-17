import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="mx-auto container-narrow px-4">
      <div className="py-16 md:py-24 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">Showcase your talent. Get discovered.</h1>
          <p className="mt-4 text-gray-600">Project Valine is a creator-first network for artists, actors, writers and the people looking for them.</p>
          <div className="mt-6 flex gap-3">
            <Link to="/auth/artist" className="btn btn-brand">Become an Artist</Link>
            <Link to="/auth/observer" className="btn btn-ghost">Become an Observer</Link>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Already have an account? <Link className="underline" to="/login">Login</Link>
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold">Why Valine?</h3>
          <ul className="mt-3 list-disc pl-5 text-gray-700 space-y-1">
            <li>Clean, visual profiles built for creative work</li>
            <li>Search tools that match talent with real opportunities</li>
            <li>Private dashboards like Instagram/LinkedIn (coming soon)</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
