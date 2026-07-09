import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function Stars({ rating }) {
  return (
    <span style={{ color: '#FFB347', letterSpacing: 2 }}>
      {'★'.repeat(rating) + '☆'.repeat(5 - rating)}
    </span>
  )
}

// Deliberately distinct from the Flutter app's brand-tinted category colors
// (which all lean teal/purple/blue) - a conventional bug/suggestion/
// compliment red/blue/green reads faster at a glance in a scan-heavy admin
// list than reusing the app's exact palette would.
const CATEGORY_META = {
  bug: { label: 'Bug', color: '#E53935' },
  suggestion: { label: 'Suggestion', color: '#1E88E5' },
  compliment: { label: 'Compliment', color: '#43A047' },
}

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'bug', label: 'Bugs' },
  { value: 'suggestion', label: 'Suggestions' },
  { value: 'compliment', label: 'Compliments' },
]

function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category]
  if (!meta) return null
  return (
    <span
      className="category-badge"
      style={{ background: `${meta.color}26`, color: meta.color }}
    >
      {meta.label}
    </span>
  )
}

export default function FeedbackTab({ onFeedbackChange }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keeps the list live while this tab is mounted - new submissions,
  // status changes, and replies from either side all refresh it.
  useEffect(() => {
    const channel = supabase
      .channel('admin-feedback-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_feedback' }, loadList)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_feedback' }, loadList)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback_replies' },
        loadList
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadList() {
    const { data, error: rpcError } = await supabase.rpc('get_admin_feedback_list')
    if (rpcError) {
      setError(rpcError.message || 'Failed to load feedback.')
    } else {
      setItems(data ?? [])
    }
    onFeedbackChange?.()
  }

  if (selectedId) {
    return (
      <FeedbackThread
        feedbackId={selectedId}
        onBack={() => {
          setSelectedId(null)
          loadList()
        }}
        onFeedbackChange={onFeedbackChange}
      />
    )
  }

  if (error) {
    return (
      <div className="card error-card">
        <strong>Couldn't load feedback.</strong>
        <p>{error}</p>
      </div>
    )
  }

  if (items === null) {
    return <div className="card">Loading feedback…</div>
  }

  if (items.length === 0) {
    return (
      <div className="card empty-state">
        <h2>Feedback Inbox</h2>
        <p>No feedback submitted yet.</p>
      </div>
    )
  }

  const categoryCounts = {
    all: items.length,
    bug: items.filter((item) => item.category === 'bug').length,
    suggestion: items.filter((item) => item.category === 'suggestion').length,
    compliment: items.filter((item) => item.category === 'compliment').length,
  }
  const filteredItems =
    categoryFilter === 'all' ? items : items.filter((item) => item.category === categoryFilter)

  return (
    <div className="dashboard">
      <h2 className="section-title">Feedback Inbox</h2>
      <div className="filter-chips">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value}
            className={categoryFilter === f.value ? 'filter-chip active' : 'filter-chip'}
            onClick={() => setCategoryFilter(f.value)}
          >
            {f.label} ({categoryCounts[f.value]})
          </button>
        ))}
      </div>
      {filteredItems.length === 0 ? (
        <div className="card empty-state">
          <p>No feedback in this category.</p>
        </div>
      ) : (
        <div className="feedback-list">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={item.unread ? 'feedback-row card unread' : 'feedback-row card'}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="feedback-row-top">
                <div className="feedback-row-title">
                  {item.unread && <span className="unread-dot" aria-label="Unread" />}
                  <Stars rating={item.rating} />
                </div>
                <span
                  className={
                    item.status === 'resolved' ? 'status-badge resolved' : 'status-badge open'
                  }
                >
                  {item.status === 'resolved' ? 'Resolved' : 'Open'}
                </span>
              </div>
              <div className="feedback-category">
                <CategoryBadge category={item.category} />
              </div>
              <p className="feedback-preview">{item.message || '(no message)'}</p>
              <div className="feedback-meta">{formatDate(item.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackThread({ feedbackId, onBack, onFeedbackChange }) {
  const [thread, setThread] = useState(null)
  const [error, setError] = useState('')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId])

  // Appends a new reply live if the user follows up while this thread is
  // open, rather than requiring the admin to back out and reopen it.
  useEffect(() => {
    const channel = supabase
      .channel(`admin-feedback-thread-${feedbackId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback_replies',
          filter: `feedback_id=eq.${feedbackId}`,
        },
        (payload) => {
          setThread((prev) => {
            if (!prev) return prev
            if (prev.replies.some((r) => r.id === payload.new.id)) return prev
            return { ...prev, replies: [...prev.replies, payload.new] }
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [feedbackId])

  async function load() {
    const { data, error: rpcError } = await supabase.rpc('get_admin_feedback_thread', {
      p_feedback_id: feedbackId,
    })
    if (rpcError) {
      setError(rpcError.message || 'Failed to load thread.')
    } else {
      setThread(data)
      // Viewing this thread already marked it read server-side (a side
      // effect of get_admin_feedback_thread); this lets the badge/list
      // catch up without waiting for a reply, status change, or back-nav.
      onFeedbackChange?.()
    }
  }

  async function sendReply() {
    const message = replyText.trim()
    if (!message || sending) return
    setSending(true)
    const { error: rpcError } = await supabase.rpc('admin_reply_to_feedback', {
      p_feedback_id: feedbackId,
      p_message: message,
    })
    setSending(false)
    if (rpcError) {
      setError(rpcError.message || 'Failed to send reply.')
      return
    }
    setReplyText('')
    await load()
    onFeedbackChange?.()
  }

  async function toggleStatus() {
    if (!thread?.feedback || togglingStatus) return
    const nextStatus = thread.feedback.status === 'resolved' ? 'open' : 'resolved'
    setTogglingStatus(true)
    const { error: rpcError } = await supabase.rpc('admin_set_feedback_status', {
      p_feedback_id: feedbackId,
      p_status: nextStatus,
    })
    setTogglingStatus(false)
    if (rpcError) {
      setError(rpcError.message || 'Failed to update status.')
      return
    }
    await load()
    onFeedbackChange?.()
  }

  return (
    <div className="dashboard">
      <div className="thread-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        {thread?.feedback && (
          <button className="status-toggle-btn" onClick={toggleStatus} disabled={togglingStatus}>
            {thread.feedback.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {!thread ? (
        <div className="card">Loading thread…</div>
      ) : !thread.feedback ? (
        <div className="card error-card">This feedback could not be found.</div>
      ) : (
        <>
          <div className="card">
            <div className="feedback-row-top">
              <Stars rating={thread.feedback.rating} />
              <span
                className={
                  thread.feedback.status === 'resolved'
                    ? 'status-badge resolved'
                    : 'status-badge open'
                }
              >
                {thread.feedback.status === 'resolved' ? 'Resolved' : 'Open'}
              </span>
            </div>
            <div className="feedback-category">
              <CategoryBadge category={thread.feedback.category} />
              {thread.feedback.user_email ? ` · ${thread.feedback.user_email}` : ''}
            </div>
            <p className="feedback-preview">{thread.feedback.message || '(no message)'}</p>
            <div className="feedback-meta">{formatDate(thread.feedback.created_at)}</div>
          </div>

          <div className="card">
            <h3 className="subsection-title">Replies</h3>
            {thread.replies.length === 0 ? (
              <p className="empty-text">No replies yet.</p>
            ) : (
              <div className="reply-thread">
                {thread.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={
                      reply.sender === 'admin' ? 'reply-bubble admin' : 'reply-bubble user'
                    }
                  >
                    <div className="reply-message">{reply.message}</div>
                    <div className="reply-meta">{formatDate(reply.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="reply-composer">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                rows={3}
              />
              <button onClick={sendReply} disabled={sending || !replyText.trim()}>
                {sending ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
