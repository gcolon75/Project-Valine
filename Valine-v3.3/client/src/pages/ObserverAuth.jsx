import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function ObserverAuth() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const navigate = useNavigate()

  const onSubmit = (e) => {
    e.preventDefault()
    // stub: pretend to create profile, then send to login
    navigate('/login')
  }

  return (
    <div className="mx-auto container-narrow px-4 py-16 max-w-xl">
      <h1 className="text-2xl font-semibold">Become an Observer</h1>
      <p className="text-sm text-gray-600 mt-1">For talent seekers, producers, editors, casting, etc. Stub form.</p>
      <form onSubmit={onSubmit} className="mt-6 card p-6 space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={name} onChange={e=>setName(e.target.value)} required/>
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="w-full rounded-xl border border-gray-300 px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} required/>
        </div>
        <div>
          <label className="block text-sm mb-1">Organization</label>
          <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={org} onChange={e=>setOrg(e.target.value)} />
        </div>
        <button className="btn btn-brand w-full">Continue</button>
      </form>
      <p className="text-sm text-gray-500 mt-3">Already have an account? <Link className="underline" to="/login">Login</Link></p>
    </div>
  )
}
