import { useEffect, useState, useCallback } from 'react'
import {
  IoCubeOutline,
  IoDownloadOutline,
  IoTrashOutline,
  IoFolderOpenOutline,
  IoSyncOutline
} from 'react-icons/io5'
import { ConfigInfo, PackageInfo } from '../types'

interface Props {
  configInfo: ConfigInfo | null
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
}

export default function PackagesView({ configInfo, showToast }: Props) {
  const [packages, setPackages] = useState<PackageInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [installName, setInstallName] = useState('')

  const loadPackages = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.espansoAPI.listPackages()
      if (result.success && result.packages) {
        setPackages(result.packages)
      } else if (result.error) {
        showToast('error', result.error)
      }
    } catch (err) {
      showToast('error', `Pakete konnten nicht geladen werden: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  const installPackage = async () => {
    if (!installName.trim()) {
      showToast('error', 'Gib einen Paketnamen ein')
      return
    }
    const result = await window.espansoAPI.runEspansoCommand(['install', installName.trim()])
    if (result.success) {
      showToast('success', `${installName.trim()} installiert`)
      setInstallName('')
      await loadPackages()
    } else {
      showToast('error', `Installation fehlgeschlagen: ${result.error}`)
    }
  }

  const uninstallPackage = async (name: string) => {
    if (!confirm(`Paket „${name}“ deinstallieren?`)) return
    const result = await window.espansoAPI.runEspansoCommand(['uninstall', name])
    if (result.success) {
      showToast('success', `${name} deinstalliert`)
      await loadPackages()
    } else {
      showToast('error', `Deinstallation fehlgeschlagen: ${result.error}`)
    }
  }

  const openPackageDir = async (pkgPath: string) => {
    await window.espansoAPI.openInExplorer(pkgPath)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-secondary">
          Espanso-Pakete verwalten
        </div>
        <button className="btn" onClick={loadPackages} disabled={loading}>
          <IoSyncOutline size={16} /> {loading ? 'Wird geladen …' : 'Aktualisieren'}
        </button>
      </div>

      {/* Install package */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title">Paket installieren</div>
        </div>
        <div className="form-input-group" style={{ maxWidth: 400 }}>
          <input
            className="form-input"
            placeholder="Paketname (z. B. all-emojis)"
            value={installName}
            onChange={e => setInstallName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') installPackage() }}
          />
          <button className="btn btn-primary" onClick={installPackage}>
            <IoDownloadOutline size={16} /> Installieren
          </button>
        </div>
        <div className="text-xs text-muted mt-2">
          Verfügbare Pakete findest du auf <a href="https://hub.espanso.org" target="_blank" style={{ color: 'var(--accent)' }}>hub.espanso.org</a>
        </div>
      </div>

      {/* Installed packages */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Installierte Pakete ({packages.length})</div>
        </div>

        {packages.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">
              <IoCubeOutline size={24} />
            </div>
            <div className="empty-state-title">Keine Pakete installiert</div>
            <div className="empty-state-desc">
              Installiere Pakete, um Espanso um Emoji-Sets, Symbole und mehr zu erweitern.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Paket</th>
                <th>Version</th>
                <th>Ort</th>
                <th style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr key={pkg.name}>
                  <td>
                    <div className="flex items-center gap-2">
                      <IoCubeOutline size={16} color="var(--accent)" />
                      <div>
                        <div style={{ fontWeight: 500 }}>{pkg.title || pkg.name}</div>
                        {pkg.title && pkg.title !== pkg.name && (
                          <div className="text-xs text-muted font-mono">{pkg.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="font-mono text-sm">{pkg.version || '-'}</div>
                  </td>
                  <td>
                    <code className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{pkg.path}</code>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => openPackageDir(pkg.path)}>
                        <IoFolderOpenOutline size={14} /> Öffnen
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => uninstallPackage(pkg.name)}>
                        <IoTrashOutline size={14} /> Deinstallieren
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}