import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DocumentEditor from "../components/DocumentEditor.jsx";
import Logo from "../components/Logo.jsx";
import { api, getErrorMessage } from "../lib/api.js";

export default function SharePage() {
  const { shareId } = useParams();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSharedDocument() {
      try {
        const { data } = await api.get(`/share/${shareId}`);
        if (alive) setPayload(data);
      } catch (err) {
        if (alive) setError(getErrorMessage(err));
      }
    }

    loadSharedDocument();
    return () => {
      alive = false;
    };
  }, [shareId]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper p-6 text-center">
        <div className="max-w-md">
          <Logo />
          <h1 className="mt-8 text-3xl font-extrabold text-ink">This share link is unavailable</h1>
          <p className="mt-3 text-clay">{error}</p>
          <Link className="mt-6 inline-flex rounded-lg bg-ink px-4 py-3 font-bold text-paper" to="/login">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (!payload) {
    return <div className="grid min-h-screen place-items-center bg-paper text-ink">Opening shared note...</div>;
  }

  return <DocumentEditor initialDocument={payload.document} initialRole={payload.role} shareId={shareId} />;
}
