'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, isAdmin } from '@/lib/auth'
import { fetcher, post, patch, del } from '@/lib/api'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { Modal } from '@/components/molecules/Modal'
import { RowActions } from '@/components/molecules/RowActions'
import { Pagination } from '@/components/molecules/Pagination'
import { TabBar } from '@/components/templates/TabBar'
import { PasswordInput } from '@/components/molecules/PasswordInput'

/* ---------- types ---------- */
type Role = { id: string; key: string; name: string; description: string | null; level: number; permissions: string[]; isSystem: boolean; _count?: { users: number } }
type Rank = { id: string; key: string; name: string; description: string | null; order: number; _count?: { users: number } }
type AdminUser = {
  id: string; email: string; name: string; isActive: boolean; lastLoginAt: string | null
  role: { id: string; key: string; name: string; level: number } | null
  rank: { id: string; key: string; name: string; order: number } | null
}

const PAGE_SIZE = 10
const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none transition-colors focus:border-empire-gold/50'
const label = 'mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted'

/**
 * /admin — the IAM console (admin-only). Three tabs: Users · Roles · Ranks.
 * Full CRUD on each, paginated users, permission matrix on roles. Mirrors the
 * Throne's whole-view access; non-admins are bounced home. All writes hit
 * /api/iam/* which the server gates on the `iam:manage` permission.
 */
export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState('users')

  useEffect(() => {
    if (!loading && !isAdmin(user)) router.replace('/')
  }, [loading, user, router])

  if (loading || !isAdmin(user)) return null

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-3 animate-slide-up">
        <span className="medallion grid place-items-center" style={{ width: 44, height: 44 }}>
          <EmpireIcon name="cog" size={20} className="relative z-10 text-empire-gold" />
        </span>
        <div>
          <h1 className="font-empire text-2xl tracking-wide text-empire-text">Identity &amp; Access</h1>
          <p className="text-xs uppercase tracking-widest text-empire-text-muted">Users · Roles · Ranks — Throne control</p>
        </div>
      </header>

      <TabBar
        tabs={[
          { id: 'users', label: 'Users', icon: 'people' },
          { id: 'roles', label: 'Roles', icon: 'shield' },
          { id: 'ranks', label: 'Ranks', icon: 'medal' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'ranks' && <RanksTab />}
    </main>
  )
}

/* ============================ USERS ============================ */
function UsersTab() {
  const [rows, setRows] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [ranks, setRanks] = useState<Rank[]>([])
  const [page, setPage] = useState(0) // 0-based for <Pagination>
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [u, r, k] = await Promise.all([
        fetcher(`/api/iam/users?page=${page + 1}&pageSize=${PAGE_SIZE}`),
        fetcher('/api/iam/roles'),
        fetcher('/api/iam/ranks'),
      ])
      setRows(u.data || []); setTotal(u.total || 0); setTotalPages(u.totalPages || 1)
      setRoles(r || []); setRanks(k || [])
    } catch (e: any) { setErr(e?.message || 'Failed to load users') }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <section className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-empire-text-muted">{total} account{total === 1 ? '' : 's'}</p>
        <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="plus" size={14} />} onClick={() => setEditing('new')}>
          New user
        </LiquidMetalButton>
      </div>
      {err && <ErrBar msg={err} />}

      <GlassPanel className="overflow-hidden p-0">
        <div className="divide-y divide-empire-border/50">
          {rows.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-empire-elevated/30">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-empire-gold/15 font-empire text-sm text-empire-gold">
                {(u.name || u.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-empire-text">{u.name}</p>
                <p className="truncate text-xs text-empire-text-muted">{u.email}</p>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                {u.role && <Tag gold>{u.role.name}</Tag>}
                {u.rank && <Tag>{u.rank.name}</Tag>}
                {!u.isActive && <Tag red>Disabled</Tag>}
              </div>
              <RowActions
                onEdit={() => setEditing(u)}
                onDelete={async () => { await del(`/api/iam/users/${u.id}`); load() }}
                deleteLabel={`user "${u.name}"`}
              />
            </div>
          ))}
          {rows.length === 0 && !err && <p className="px-4 py-10 text-center text-sm text-empire-text-muted">No users yet.</p>}
        </div>
      </GlassPanel>

      <Pagination page={page} pageCount={totalPages} total={total} onPage={setPage} />

      {editing && (
        <UserModal
          user={editing === 'new' ? null : editing}
          roles={roles} ranks={ranks}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </section>
  )
}

function UserModal({ user, roles, ranks, onClose, onSaved }: {
  user: AdminUser | null; roles: Role[]; ranks: Rank[]; onClose: () => void; onSaved: () => void
}) {
  const isNew = !user
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState(user?.role?.id || roles[0]?.id || '')
  const [rankId, setRankId] = useState(user?.rank?.id || '')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null); setBusy(true)
    try {
      if (isNew) {
        await post('/api/iam/users', { name, email, password, roleId, rankId: rankId || null })
      } else {
        const body: any = { name, roleId, rankId: rankId || null, isActive }
        if (password) body.password = password
        await patch(`/api/iam/users/${user!.id}`, body)
      }
      onSaved()
    } catch (e: any) { setErr(e?.message || 'Save failed') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'New user' : `Edit ${user!.name}`} icon={<EmpireIcon name="user" size={18} />}>
      <div className="space-y-3.5">
        <div><label className={label}>Name</label><input className={field} value={name} placeholder="Full name" onChange={e => setName(e.target.value)} /></div>
        <div>
          <label className={label}>Email</label>
          <input className={field} type="email" value={email} disabled={!isNew}
            onChange={e => setEmail(e.target.value)} placeholder="you@cregen.ai" />
          {!isNew && <p className="mt-1 text-[10px] text-empire-text-dim">Email is the login identity and cannot be changed here.</p>}
        </div>
        <div>
          <label className={label}>{isNew ? 'Password' : 'New password (leave blank to keep)'}</label>
          <PasswordInput inputClassName={field} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Role</label>
            <select className={field} value={roleId} onChange={e => setRoleId(e.target.value)}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Rank</label>
            <select className={field} value={rankId} onChange={e => setRankId(e.target.value)}>
              <option value="">— none —</option>
              {ranks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        {!isNew && (
          <label className="flex items-center gap-2 text-sm text-empire-text">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-empire-gold" />
            Account active
          </label>
        )}
        {err && <ErrBar msg={err} />}
        <SaveRow busy={busy} onSave={save} onClose={onClose} />
      </div>
    </Modal>
  )
}

/* ============================ ROLES ============================ */
function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [r, p] = await Promise.all([fetcher('/api/iam/roles'), fetcher('/api/iam/permissions')])
      setRoles(r || []); setPerms(p.permissions || [])
    } catch (e: any) { setErr(e?.message || 'Failed to load roles') }
  }, [])
  useEffect(() => { load() }, [load])

  const pageCount = Math.max(1, Math.ceil(roles.length / PAGE_SIZE))
  const shown = roles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-empire-text-muted">{roles.length} role{roles.length === 1 ? '' : 's'}</p>
        <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="plus" size={14} />} onClick={() => setEditing('new')}>
          New role
        </LiquidMetalButton>
      </div>
      {err && <ErrBar msg={err} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map(r => (
          <GlassPanel key={r.id} className="p-4 transition-transform hover:-translate-y-0.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-empire text-base text-empire-text">{r.name}</h3>
                  {r.isSystem && <Tag>System</Tag>}
                </div>
                <p className="font-data text-[11px] text-empire-text-muted">{r.key} · level {r.level} · {r._count?.users ?? 0} user{(r._count?.users ?? 0) === 1 ? '' : 's'}</p>
              </div>
              <RowActions
                onEdit={() => setEditing(r)}
                onDelete={r.isSystem ? undefined : async () => { await del(`/api/iam/roles/${r.id}`); load() }}
                deleteLabel={`role "${r.name}"`}
              />
            </div>
            {r.description && <p className="mt-2 text-xs text-empire-text-muted">{r.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1">
              {(r.permissions.includes('*') ? ['* full access'] : r.permissions).map(p => (
                <span key={p} className="rounded border border-empire-border px-1.5 py-0.5 font-data text-[10px] text-empire-text-muted">{p}</span>
              ))}
              {r.permissions.length === 0 && <span className="font-data text-[10px] text-empire-text-dim">read-only</span>}
            </div>
          </GlassPanel>
        ))}
      </div>

      <Pagination page={page} pageCount={pageCount} total={roles.length} onPage={setPage} />

      {editing && (
        <RoleModal role={editing === 'new' ? null : editing} allPerms={perms}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </section>
  )
}

function RoleModal({ role, allPerms, onClose, onSaved }: {
  role: Role | null; allPerms: string[]; onClose: () => void; onSaved: () => void
}) {
  const isNew = !role
  const full = role?.permissions?.includes('*') ?? false
  const [key, setKey] = useState(role?.key || '')
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [level, setLevel] = useState(String(role?.level ?? 0))
  const [fullAccess, setFullAccess] = useState(full)
  const [selected, setSelected] = useState<string[]>(full ? [] : (role?.permissions || []))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const locked = role?.isSystem ?? false

  const toggle = (p: string) => setSelected(s => s.includes(p) ? s.filter(x => x !== p) : [...s, p])

  async function save() {
    setErr(null); setBusy(true)
    try {
      const permissions = fullAccess ? ['*'] : selected
      if (isNew) await post('/api/iam/roles', { key, name, description, level: Number(level), permissions })
      else await patch(`/api/iam/roles/${role!.id}`, { name, description, level: Number(level), permissions })
      onSaved()
    } catch (e: any) { setErr(e?.message || 'Save failed') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'New role' : `Edit ${role!.name}`} icon={<EmpireIcon name="shield" size={18} />} width="max-w-xl">
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Key</label>
            <input className={field} value={key} disabled={!isNew} onChange={e => setKey(e.target.value)} placeholder="manager" />
          </div>
          <div><label className={label}>Authority level</label><input className={field} type="number" value={level} placeholder="3" onChange={e => setLevel(e.target.value)} /></div>
        </div>
        <div><label className={label}>Name</label><input className={field} value={name} placeholder="Role name" onChange={e => setName(e.target.value)} /></div>
        <div><label className={label}>Description</label><input className={field} value={description} placeholder="What this role can do" onChange={e => setDescription(e.target.value)} /></div>

        {locked && <p className="rounded-lg border border-empire-border bg-empire-surface/40 px-3 py-2 text-[11px] text-empire-text-muted">System role — key is fixed; you can still tune its permissions.</p>}

        <div>
          <label className="flex items-center gap-2 text-sm text-empire-text">
            <input type="checkbox" checked={fullAccess} onChange={e => setFullAccess(e.target.checked)} className="accent-empire-gold" />
            Full access (<span className="font-data">*</span>) — every permission
          </label>
        </div>

        {!fullAccess && (
          <div>
            <label className={label}>Permissions</label>
            <div className="grid grid-cols-2 gap-1.5">
              {allPerms.map(p => (
                <label key={p} className="flex items-center gap-2 rounded-md border border-empire-border px-2.5 py-1.5 text-xs text-empire-text">
                  <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} className="accent-empire-gold" />
                  <span className="font-data">{p}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {err && <ErrBar msg={err} />}
        <SaveRow busy={busy} onSave={save} onClose={onClose} />
      </div>
    </Modal>
  )
}

/* ============================ RANKS ============================ */
function RanksTab() {
  const [ranks, setRanks] = useState<Rank[]>([])
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Rank | 'new' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try { setRanks((await fetcher('/api/iam/ranks')) || []) }
    catch (e: any) { setErr(e?.message || 'Failed to load ranks') }
  }, [])
  useEffect(() => { load() }, [load])

  const pageCount = Math.max(1, Math.ceil(ranks.length / PAGE_SIZE))
  const shown = ranks.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-empire-text-muted">{ranks.length} rank{ranks.length === 1 ? '' : 's'}</p>
        <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="plus" size={14} />} onClick={() => setEditing('new')}>
          New rank
        </LiquidMetalButton>
      </div>
      {err && <ErrBar msg={err} />}

      <GlassPanel className="overflow-hidden p-0">
        <div className="divide-y divide-empire-border/50">
          {shown.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-empire-elevated/30">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-empire-gold/15">
                <EmpireIcon name="medal" size={16} className="text-empire-gold" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-empire-text">{r.name}</p>
                <p className="font-data text-[11px] text-empire-text-muted">{r.key} · order {r.order} · {r._count?.users ?? 0} holder{(r._count?.users ?? 0) === 1 ? '' : 's'}</p>
              </div>
              <RowActions
                onEdit={() => setEditing(r)}
                onDelete={async () => { await del(`/api/iam/ranks/${r.id}`); load() }}
                deleteLabel={`rank "${r.name}"`}
              />
            </div>
          ))}
          {ranks.length === 0 && !err && <p className="px-4 py-10 text-center text-sm text-empire-text-muted">No ranks yet.</p>}
        </div>
      </GlassPanel>

      <Pagination page={page} pageCount={pageCount} total={ranks.length} onPage={setPage} />

      {editing && (
        <RankModal rank={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </section>
  )
}

function RankModal({ rank, onClose, onSaved }: { rank: Rank | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !rank
  const [key, setKey] = useState(rank?.key || '')
  const [name, setName] = useState(rank?.name || '')
  const [description, setDescription] = useState(rank?.description || '')
  const [order, setOrder] = useState(String(rank?.order ?? 0))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null); setBusy(true)
    try {
      if (isNew) await post('/api/iam/ranks', { key, name, description, order: Number(order) })
      else await patch(`/api/iam/ranks/${rank!.id}`, { name, description, order: Number(order) })
      onSaved()
    } catch (e: any) { setErr(e?.message || 'Save failed') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'New rank' : `Edit ${rank!.name}`} icon={<EmpireIcon name="medal" size={18} />}>
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Key</label><input className={field} value={key} disabled={!isNew} onChange={e => setKey(e.target.value)} placeholder="senior" /></div>
          <div><label className={label}>Seniority order</label><input className={field} type="number" value={order} placeholder="1" onChange={e => setOrder(e.target.value)} /></div>
        </div>
        <div><label className={label}>Name</label><input className={field} value={name} placeholder="Rank name" onChange={e => setName(e.target.value)} /></div>
        <div><label className={label}>Description</label><input className={field} value={description} placeholder="Short description" onChange={e => setDescription(e.target.value)} /></div>
        {err && <ErrBar msg={err} />}
        <SaveRow busy={busy} onSave={save} onClose={onClose} />
      </div>
    </Modal>
  )
}

/* ---------- shared bits ---------- */
function Tag({ children, gold, red }: { children: React.ReactNode; gold?: boolean; red?: boolean }) {
  const cls = gold
    ? 'border-empire-gold/30 bg-empire-gold/10 text-empire-gold'
    : red
      ? 'border-empire-red/40 bg-empire-red/10 text-empire-red-bright'
      : 'border-empire-border text-empire-text-muted'
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${cls}`}>{children}</span>
}
function ErrBar({ msg }: { msg: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-empire-red/40 bg-empire-red/10 px-3 py-2 text-xs text-empire-red-bright">
      <EmpireIcon name="alert" size={14} /> {msg}
    </div>
  )
}
function SaveRow({ busy, onSave, onClose }: { busy: boolean; onSave: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-xs text-empire-text-muted transition-colors hover:text-empire-text">Cancel</button>
      <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="check" size={14} />} onClick={onSave} disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </LiquidMetalButton>
    </div>
  )
}
