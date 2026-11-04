import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDown, ArrowRight, Bell, Bookmark, Check, ChevronDown, Compass, Flame,
  Heart, Home, ImagePlus, LogOut, MapPin, Menu, MessageCircle, MoreHorizontal,
  Music2, Search, Send, Sparkles, Store, Sun, Users, X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import Marketplace from './Marketplace'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Post = {
  id: string
  content: string
  created_at: string
  user_id?: string
  profiles?: { username: string; display_name: string; avatar_url: string | null } | null
  likes?: { user_id: string }[]
  demo?: boolean
  image?: string
  location?: string
  topic?: string
  localLiked?: boolean
}

const demoPosts: Post[] = [
  {
    id: 'demo-1', content: 'Somewhere between the sea breeze and the sound system, you remember what being alive feels like. Jamaica, you’re something special. 🇯🇲',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    profiles: { username: 'shaniceb', display_name: 'Shanice Brown', avatar_url: null },
    likes: Array.from({ length: 128 }, (_, i) => ({ user_id: `demo-${i}` })), location: 'Negril, Westmoreland', topic: 'Island life', image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=85', demo: true,
  },
  {
    id: 'demo-2', content: 'Little reminder: support the small businesses in your community. The woman selling patties down the road, the young artist at the market — they’re all part of what makes Jamaica home. ❤️💛💚',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    profiles: { username: 'marcuscreates', display_name: 'Marcus Reid', avatar_url: null },
    likes: Array.from({ length: 86 }, (_, i) => ({ user_id: `demo-${i}` })), location: 'Kingston, St. Andrew', topic: 'Community', demo: true,
  },
  {
    id: 'demo-3', content: 'Blue Mountain mornings hit different. ☕🌿 Already planning my next hike — who’s coming?',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    profiles: { username: 'koffeeandviews', display_name: 'Tiana Campbell', avatar_url: null },
    likes: Array.from({ length: 54 }, (_, i) => ({ user_id: `demo-${i}` })), location: 'Blue Mountains', topic: 'Outdoors', demo: true,
  },
]

const trends = [
  { tag: 'Reggae Month', posts: '2.4k posts', icon: Music2 },
  { tag: 'Kingston Eats', posts: '1.8k posts', icon: Flame },
  { tag: 'Island Life', posts: '956 posts', icon: Sun },
]
const people = [
  { name: 'Andre Campbell', handle: '@andrecooks', avatar: 'A', color: 'coral', info: 'Chef & storyteller' },
  { name: 'Keisha Morgan', handle: '@keishainmotion', avatar: 'K', color: 'lavender', info: 'Photographer' },
  { name: 'Jahmal Blake', handle: '@jahmalcreates', avatar: 'J', color: 'mint', info: 'Artist · Kingston' },
]
const navItems = [
  { label: 'Home', icon: Home },
  { label: 'Explore', icon: Compass },
  { label: 'Marketplace', icon: Store },
  { label: 'Communities', icon: Users },
  { label: 'Saved', icon: Bookmark },
]

function timeAgo(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function avatarInitial(name?: string | null) {
  return name?.trim().charAt(0).toUpperCase() || 'J'
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>(demoPosts)
  const [draft, setDraft] = useState('')
  const [activeFilter, setActiveFilter] = useState('For you')
  const [activeNav, setActiveNav] = useState('Home')
  const [email, setEmail] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.from('posts')
      .select('id, content, created_at, user_id, profiles(username, display_name, avatar_url), likes:post_likes(user_id)')
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setNotice('Could not load the community feed. Check your Supabase setup and policies.')
          return
        }
        setPosts((data as unknown as Post[] | null) ?? [])
      })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const visiblePosts = useMemo(() => {
    const term = search.trim().toLowerCase()
    let result = posts
    if (activeFilter === 'Following' && user) result = result.filter((post) => post.user_id === user.id)
    if (activeNav === 'Saved') result = []
    if (term) result = result.filter((post) =>
      `${post.content} ${post.profiles?.display_name} ${post.location} ${post.topic}`.toLowerCase().includes(term))
    return result
  }, [activeFilter, activeNav, posts, search, user])

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault()
    if (!supabase) { setNotice('Add your Supabase project keys to .env to enable sign in.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) { setNotice(error.message); return }
    setNotice('Check your email — your sign-in link is on its way.')
    setAuthOpen(false)
  }

  async function publishPost(event: FormEvent) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    if (!user || !supabase) { setAuthOpen(true); setNotice('Sign in to share with your community.'); return }
    setLoading(true)
    const { data, error } = await supabase.from('posts').insert({ content }).select('id, content, created_at, user_id, profiles(username, display_name, avatar_url), likes:post_likes(user_id)').single()
    setLoading(false)
    if (error) { setNotice(error.message); return }
    setPosts((current) => [data as unknown as Post, ...current])
    setDraft('')
    setNotice('Your post is live. 🇯🇲')
  }

  async function toggleLike(post: Post) {
    if (!user || !supabase || post.demo) { setAuthOpen(true); return }
    const liked = post.likes?.some((like) => like.user_id === user.id)
    setPosts((current) => current.map((item) => item.id === post.id
      ? { ...item, likes: liked ? item.likes?.filter((like) => like.user_id !== user.id) : [...(item.likes ?? []), { user_id: user.id }] }
      : item))
    const { error } = liked
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
    if (error) {
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, likes: liked ? [...(item.likes ?? []), { user_id: user.id }] : item.likes?.filter((like) => like.user_id !== user.id) }
        : item))
      setNotice(error.message)
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setNotice(error.message)
    else setNotice('You’re signed out. See you soon!')
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="JaSocial home">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">ja<span>social</span></span>
        </a>
        <label className="searchbox">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, places, good vibes…" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="top-actions">
          <button className="icon-btn notification-btn" aria-label="Notifications" onClick={() => setNotice('You’re all caught up!')}><Bell size={19} /><i /></button>
          {user ? (
            <button className="profile-button" onClick={() => setMenuOpen(!menuOpen)}>
              <span className="avatar avatar-sm avatar-green">{avatarInitial(user.user_metadata.display_name || user.email)}</span>
              <ChevronDown size={15} />
            </button>
          ) : <button className="button button-dark top-signin" onClick={() => setAuthOpen(true)}>Sign in <ArrowRight size={15} /></button>}
          {menuOpen && <div className="profile-menu"><div className="menu-email">{user?.email}</div><button onClick={signOut}><LogOut size={15} /> Sign out</button></div>}
        </div>
      </header>

      <div className="page-grid">
        <aside className={`left-sidebar ${menuOpen ? 'mobile-open' : ''}`}>
          <button className="mobile-menu-close icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
          <div className="nav-section-label">MENU</div>
          <nav className="main-nav">
            {navItems.map(({ label, icon: Icon }) => (
              <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); setMenuOpen(false) }}>
                <Icon size={19} strokeWidth={activeNav === label ? 2.4 : 1.8} /><span>{label}</span>
                {label === 'Communities' && <span className="nav-count">3</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-divider" />
          <div className="nav-section-label">YOUR ISLAND</div>
          <button className="region-link" onClick={() => { setSearch('Kingston'); setActiveNav('Home') }}><span className="region-dot dot-green" /> Kingston <ArrowDown size={13} /></button>
          <button className="region-link" onClick={() => { setSearch('Montego Bay'); setActiveNav('Home') }}><span className="region-dot dot-yellow" /> Montego Bay</button>
          <button className="region-link" onClick={() => { setSearch('Negril'); setActiveNav('Home') }}><span className="region-dot dot-coral" /> Negril</button>
          <button className="region-link" onClick={() => setNotice('More Jamaican communities are coming soon!')}><span className="add-region">+</span> Discover places</button>

          <div className="sidebar-card">
            <span className="mini-sun">☀</span>
            <div className="sidebar-card-title">Good vibes travel.</div>
            <p>Your people, your place, your island.</p>
            <span className="sidebar-card-decoration">🇯🇲</span>
          </div>
          <div className="sidebar-foot">Made with love in Jamaica <span>♥</span><br /><a href="https://github.com/jamaicawebdesign/jasocial">About JaSocial</a><span className="foot-dot"> · </span><button onClick={() => setNotice('Community guidelines are coming soon.')}>Guidelines</button></div>
        </aside>

        <main className="feed-column">
          {activeNav === 'Marketplace' ? (
            <Marketplace user={user} search={search} onNotice={setNotice} onSignIn={() => setAuthOpen(true)} />
          ) : (<>
          <section className="welcome-banner">
            <div className="banner-art" aria-hidden="true"><div className="banner-sun" /><div className="banner-hill hill-back" /><div className="banner-hill hill-front" /><span className="banner-palm">♣</span></div>
            <div className="banner-copy">
              <span className="eyebrow"><span className="live-dot" /> YOUR ISLAND, YOUR PEOPLE</span>
              <h1>Good vibes.<br /><em>Real connections.</em></h1>
              <p>A little piece of home, wherever you are.</p>
            </div>
            <span className="banner-star star-one">✳</span><span className="banner-star star-two">✳</span>
          </section>

          <div className="feed-heading">
            <div><h2>{activeNav === 'Saved' ? 'Saved posts' : activeNav === 'Explore' ? 'Explore Jamaica' : activeNav === 'Communities' ? 'Your communities' : 'Your feed'}</h2><p>The latest from around the island</p></div>
            <button className="sort-button" onClick={() => setActiveFilter(activeFilter === 'For you' ? 'Following' : 'For you')}>{activeFilter} <ChevronDown size={15} /></button>
          </div>

          <form className="composer card" onSubmit={publishPost}>
            <div className="avatar avatar-green composer-avatar">{avatarInitial(user?.user_metadata.display_name || user?.email || 'You')}</div>
            <div className="composer-content">
              <textarea aria-label="Write a post" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What’s happening in your corner of Jamaica?" maxLength={500} rows={2} />
              <div className="composer-bottom">
                <div className="composer-tools"><button type="button" onClick={() => setNotice('Photo sharing is coming soon.')} aria-label="Add a photo"><ImagePlus size={18} /></button><button type="button" onClick={() => setNotice('Location sharing is coming soon.')} aria-label="Add a location"><MapPin size={18} /></button><span>🇯🇲</span></div>
                <div className="composer-submit"><span className={draft.length > 450 ? 'char-limit' : ''}>{draft.length > 0 ? `${draft.length}/500` : ''}</span><button className="button button-green" type="submit" disabled={loading || !draft.trim()}>{loading ? 'Posting…' : 'Share'} <Send size={14} /></button></div>
              </div>
            </div>
          </form>

          <div className="feed-tabs">
            {['For you', 'Following', 'Trending'].map((tab) => <button key={tab} onClick={() => setActiveFilter(tab)} className={activeFilter === tab ? 'selected' : ''}>{tab}{tab === 'Trending' && <Flame size={14} />}</button>)}
          </div>

          <div className="post-list">
            {visiblePosts.map((post, index) => {
              const profile = post.profiles
              const liked = Boolean(user && post.likes?.some((like) => like.user_id === user.id))
              const isDemoLiked = post.demo && Boolean(post.localLiked)
              const count = post.likes?.length ?? 0
              return (
                <article className="post-card card" key={post.id} style={{ animationDelay: `${index * 70}ms` }}>
                  <div className="post-head">
                    <div className={`avatar ${['avatar-coral', 'avatar-lavender', 'avatar-mint'][index % 3]}`}>{avatarInitial(profile?.display_name)}</div>
                    <div className="post-author"><div><strong>{profile?.display_name || 'JaSocial member'}</strong>{post.demo && index === 0 && <span className="verified"><Check size={10} /></span>}</div><span>@{profile?.username || 'member'} <span className="post-time">· {timeAgo(post.created_at)}</span></span></div>
                    <button className="icon-btn post-more" aria-label="More post options" onClick={() => setNotice('More post options are coming soon.')}><MoreHorizontal size={20} /></button>
                  </div>
                  <p className="post-copy">{post.content}</p>
                  {post.image && <img className="post-image" src={post.image} alt="Sunny Caribbean beach in Jamaica" loading="lazy" />}
                  {(post.location || post.topic) && <div className="post-tags">{post.location && <span><MapPin size={13} /> {post.location}</span>}{post.topic && <button onClick={() => setSearch(post.topic ?? '')}>#{post.topic.toLowerCase().replaceAll(' ', '')}</button>}</div>}
                  <div className="post-actions">
                    <button className={`post-action like-action ${liked || isDemoLiked ? 'liked' : ''}`} onClick={() => {
                      if (post.demo) setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: isDemoLiked ? item.likes?.filter((like) => like.user_id !== 'local') : [...(item.likes ?? []), { user_id: 'local' }], localLiked: !isDemoLiked } : item))
                      else toggleLike(post)
                    }}><Heart size={17} fill={liked || isDemoLiked ? 'currentColor' : 'none'} /> <span>{count}</span></button>
                    <button className="post-action" onClick={() => setNotice('Comments are coming soon.')}><MessageCircle size={17} /><span>{post.demo ? Math.max(3, Math.floor(count / 8)) : 0}</span></button>
                    <button className="post-action share-action" onClick={() => {
                      if (navigator.clipboard) navigator.clipboard.writeText(window.location.href).then(() => setNotice('Link copied to clipboard.')).catch(() => setNotice('Could not copy the link.'))
                      else setNotice('Link sharing is not available in this browser.')
                    }}><ArrowRight size={17} /><span>Share</span></button>
                    <button className="post-action save-action" aria-label="Save post" onClick={() => setNotice('Sign in to save posts to your collection.')}><Bookmark size={17} /></button>
                  </div>
                </article>
              )
            })}
            {visiblePosts.length === 0 && <div className="empty-state card"><span>🌴</span><h3>{activeNav === 'Saved' ? 'Your saved posts live here' : 'It’s quiet on this side of the island.'}</h3><p>{activeNav === 'Saved' ? 'Save a post to keep it close.' : 'Try a different search, or be the first to share something.'}</p></div>}
          </div>
          <div className="end-of-feed"><span>✳</span> You’re all caught up <span>✳</span></div>
          </>)}
        </main>

        <aside className="right-sidebar">
          <section className="side-widget weather-widget">
            <div className="widget-title"><span>ISLAND CHECK-IN</span><Sun size={16} /></div>
            <div className="weather-main"><span className="weather-icon">☀</span><div><strong>Good vibes</strong><span>Kingston, JA · 31°</span></div></div>
            <div className="weather-caption">It’s a beautiful day to connect.</div>
          </section>
          <section className="side-widget">
            <div className="widget-heading"><h3>What’s buzzing</h3><button onClick={() => setActiveFilter('Trending')}>See all <ArrowRight size={13} /></button></div>
            <div className="trend-list">{trends.map(({ tag, posts: postCount, icon: Icon }, index) => <button className="trend-item" key={tag} onClick={() => setSearch(tag.replace(' ', ''))}><span className={`trend-icon trend-${index}`}><Icon size={16} /></span><span className="trend-text"><strong>#{tag.replaceAll(' ', '')}</strong><small>{postCount}</small></span><ArrowRight size={14} className="trend-arrow" /></button>)}</div>
          </section>
          <section className="side-widget people-widget">
            <div className="widget-heading"><h3>Good people</h3><button onClick={() => setActiveNav('Explore')}>See all <ArrowRight size={13} /></button></div>
            <div className="people-list">{people.map((person) => <div className="person-item" key={person.handle}><div className={`avatar avatar-${person.color}`}>{person.avatar}</div><div className="person-info"><strong>{person.name}</strong><span>{person.info}</span></div><button className="follow-btn" aria-label={`Follow ${person.name}`} onClick={() => user ? setNotice(`You’re now following ${person.name}.`) : setAuthOpen(true)}><span>+</span></button></div>)}</div>
          </section>
          {!user && <section className="join-card"><div className="join-spark"><Sparkles size={18} /></div><h3>Your island is<br />waiting for you.</h3><p>Meet your people. Share your story. Feel at home.</p><button className="button button-dark join-button" onClick={() => setAuthOpen(true)}>Join the community <ArrowRight size={15} /></button><span className="join-bottom">Free forever. Always 🇯🇲</span></section>}
          <div className="right-foot"><span>© 2025 JaSocial</span><button onClick={() => setNotice('Privacy information is coming soon.')}>Privacy</button><button onClick={() => setNotice('Terms are coming soon.')}>Terms</button></div>
        </aside>
      </div>

      <button className="mobile-nav-toggle" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
      <div className={`toast ${notice ? 'toast-show' : ''}`} role="status"><span>✳</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>
      {authOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false) }}>
        <div className="auth-modal">
          <button className="modal-close icon-btn" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={19} /></button>
          <div className="modal-mark"><span className="brand-mark"><span /></span></div>
          <span className="eyebrow">WELCOME TO YOUR ISLAND</span><h2>Find your people.</h2><p>We’ll send you a magic link. No passwords, no fuss.</p>
          {!isSupabaseConfigured && <div className="setup-notice">Demo mode is on. Connect a Supabase project to create your account and post for real.</div>}
          <form onSubmit={sendMagicLink}><label htmlFor="email">Your email address</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><button className="button button-green auth-submit" disabled={loading}>{loading ? 'Sending…' : 'Send me a sign-in link'} <ArrowRight size={16} /></button></form>
          <div className="auth-footer"><span>🇯🇲</span> A community rooted in Jamaica, open to everyone.</div>
        </div>
      </div>}
    </div>
  )
}
