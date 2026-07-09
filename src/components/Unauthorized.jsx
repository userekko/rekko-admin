import { supabase } from '../supabaseClient'

export default function Unauthorized({ email }) {
  return (
    <div className="centered-page">
      <div className="card">
        <h1 className="login-title">Not authorized</h1>
        <p className="login-subtitle">
          {email ? <>Signed in as <strong>{email}</strong>, but </> : 'You are '}
          this account doesn't have access to the Rekko admin dashboard.
        </p>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  )
}
