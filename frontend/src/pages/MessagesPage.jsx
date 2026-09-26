import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { ensureSocket } from "../services/socket";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Avatar from "../components/ui/Avatar";
import { formatPrice, formatTime } from "../lib/format";

const LIST_LIMIT = 20;
const MESSAGE_LIMIT = 100;
const LIST_ERROR = "Could not load your messages.";
const THREAD_ERROR = "Could not load this conversation.";

export default function MessagesPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();

  // `attempt` counters tag each piece of state with the request that produced
  // it, so switching conversations reads as "loading" without an effect that
  // has to reset state.
  const [list, setList] = useState(null);
  const [listAttempt, setListAttempt] = useState(0);
  const [thread, setThread] = useState(null);
  const [threadAttempt, setThreadAttempt] = useState(0);

  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState({ id: null, message: "" });
  const [earlierError, setEarlierError] = useState({ id: null, message: "" });
  const [connected, setConnected] = useState(
    () => ensureSocket()?.connected ?? false
  );

  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/conversations", { params: { page: 1, limit: LIST_LIMIT } })
      .then((res) => {
        if (!cancelled) {
          setList({
            attempt: listAttempt,
            conversations: res.data.data,
            error: "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setList({
            attempt: listAttempt,
            conversations: [],
            error: err.response?.data?.error || LIST_ERROR,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listAttempt]);

  // Conversation header and message history load together: the chat pane is
  // only usable when both are in.
  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const [detail, firstPage] = await Promise.all([
          api.get(`/conversations/${conversationId}`),
          api.get(`/conversations/${conversationId}/messages`, {
            params: { page: 1, limit: MESSAGE_LIMIT },
          }),
        ]);

        let messages = firstPage.data.data;
        let pagination = firstPage.data.pagination;

        // Page 1 holds the oldest messages, so a long thread opens on the
        // last page; earlier messages come in through "load earlier".
        if (pagination.totalPages > 1) {
          const lastPage = await api.get(
            `/conversations/${conversationId}/messages`,
            { params: { page: pagination.totalPages, limit: MESSAGE_LIMIT } }
          );
          messages = lastPage.data.data;
          pagination = lastPage.data.pagination;
        }

        if (cancelled) return;
        setThread({
          id: conversationId,
          conversation: detail.data.data,
          messages,
          page: pagination.page,
          totalPages: pagination.totalPages,
          error: "",
        });
      } catch (err) {
        if (cancelled) return;
        setThread({
          id: conversationId,
          conversation: null,
          messages: [],
          page: 1,
          totalPages: 1,
          error: err.response?.data?.error || THREAD_ERROR,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, threadAttempt]);

  // Real-time delivery: append messages for the open conversation and refresh
  // the list so previews and ordering follow the latest activity.
  useEffect(() => {
    const socket = ensureSocket();
    if (!socket) return undefined;

    const handleNewMessage = ({ conversationId: id, message }) => {
      setThread((previous) => {
        if (!previous || String(previous.id) !== String(id)) return previous;
        if (previous.messages.some((item) => item.id === message.id)) {
          return previous;
        }
        return { ...previous, messages: [...previous.messages, message] };
      });
      setListAttempt((value) => value + 1);
    };
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("new_message", handleNewMessage);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  const conversations = list?.conversations ?? [];
  const listLoading = !list || list.attempt !== listAttempt;
  const activeThread =
    thread && String(thread.id) === String(conversationId) ? thread : null;
  const threadLoading = Boolean(conversationId) && !activeThread;
  const conversation = activeThread?.conversation ?? null;
  const other = otherParticipant(conversation, user);
  const draft = drafts[conversationId] ?? "";

  // Keep the newest message in view. Keyed on the last message id so loading
  // earlier messages does not yank the view back down.
  const lastMessageId = activeThread?.messages.at(-1)?.id ?? null;
  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [lastMessageId, conversationId]);

  function handleDraftChange(event) {
    const value = event.target.value;
    setDrafts((previous) => ({ ...previous, [conversationId]: value }));
    // Grow the composer with the text, up to a cap.
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
  }

  async function handleSend(event) {
    event?.preventDefault();
    const body = (drafts[conversationId] ?? "").trim();
    if (!body || sending) return;

    setSending(true);
    setSendError({ id: conversationId, message: "" });
    try {
      const res = await api.post(`/conversations/${conversationId}/messages`, {
        body,
      });
      const message = res.data.data;
      setThread((previous) => {
        if (!previous || String(previous.id) !== String(conversationId)) {
          return previous;
        }
        if (previous.messages.some((item) => item.id === message.id)) {
          return previous;
        }
        return { ...previous, messages: [...previous.messages, message] };
      });
      setDrafts((previous) => ({ ...previous, [conversationId]: "" }));
    } catch (err) {
      setSendError({
        id: conversationId,
        message: err.response?.data?.error || "Could not send this message.",
      });
    } finally {
      setSending(false);
    }
  }

  async function loadEarlier() {
    if (!activeThread || activeThread.page <= 1) return;
    const targetPage = activeThread.page - 1;
    setEarlierError({ id: conversationId, message: "" });
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`, {
        params: { page: targetPage, limit: MESSAGE_LIMIT },
      });
      setThread((previous) => {
        if (!previous || String(previous.id) !== String(conversationId)) {
          return previous;
        }
        return {
          ...previous,
          messages: [...res.data.data, ...previous.messages],
          page: targetPage,
        };
      });
    } catch (err) {
      setEarlierError({
        id: conversationId,
        message:
          err.response?.data?.error || "Could not load earlier messages.",
      });
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text">Messages</h1>
        <p className="text-sm text-text-secondary">
          {connected
            ? "Chats update in real time."
            : "Live updates are reconnecting — messages still send and load."}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-4 space-y-4 lg:space-y-0">
        {/* Conversation list. Hidden on mobile while a chat is open. */}
        <aside
          className={`flex-col h-[70vh] min-h-[420px] rounded-2xl border border-border bg-surface overflow-hidden ${
            conversationId ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-text">Conversations</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {listLoading && (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6 text-campus-green" />
              </div>
            )}

            {!listLoading && list?.error && (
              <div className="p-4 space-y-3">
                <Alert variant="error">{list.error}</Alert>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  className="w-full"
                  onClick={() => setListAttempt((value) => value + 1)}
                >
                  Try again
                </Button>
              </div>
            )}

            {!listLoading && !list?.error && conversations.length === 0 && (
              <div className="p-4">
                <EmptyState
                  icon="💬"
                  title="No messages yet"
                  description="Open a listing and contact the seller to start a conversation."
                />
              </div>
            )}

            {!listLoading &&
              conversations.map((item) => {
                const peer =
                  item.buyer.id === user.id ? item.seller : item.buyer;
                const active = String(item.id) === String(conversationId);
                return (
                  <Link
                    key={item.id}
                    to={`/messages/${item.id}`}
                    className={`flex gap-3 px-4 py-3 transition-colors ${
                      active
                        ? "bg-campus-green-light"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    <Avatar user={peer} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-text truncate">
                          {peer.name}
                        </p>
                        <span className="text-[10px] text-text-muted shrink-0">
                          {formatTime(
                            item.lastMessage?.createdAt ?? item.updatedAt
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-campus-green truncate">
                        {item.listing.title}
                      </p>
                      <p className="text-sm text-text-secondary truncate">
                        {item.lastMessage?.body ?? "No messages yet"}
                      </p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </aside>

        {/* Active chat. Hidden on mobile until a conversation is picked. */}
        <section
          className={`flex-col h-[70vh] min-h-[420px] rounded-2xl border border-border bg-surface overflow-hidden ${
            conversationId ? "flex" : "hidden lg:flex"
          }`}
        >
          {!conversationId && (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon="🗨️"
                title="Select a conversation"
                description="Pick a conversation on the left to read and reply."
              />
            </div>
          )}

          {conversationId && threadLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Spinner className="h-6 w-6 text-campus-green" />
            </div>
          )}

          {conversationId && activeThread?.error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <Alert variant="error">{activeThread.error}</Alert>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setThreadAttempt((value) => value + 1)}
                >
                  Try again
                </Button>
                <Link to="/messages">
                  <Button variant="ghost" size="sm" type="button">
                    Back to messages
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {conversationId && activeThread && !activeThread.error && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                <Link
                  to="/messages"
                  aria-label="Back to messages"
                  className="lg:hidden text-text-secondary hover:text-text shrink-0"
                >
                  ←
                </Link>
                <Avatar user={other} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">
                    {other?.name ?? "Conversation"}
                  </p>
                  <Link
                    to={`/listings/${conversation.listing.id}`}
                    className="text-xs text-campus-green hover:underline truncate block"
                  >
                    {conversation.listing.title} ·{" "}
                    {formatPrice(conversation.listing.price)}
                  </Link>
                </div>
                {conversation.listing.status !== "ACTIVE" && (
                  <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-surface-hover border border-border text-text-muted px-2 py-1">
                    {conversation.listing.status === "SOLD"
                      ? "Sold"
                      : "Inactive"}
                  </span>
                )}
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              >
                {activeThread.page > 1 && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={loadEarlier}
                    >
                      Load earlier messages
                    </Button>
                    {earlierError.id === conversationId &&
                      earlierError.message && (
                        <Alert variant="error" className="mt-2">
                          {earlierError.message}
                        </Alert>
                      )}
                  </div>
                )}

                {activeThread.messages.length === 0 && (
                  <EmptyState
                    icon="👋"
                    title="No messages yet"
                    description="Say hello and arrange the handoff."
                  />
                )}

                {activeThread.messages.map((message, index) => {
                  const mine = message.senderId === user.id;
                  const sender = mine ? user : other;
                  const previous = activeThread.messages[index - 1];
                  const showName =
                    !mine &&
                    (!previous || previous.senderId !== message.senderId);
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${
                        mine ? "flex-row-reverse" : ""
                      }`}
                    >
                      <Avatar user={sender} size="xs" className="mt-1" />
                      <div className="flex flex-col max-w-[75%]">
                        {showName && (
                          <p className="text-[11px] font-semibold text-campus-green mb-1 px-1">
                            {sender?.name}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                            mine
                              ? "bg-campus-green text-white rounded-br-sm"
                              : "bg-bg border border-border text-text rounded-bl-sm"
                          }`}
                        >
                          {message.body}
                        </div>
                        <p className="text-[10px] text-text-muted mt-1 px-1">
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-border p-3 shrink-0"
              >
                {sendError.id === conversationId && sendError.message && (
                  <Alert variant="error" className="mb-2">
                    {sendError.message}
                  </Alert>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    key={conversationId}
                    rows={1}
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    maxLength={1000}
                    placeholder={
                      other?.name ? `Message ${other.name}…` : "Type a message…"
                    }
                    aria-label="Message"
                    className="flex-1 resize-none rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm max-h-32 focus:outline-none focus:ring-2 focus:ring-campus-green/30 focus:border-campus-green"
                  />
                  <Button
                    type="submit"
                    loading={sending}
                    disabled={!draft.trim()}
                  >
                    Send
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function otherParticipant(conversation, user) {
  if (!conversation || !user) return null;
  return conversation.buyer.id === user.id
    ? conversation.seller
    : conversation.buyer;
}
