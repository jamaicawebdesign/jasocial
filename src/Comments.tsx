import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Send, Trash2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type Comment = {
  id: string
  user_id?: string
  content: string
  created_at: string
  profiles?: { username: string; display_name: string } | null
}

type Props = {
  postId: string
  demo?: boolean
  user: User | null
  onCountChange: (count: number) => void
  onNotice: (message: string) => void
  onSignIn: () => void
}

const demoComments: Comment[] = [
  { id: 'c1', content: 'Pure vibes! Wish I was there right now. 🙌', created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(), profiles: { username: 'tropic_tee', display_name: 'Tee Williams' } },
  { id: 'c2', content: 'This is why we love the island.', created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(), profiles: { username: 'rootsandrhyme', display_name: 'Devon Clarke' } },
]

function ago(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

export default function Comments({ postId, demo, user, onCountChange, onNotice, onSignIn }: Props) {
  const [comments, setComments] = useState<Comment[]>(demo ? demoComments : [])
  const [loading, setLoading] = useState(!demo)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (demo || !supabase) return
    let active = true
    supabase.from('post_comments')
      .select('id, user_id, content, created_at, profiles(username, display_name)')
      .eq('post_id', postId).order('created_at', { ascending: true }).limit(100)
      .then(({ data, error }) => {
        if (!active) return
        setLoading(false)
        if (error) { onNotice('Could not load comments.'); return }
        const rows = (data as unknown as Comment[]) ?? []
        setComments(rows)
        onCountChange(rows.length)
      })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, demo])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    if (!user) { onSignIn(); return }
    if (demo || !supabase) {
      const next = [...comments, { id: `local-${Date.now()}`, content, created_at: new Date().toISOString(), profiles: { username: 'you', display_name: 'You' } }]
      setComments(next); onCountChange(next.length); setDraft('')
      return
    }
    setSending(true)
    const { data, error } = await supabase.from('post_comments').insert({ post_id: postId, content })
      .select('id, user_id, content, created_at, profiles(username, display_name)').single()
    setSending(false)
    if (error) { onNotice(error.message); return }
    const next = [...comments, data as unknown as Comment]
    setComments(next); onCountChange(next.length); setDraft('')
  }

  async function remove(comment: Comment) {
    if (!supabase) return
    const { error } = await supabase.from('post_comments').delete().eq('id', comment.id)
    if (error) { onNotice(error.message); return }
    const next = comments.filter((item) => item.id !== comment.id)
    setComments(next); onCountChange(next.length)
  }

  return (
    <div className="comments">
      {loading && <p className="comments-empty">Loading comments…</p>}
      {!loading && comments.length === 0 && <p className="comments-empty">No comments yet. Start the conversation.</p>}
      {comments.map((comment) => (
        <div className="comment" key={comment.id}>
          <span className="avatar avatar-sm avatar-green">{(comment.profiles?.display_name || 'J').charAt(0).toUpperCase()}</span>
          <div className="comment-body">
            <div><strong>{comment.profiles?.display_name || 'JaSocial member'}</strong><small>@{comment.profiles?.username || 'member'} · {ago(comment.created_at)}</small></div>
            <p>{comment.content}</p>
          </div>
          {user && comment.user_id === user.id && (
            <button className="icon-btn" aria-label="Delete comment" onClick={() => remove(comment)}><Trash2 size={14} /></button>
          )}
        </div>
      ))}
      <form className="comment-form" onSubmit={submit}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={300} placeholder={user ? 'Add a comment…' : 'Sign in to comment'} aria-label="Add a comment" />
        <button className="button button-green" disabled={sending || !draft.trim()} aria-label="Send comment"><Send size={14} /></button>
      </form>
    </div>
  )
}
