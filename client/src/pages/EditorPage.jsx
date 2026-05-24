import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DocumentEditor from "../components/DocumentEditor.jsx";
import { api, getErrorMessage } from "../lib/api.js";

export default function EditorPage() {
  const { documentId } = useParams();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadDocument() {
      try {
        const { data } = await api.get(`/documents/${documentId}`);
        if (alive) setPayload(data);
      } catch (err) {
        if (alive) setError(getErrorMessage(err));
      }
    }

    loadDocument();
    return () => {
      alive = false;
    };
  }, [documentId]);

  if (error) {
    return <div className="grid min-h-screen place-items-center bg-paper p-6 text-center font-bold text-clay">{error}</div>;
  }

  if (!payload) {
    return <div className="grid min-h-screen place-items-center bg-paper text-ink">Loading document...</div>;
  }

  return <DocumentEditor initialDocument={payload.document} initialRole={payload.role} />;
}
