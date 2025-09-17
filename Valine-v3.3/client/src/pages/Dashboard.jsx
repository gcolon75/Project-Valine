import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <div className="mx-auto container-narrow px-4 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-gray-600 mt-1">Private area — visible only when logged in.</p>

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="card p-5">
          <h3 className="font-semibold">Profile</h3>
          <p className="text-sm text-gray-600 mt-1">Name: {user?.name}</p>
          <p className="text-sm text-gray-600">Role: {user?.role}</p>
          <p className="text-sm text-gray-600">Visibility: Private</p>
        </div>
        <div className="card p-5 md:col-span-2">
          <h3 className="font-semibold">Activity</h3>
          <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li>Post your first script</li>
            <li>Complete your profile</li>
            <li>Connect with observers or artists</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
