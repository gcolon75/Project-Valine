import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ArtistAuth() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    await login("artist@demo.com", "", "artist");
    navigate("/dashboard");
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto container-narrow px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">Artist Login</h1>
      {/* your inputs… */}
      <button type="submit" className="btn primary">Continue</button>
    </form>
  );
}
