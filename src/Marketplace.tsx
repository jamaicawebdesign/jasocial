import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { BadgeCheck, MapPin, MessageCircle, PackagePlus, Search, Store, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type Vendor = {
  id: string
  owner_id?: string
  name: string
  description: string
  parish: string
  category: string
  whatsapp: string | null
  verified?: boolean
}

type Product = {
  id: string
  vendor_id: string
  name: string
  description: string
  price_jmd: number
  category: string
  image_url: string | null
  emoji?: string
  vendors?: Vendor | null
}

export const parishes = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann', 'Trelawny',
  'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine',
]
const categories = ['Food & Drink', 'Fashion', 'Art & Craft', 'Beauty', 'Home & Garden', 'Services']
const categoryEmoji: Record<string, string> = {
  'Food & Drink': '🌶️', Fashion: '👗', 'Art & Craft': '🎨', Beauty: '🧴', 'Home & Garden': '🪴', Services: '🛠️',
}

const demoVendors: Vendor[] = [
  { id: 'v1', name: 'Yaad Spice Co.', description: 'Small-batch jerk seasoning, pepper sauce, and pimento from St. Ann farms.', parish: 'St. Ann', category: 'Food & Drink', whatsapp: null, verified: true },
  { id: 'v2', name: 'Irie Threads', description: 'Handmade Caribbean-print clothing, sewn in Kingston.', parish: 'Kingston', category: 'Fashion', whatsapp: null, verified: true },
  { id: 'v3', name: 'Blue Mountain Roasters', description: 'Single-origin Blue Mountain coffee, roasted to order.', parish: 'St. Andrew', category: 'Food & Drink', whatsapp: null, verified: true },
  { id: 'v4', name: 'Wood & Wonder', description: 'Hand-carved wood art and souvenirs by Negril artisans.', parish: 'Westmoreland', category: 'Art & Craft', whatsapp: null },
]
const demoProducts: Product[] = [
  { id: 'p1', vendor_id: 'v1', name: 'Authentic Jerk Seasoning', description: 'Pimento, scotch bonnet, thyme. 250g jar.', price_jmd: 1200, category: 'Food & Drink', image_url: null, emoji: '🌶️' },
  { id: 'p2', vendor_id: 'v2', name: 'Hibiscus Wrap Dress', description: 'Breathable cotton, sizes XS–XL.', price_jmd: 8500, category: 'Fashion', image_url: null, emoji: '👗' },
  { id: 'p3', vendor_id: 'v3', name: 'Blue Mountain Coffee, 1lb', description: 'Medium roast, whole bean.', price_jmd: 6800, category: 'Food & Drink', image_url: null, emoji: '☕' },
  { id: 'p4', vendor_id: 'v4', name: 'Carved Wooden Bird', description: 'Hand-carved, finished with natural oil.', price_jmd: 3500, category: 'Art & Craft', image_url: null, emoji: '🪶' },
  { id: 'p5', vendor_id: 'v1', name: 'Scotch Bonnet Pepper Sauce', description: 'Fiery, fruity, 150ml bottle.', price_jmd: 900, category: 'Food & Drink', image_url: null, emoji: '🔥' },
  { id: 'p6', vendor_id: 'v2', name: 'Roots Print Tote Bag', description: 'Sturdy canvas tote with local print.', price_jmd: 2800, category: 'Fashion', image_url: null, emoji: '👜' },
]

const formatJmd = (value: number) => `J$${value.toLocaleString('en-JM', { maximumFractionDigits: 0 })}`
const digitsOnly = (value: string) => value.replace(/\D/g, '')
const safeImage = (url: string | null) => (url && /^https:\/\//i.test(url) ? url : null)

type Props = {
  user: User | null
  search: string
  onNotice: (message: string) => void
  onSignIn: () => void
}

export default function Marketplace({ user, search, onNotice, onSignIn }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>(demoVendors)
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [category, setCategory] = useState('All')
  const [parish, setParish] = useState('All parishes')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<'vendor' | 'product' | null>(null)
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let active = true
    Promise.all([
      supabase.from('vendors').select('id, owner_id, name, description, parish, category, whatsapp, verified').order('created_at', { ascending: false }),
      supabase.from('products').select('id, vendor_id, name, description, price_jmd, category, image_url, vendors(id, name, parish, description, category, whatsapp, verified)').eq('in_stock', true).order('created_at', { ascending: false }).limit(60),
    ]).then(([vendorResult, productResult]) => {
      if (!active) return
      if (vendorResult.error || productResult.error) {
        onNotice('Could not load the marketplace. Check your Supabase setup.')
        return
      }
      setVendors((vendorResult.data as unknown as Vendor[]) ?? [])
      setProducts((productResult.data as unknown as Product[]) ?? [])
    })
    return () => { active = false }
  }, [reload, onNotice])

  const myVendor = user ? vendors.find((vendor) => vendor.owner_id === user.id) : undefined
  const term = (query || search).trim().toLowerCase()

  const visibleProducts = useMemo(() => products.filter((product) => {
    const vendor = product.vendors ?? vendors.find((item) => item.id === product.vendor_id)
    if (category !== 'All' && product.category !== category) return false
    if (parish !== 'All parishes' && vendor?.parish !== parish) return false
    if (term && !`${product.name} ${product.description} ${vendor?.name ?? ''}`.toLowerCase().includes(term)) return false
    return true
  }), [products, vendors, category, parish, term])

  function startVendor() {
    if (!user) { onSignIn(); return }
    setDialog(myVendor ? 'product' : 'vendor')
  }

  async function createVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) { onNotice('Connect Supabase and sign in to open a shop.'); return }
    const form = new FormData(event.currentTarget)
    const whatsapp = digitsOnly(String(form.get('whatsapp') ?? ''))
    setSaving(true)
    const { error } = await supabase.from('vendors').insert({
      name: String(form.get('name')).trim(),
      description: String(form.get('description')).trim(),
      parish: String(form.get('parish')),
      category: String(form.get('category')),
      whatsapp: whatsapp || null,
    })
    setSaving(false)
    if (error) { onNotice(error.code === '23505' ? 'You already have a shop.' : error.message); return }
    setDialog(null)
    setReload((value) => value + 1)
    onNotice('Your shop is open! Add your first product.')
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !myVendor) return
    const form = new FormData(event.currentTarget)
    const price = Number(form.get('price'))
    const imageUrl = String(form.get('image') ?? '').trim()
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) { onNotice('Image links must start with https://'); return }
    if (!Number.isFinite(price) || price <= 0) { onNotice('Enter a valid price in JMD.'); return }
    setSaving(true)
    const { error } = await supabase.from('products').insert({
      vendor_id: myVendor.id,
      name: String(form.get('name')).trim(),
      description: String(form.get('description')).trim(),
      price_jmd: price,
      category: String(form.get('category')),
      image_url: imageUrl || null,
    })
    setSaving(false)
    if (error) { onNotice(error.message); return }
    setDialog(null)
    setReload((value) => value + 1)
    onNotice('Product listed.')
  }

  function contact(vendor: Vendor | undefined | null, product: Product) {
    const number = vendor?.whatsapp ? digitsOnly(vendor.whatsapp) : ''
    if (!number) { onNotice('Sign in and message this seller from their shop — demo listings have no contact.'); return }
    const text = encodeURIComponent(`Hi ${vendor?.name}, I'm interested in "${product.name}" I saw on JaSocial.`)
    window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <section className="market-hero">
        <div>
          <span className="eyebrow"><Store size={12} /> JASOCIAL MARKETPLACE</span>
          <h1>Buy local.<br /><em>Sell proud.</em></h1>
          <p>Discover Jamaican makers, farmers, and small businesses — and open your own shop for free.</p>
        </div>
        <button className="button button-gold" onClick={startVendor}>
          <PackagePlus size={16} /> {myVendor ? 'Add a product' : 'Become a vendor'}
        </button>
      </section>

      <div className="market-filters">
        <label className="market-search"><Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products and shops" aria-label="Search the marketplace" />
        </label>
        <select value={parish} onChange={(event) => setParish(event.target.value)} aria-label="Filter by parish">
          <option>All parishes</option>
          {parishes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="chip-row">
        {['All', ...categories].map((item) => (
          <button key={item} className={`chip ${category === item ? 'chip-active' : ''}`} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>

      <div className="feed-heading"><div><h2>Featured shops</h2><p>Verified and rising vendors across the island</p></div></div>
      <div className="vendor-row">
        {vendors.slice(0, 8).map((vendor) => (
          <button key={vendor.id} className="vendor-card" onClick={() => setQuery(vendor.name)}>
            <span className="vendor-avatar">{vendor.name.charAt(0)}</span>
            <strong>{vendor.name}{vendor.verified && <BadgeCheck size={14} />}</strong>
            <small><MapPin size={11} /> {vendor.parish}</small>
          </button>
        ))}
      </div>

      <div className="feed-heading"><div><h2>Fresh listings</h2><p>{visibleProducts.length} {visibleProducts.length === 1 ? 'item' : 'items'}</p></div></div>
      <div className="product-grid">
        {visibleProducts.map((product) => {
          const vendor = product.vendors ?? vendors.find((item) => item.id === product.vendor_id)
          const image = safeImage(product.image_url)
          return (
            <article className="product-card card" key={product.id}>
              <div className="product-media">
                {image ? <img src={image} alt={product.name} loading="lazy" /> : <span>{product.emoji ?? categoryEmoji[product.category] ?? '🛍️'}</span>}
                <em>{product.category}</em>
              </div>
              <div className="product-body">
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="product-seller"><Store size={12} /> {vendor?.name ?? 'Local vendor'} · {vendor?.parish ?? 'Jamaica'}</div>
                <div className="product-foot">
                  <strong>{formatJmd(product.price_jmd)}</strong>
                  <button className="button button-green" onClick={() => contact(vendor, product)}><MessageCircle size={14} /> Contact</button>
                </div>
              </div>
            </article>
          )
        })}
        {visibleProducts.length === 0 && <div className="empty-state card market-empty"><span>🛍️</span><h3>Nothing matches yet</h3><p>Try another category or parish.</p></div>}
      </div>

      {dialog && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}>
          <div className="auth-modal market-modal">
            <button className="modal-close icon-btn" onClick={() => setDialog(null)} aria-label="Close"><X size={19} /></button>
            {dialog === 'vendor' ? (
              <form onSubmit={createVendor}>
                <span className="eyebrow">OPEN YOUR SHOP</span><h2>Tell us about your business</h2>
                <label htmlFor="vname">Shop name</label><input id="vname" name="name" required minLength={2} maxLength={60} />
                <label htmlFor="vdesc">What do you sell?</label><textarea id="vdesc" name="description" required maxLength={300} rows={3} />
                <div className="form-two">
                  <div><label htmlFor="vparish">Parish</label><select id="vparish" name="parish">{parishes.map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label htmlFor="vcat">Category</label><select id="vcat" name="category">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
                </div>
                <label htmlFor="vwa">WhatsApp number (optional, with country code)</label><input id="vwa" name="whatsapp" inputMode="tel" placeholder="18765551234" />
                <button className="button button-green auth-submit" disabled={saving}>{saving ? 'Opening…' : 'Open my shop'}</button>
              </form>
            ) : (
              <form onSubmit={createProduct}>
                <span className="eyebrow">{myVendor?.name.toUpperCase()}</span><h2>List a product</h2>
                <label htmlFor="pname">Product name</label><input id="pname" name="name" required minLength={2} maxLength={80} />
                <label htmlFor="pdesc">Description</label><textarea id="pdesc" name="description" required maxLength={300} rows={3} />
                <div className="form-two">
                  <div><label htmlFor="pprice">Price (JMD)</label><input id="pprice" name="price" type="number" min="1" step="1" required /></div>
                  <div><label htmlFor="pcat">Category</label><select id="pcat" name="category" defaultValue={myVendor?.category}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
                </div>
                <label htmlFor="pimg">Image link (optional, https)</label><input id="pimg" name="image" type="url" placeholder="https://" />
                <button className="button button-green auth-submit" disabled={saving}>{saving ? 'Listing…' : 'Publish product'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
