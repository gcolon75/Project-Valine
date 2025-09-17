import { Link } from "react-router-dom";

export default function ObserverAuth() {
  return (
    <section className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Observer Login</h1>
      {/* your form fields here… */}
      <div className="mt-6 flex gap-3">
        <Link to="/dashboard" className="btn btn-brand">Continue as Observer</Link>
      </div>
    </section>
  );
}
