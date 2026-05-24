import { useEffect, useMemo, useRef, useState } from "react";
import Quill from "quill";
import { ArrowLeft, Check, Copy, Eye, Globe2, Lock, Pencil, Share2, Trash2, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { createSocket } from "../lib/socket.js";

const cursorColors = ["#496651", "#c07155", "#3f6f8f", "#936f9f", "#b08a36", "#4f7d7a"];

function canEdit(role) {
  return ["owner", "editor"].includes(role);
}

function colorForName(name = "") {
  const total = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return cursorColors[total % cursorColors.length];
}

function roleLabel(role) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Can edit";
  return "Read only";
}

export default function DocumentEditor({ initialDocument, initialRole, shareId }) {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [doc, setDoc] = useState(initialDocument);
  const [title, setTitle] = useState(initialDocument.title);
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");
  const [shareRole, setShareRole] = useState(initialDocument.shareRole || "off");
  const [shareCode, setShareCode] = useState(initialDocument.shareId || "");
  const [copied, setCopied] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState({});

  const editorHostRef = useRef(null);
  const editorShellRef = useRef(null);
  const quillRef = useRef(null);
  const socketRef = useRef(null);
  const documentId = doc._id || doc.id;
  const editable = canEdit(role);

  const shareLink = useMemo(() => {
    if (!shareCode) return "";
    return `${window.location.origin}/share/${shareCode}`;
  }, [shareCode]);

  useEffect(() => {
    setDoc(initialDocument);
    setTitle(initialDocument.title);
    setShareRole(initialDocument.shareRole || "off");
    setShareCode(initialDocument.shareId || "");
    setRole(initialRole);
  }, [initialDocument, initialRole]);

  useEffect(() => {
    if (!editorHostRef.current) return undefined;

    editorHostRef.current.innerHTML = "";
    const editorNode = document.createElement("div");
    editorHostRef.current.append(editorNode);

    const quill = new Quill(editorNode, {
      theme: "snow",
      readOnly: !editable,
      modules: {
        toolbar: editable
          ? [
              [{ header: [1, 2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ list: "ordered" }, { list: "bullet" }, "blockquote"],
              ["link", "clean"]
            ]
          : false
      },
      placeholder: editable ? "Start writing..." : "This document is read-only."
    });

    quill.setContents(doc.content || { ops: [{ insert: "\n" }] });
    quill.enable(editable);
    quillRef.current = quill;

    const handleTextChange = (delta, _oldDelta, source) => {
      if (source !== "user" || !socketRef.current || !editable) return;

      setStatus("Saving");
      socketRef.current.emit("document-change", {
        documentId,
        delta,
        content: quill.getContents(),
        plainText: quill.getText().trim()
      });
      window.clearTimeout(handleTextChange.timer);
      handleTextChange.timer = window.setTimeout(() => setStatus("Saved"), 550);
    };

    const handleSelectionChange = (range, _oldRange, source) => {
      if (source !== "user" || !socketRef.current || !range) return;
      socketRef.current.emit("cursor-change", {
        documentId,
        range,
        color: colorForName(user?.name || "Guest")
      });
    };

    quill.on("text-change", handleTextChange);
    quill.on("selection-change", handleSelectionChange);

    return () => {
      window.clearTimeout(handleTextChange.timer);
      quill.off("text-change", handleTextChange);
      quill.off("selection-change", handleSelectionChange);
      quillRef.current = null;
      if (editorHostRef.current) {
        editorHostRef.current.innerHTML = "";
      }
    };
  }, [documentId, editable, doc.content, user?.name]);

  useEffect(() => {
    const socket = createSocket(token);
    socketRef.current = socket;
    setStatus("Connecting");

    socket.emit("join-document", { documentId, shareId }, (response) => {
      if (!response?.ok) {
        setError(response?.message || "Unable to join document.");
        setStatus("Offline");
        return;
      }

      setRole(response.role);
      setStatus("Live");
      if (response.document?.content && quillRef.current) {
        quillRef.current.setContents(response.document.content);
      }
    });

    socket.on("connect_error", () => setStatus("Offline"));
    socket.on("receive-change", ({ delta }) => {
      quillRef.current?.updateContents(delta, "api");
      setStatus("Live");
    });
    socket.on("remote-cursor", ({ socketId, user: remoteUser, range, color }) => {
      setRemoteCursors((current) => ({
        ...current,
        [socketId]: {
          user: remoteUser,
          range,
          color: color || colorForName(remoteUser?.name)
        }
      }));
    });
    socket.on("presence-left", ({ socketId }) => {
      setRemoteCursors((current) => {
        const next = { ...current };
        delete next[socketId];
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, shareId, token]);

  async function saveTitle() {
    if (!editable || shareId || title.trim() === doc.title) return;

    try {
      const { data } = await api.patch(`/documents/${documentId}`, { title: title.trim() });
      setDoc(data.document);
      setTitle(data.document.title);
      setStatus("Saved");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function updateShare(nextRole) {
    try {
      const { data } = await api.put(`/documents/${documentId}/share`, { shareRole: nextRole });
      setShareRole(data.shareRole);
      setShareCode(data.shareId || "");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function copyShareLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function deleteDocument() {
    const confirmed = window.confirm(`Delete "${title}" permanently?`);
    if (!confirmed) return;

    try {
      await api.delete(`/documents/${documentId}`);
      navigate("/app");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const cursorViews = Object.entries(remoteCursors).map(([socketId, cursor]) => {
    if (!quillRef.current || !cursor.range) return null;
    const bounds = quillRef.current.getBounds(cursor.range.index);
    return (
      <div
        key={socketId}
        className="remote-cursor"
        style={{ left: bounds.left, top: bounds.top, backgroundColor: cursor.color }}
      >
        <span style={{ backgroundColor: cursor.color }}>{cursor.user?.name || "Guest"}</span>
      </div>
    );
  });

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-mist" to="/app" title="Back to workspace">
              <ArrowLeft size={20} />
            </Link>
            <Logo compact />
            <div className="min-w-0 border-l border-ink/10 pl-3">
              <input
                className="w-full min-w-0 bg-transparent text-xl font-extrabold tracking-normal outline-none disabled:text-ink"
                value={title}
                onBlur={saveTitle}
                onChange={(event) => setTitle(event.target.value)}
                disabled={!editable || Boolean(shareId)}
              />
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
                <span>{roleLabel(role)}</span>
                <span className="h-1 w-1 rounded-full bg-ink/25" />
                <span>{status}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink/60">
              <Users size={16} />
              {Object.keys(remoteCursors).length + 1} online
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink/60">
              {editable ? <Pencil size={16} /> : <Eye size={16} />}
              {editable ? "Editing" : "Viewing"}
            </div>
            {role === "owner" && !shareId && (
              <button
                className="grid h-10 w-10 place-items-center rounded-lg border border-clay/30 bg-clay/10 text-clay transition hover:bg-clay hover:text-white"
                onClick={deleteDocument}
                title="Delete document"
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
        </div>
      </header>

      {error && <p className="mx-auto mt-4 max-w-7xl rounded-lg bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">{error}</p>}

      {role === "owner" && !shareId && (
        <section className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-mist">
                {shareRole === "off" ? <Lock size={18} /> : <Globe2 size={18} />}
              </div>
              <div>
                <h2 className="font-extrabold">Share link</h2>
                <p className="text-sm text-ink/55">{shareLink || "Link sharing is off for this document."}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm font-bold outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                value={shareRole}
                onChange={(event) => updateShare(event.target.value)}
              >
                <option value="off">Private</option>
                <option value="viewer">Read-only link</option>
                <option value="editor">Edit link</option>
              </select>
              <button
                className="flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-bold text-paper disabled:cursor-not-allowed disabled:opacity-50"
                onClick={copyShareLink}
                disabled={!shareLink}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto mt-4 max-w-7xl px-0 sm:px-6">
        <div className="overflow-hidden border-y border-ink/10 bg-white shadow-sm sm:rounded-lg sm:border">
          <div className="relative" ref={editorShellRef}>
            <div ref={editorHostRef} />
            <div className="pointer-events-none absolute left-0 top-[43px]">{cursorViews}</div>
          </div>
        </div>
      </section>

      <button
        className="fixed bottom-5 right-5 grid h-12 w-12 place-items-center rounded-lg bg-clay text-white shadow-soft"
        title="Sharing"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <Share2 size={20} />
      </button>
    </main>
  );
}
