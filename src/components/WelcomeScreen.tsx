import { useEffect, useState } from 'react'
import { IoShieldCheckmarkOutline } from 'react-icons/io5'
import Logo from './Logo'
import { setWelcomeCompleted } from '../utils/prefs'

interface Props {
  onFinished: (message?: { type: 'success' | 'info'; text: string }) => void
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function ExpandDemo({ ready }: { ready: boolean }) {
  const [typed, setTyped] = useState(ready ? ':hallo' : '')
  const [expanded, setExpanded] = useState(ready)

  useEffect(() => {
    if (ready) return
    const target = ':hallo'
    let i = 0
    let expandTimer = 0
    const id = window.setInterval(() => {
      i += 1
      setTyped(target.slice(0, i))
      if (i >= target.length) {
        window.clearInterval(id)
        expandTimer = window.setTimeout(() => setExpanded(true), 380)
      }
    }, 85)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(expandTimer)
    }
  }, [ready])

  return (
    <div className="welcome-demo" aria-hidden="true">
      <div className={`welcome-demo-line ${expanded ? 'is-expanded' : ''}`}>
        <span className="welcome-demo-trigger">
          {typed}
          {!expanded && <span className="welcome-caret" />}
        </span>
        <span className="welcome-demo-arrow">→</span>
        <span className="welcome-demo-replace">{expanded ? 'Hallo zusammen' : ''}</span>
      </div>
    </div>
  )
}

export default function WelcomeScreen({ onFinished }: Props) {
  const reduceMotion = prefersReducedMotion()
  const [backingUp, setBackingUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasConfig, setHasConfig] = useState(true)

  useEffect(() => {
    window.espansoAPI.getBackupInfo().then(info => {
      setHasConfig(info.exists)
    }).catch(() => {})
  }, [])

  const finish = (message?: { type: 'success' | 'info'; text: string }) => {
    setWelcomeCompleted()
    onFinished(message)
  }

  const skip = () => {
    finish({ type: 'info', text: 'Sicherung übersprungen. Du kannst die Ordner „config“ und „match“ später noch kopieren.' })
  }

  const backup = async () => {
    setBackingUp(true)
    setError(null)
    try {
      const result = await window.espansoAPI.backupConfig()
      if (!result.success) {
        setError(result.error || 'Sicherung fehlgeschlagen')
        setBackingUp(false)
        return
      }
      if (result.empty) {
        finish({ type: 'info', text: 'Noch keine „config“- oder „match“-Ordner vorhanden – es gab nichts zu sichern.' })
        return
      }
      const count = result.backedUp?.length || 0
      const skipped = result.skipped?.length || 0
      if (count === 0 && skipped > 0) {
        finish({ type: 'info', text: 'Sicherungsordner existieren bereits. config_backup und match_backup wurden unverändert gelassen.' })
        return
      }
      finish({
        type: 'success',
        text: skipped
          ? `${count} Sicherungsordner gespeichert (${skipped} existierten bereits).`
          : `${count} Sicherungsordner neben deinen Arbeitskopien gespeichert.`
      })
    } catch (err) {
      setError((err as Error).message)
      setBackingUp(false)
    }
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-glow" />
      <div className="welcome-card">
        <div className="welcome-mark">
          <Logo size={40} />
        </div>
        <h1 className="welcome-title">Bevor du loslegst</h1>
        <ExpandDemo ready={reduceMotion} />
        <p className="welcome-copy">
          Espanso GUI empfiehlt, deine aktuelle Konfiguration zu sichern, damit sie geschützt ist.
        </p>
        <p className="welcome-path">
          {hasConfig
            ? 'Benennt die Ordner „config“ und „match“ in „config_backup“ und „match_backup“ um und kopiert sie anschließend als deine Arbeitsordner zurück. Espanso lädt nur „config“ und „match“, daher bleiben verschachtelte Dateien erhalten und die Sicherungen werden ignoriert.'
            : 'Noch keine „config“- oder „match“-Ordner von Espanso gefunden. Die Sicherung wird übersprungen, wenn du fortfährst.'}
        </p>
        {error && <div className="welcome-error">{error}</div>}
        <div className="welcome-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={backup}
            disabled={backingUp}
          >
            <IoShieldCheckmarkOutline size={16} />
            {backingUp ? 'Wird gesichert …' : 'Sichern & fortfahren'}
          </button>
          <button className="btn btn-lg welcome-risk" onClick={skip} disabled={backingUp}>
            Ich riskier’s.
          </button>
        </div>
      </div>
    </div>
  )
}
