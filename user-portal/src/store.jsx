import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  ACCOUNTS,
  SESSION_KEY,
  loadState,
  saveState,
  resetState,
  submitRequest,
  decideRequest,
  setPolicy,
} from './lib/requests.js'

const Ctx = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    return s && s.email && s.role ? s : null
  } catch {
    return null
  }
}

export function StoreProvider({ children }) {
  const [session, setSession] = useState(readSession)
  const [store, setStore] = useState(() => loadState())

  const signIn = useCallback((account) => {
    const s = { email: account.email, name: account.name, role: account.role }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  const submit = useCallback(
    (input) => {
      if (!session) return null
      const next = submitRequest(store, {
        ...input,
        userEmail: session.email,
        userName: session.name,
      })
      saveState(next)
      setStore(next)
      return next.lastId
    },
    [store, session],
  )

  const submitMany = useCallback(
    (inputs) => {
      if (!session || !inputs.length) return []
      let next = store
      const ids = []
      for (const input of inputs) {
        next = submitRequest(next, {
          ...input,
          userEmail: session.email,
          userName: session.name,
        })
        ids.push(next.lastId)
      }
      saveState(next)
      setStore(next)
      return ids
    },
    [store, session],
  )

  const decide = useCallback(
    (requestId, decision) => {
      if (!session || session.role !== 'admin') return
      const next = decideRequest(store, requestId, decision, session.name)
      saveState(next)
      setStore(next)
    },
    [store, session],
  )

  const togglePolicy = useCallback(
    (policyId, enabled) => {
      if (!session || session.role !== 'admin') return
      const next = setPolicy(store, policyId, enabled)
      saveState(next)
      setStore(next)
    },
    [store, session],
  )

  const resetDemo = useCallback(() => {
    const next = resetState()
    setStore(next)
  }, [])

  const value = useMemo(
    () => ({ session, accounts: ACCOUNTS, signIn, signOut, store, submit, submitMany, decide, togglePolicy, resetDemo }),
    [session, store, signIn, signOut, submit, submitMany, decide, togglePolicy, resetDemo],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
