export default function Footer() {
  return (
    <footer className="border-t border-gray-200">
      <div className="mx-auto container-narrow px-4 py-6 text-sm text-gray-500 flex items-center justify-between">
        <p>© {new Date().getFullYear()} Project Valine</p>
        <div className="flex gap-3">
          <a href="#" className="hover:text-gray-800">Privacy</a>
          <a href="#" className="hover:text-gray-800">Terms</a>
        </div>
      </div>
    </footer>
  )
}
