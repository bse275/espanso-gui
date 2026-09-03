import { useEffect, useState } from 'react'
import {
  IoTextOutline,
  IoDocumentTextOutline,
  IoCubeOutline,
  IoFolderOpenOutline,
  IoAlertCircleOutline,
  IoAddOutline,
  IoPlay,
  IoStop,
  IoSyncOutline,
  IoBookOutline,
  IoFlashOutline,
  IoListOutline,
  IoOpenOutline,
  IoBulbOutline,
  IoRefreshOutline
} from 'react-icons/io5'
import { ConfigInfo, EspansoStatus } from '../types'
import { extractMatches, extractGlobalVars } from '../utils/yaml'

interface Props {
  configInfo: ConfigInfo | null
  espansoStatus: EspansoStatus
  espansoRunning: boolean
  onNavigate: (view: 'dashboard' | 'snippets' | 'config' | 'packages' | 'terminal') => void
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
  onStartEspanso: () => void
  onStopEspanso: () => void
  onRestartEspanso: () => void
  onAddSnippet: () => void
}

const TIP_KEY = 'espanso-gui:dashboard-tip-index'

// One rotating index advanced on every dashboard visit, so each load shows
// a different tip.
function nextTipIndex() {
  const stored = parseInt(localStorage.getItem(TIP_KEY) || '0', 10)
  const next = ((Number.isFinite(stored) ? stored : 0) + 1) % TIPS.length
  try {
    localStorage.setItem(TIP_KEY, String(next))
  } catch { /* ignore */ }
  return next
}

const TIPS = [
  'Tippe „:date", um das aktuelle Datum einzufügen – das Format legst du im Tab „Erweiterungen" fest.',
  'Erstelle ein Formular für Vorlagen: Espanso fragt die fehlenden Teile ab, bevor es einfügt.',
  'Installiere Pakete wie „all-emojis" oder „math" im Tab „Pakete" – für Symbole und Berechnungen auf Knopfdruck.',
  'Lieber „;hallo" statt „:hallo"? Ändere das Trigger-Zeichen in der Konfiguration – es gilt für alle Snippets.',
  'Halte zusammengehörige Snippets in eigenen Match-Dateien (z. B. arbeit.yml, privat.yml) – das erleichtert das Organisieren.',
  'Nutze eine Shell-Erweiterung, um Live-Ausgaben einzufügen, etwa deinen aktuellen Git-Branch oder deine IP-Adresse.',
  'Eine Auswahl-Erweiterung zeigt beim Einfügen eine Auswahlliste – ideal für Signatur-Varianten oder Standardantworten.',
  'Eine Zufalls-Erweiterung wählt automatisch aus deiner Liste – praktisch für wechselnde Antworten oder Beispiele.',
  'Die Zwischenablage-Erweiterung fügt ein, was du zuletzt kopiert hast, ohne deinen Arbeitsfluss zu unterbrechen.',
  'Verweise mit {{name}} in jedem Ersetzungstext – definiere die Variable einmal unter „Erweiterungen" und nutze sie überall.',
  'Nach größeren Änderungen an der Konfiguration: „Neu starten" in der Übersicht, damit Espanso alles übernimmt.',
  'Nutze Zeilenumbrüche im Ersetzungstext für mehrzeilige Signaturen oder Code-Blöcke.',
  'Das Trigger-Zeichen lässt sich von „:" auf etwas anderes ändern – wähle das, was du am schnellsten tippst.',
  'Bei kombinierten Triggern greift der längere Ausdruck vor dem kürzeren – setze spezifische Trigger nach vorn.',
  'Formularfelder werden nach dem Absenden zu {{form.feldname}} – nutze sie im selben Ersetzungstext weiter.'
]

const DOC_LINKS = [
  { title: 'Dokumentation', desc: 'Das komplette Espanso-Handbuch', url: 'https://espanso.org/docs/', icon: <IoBookOutline size={15} /> },
  { title: 'Matches', desc: 'Trigger und Ersetzungen', url: 'https://espanso.org/docs/matches/basics/', icon: <IoTextOutline size={15} /> },
  { title: 'Erweiterungen', desc: 'Datum, Shell, Auswahl und mehr', url: 'https://espanso.org/docs/matches/extensions/', icon: <IoFlashOutline size={15} /> },
  { title: 'Formulare', desc: 'Vorlagen zum Ausfüllen', url: 'https://espanso.org/docs/matches/forms/', icon: <IoListOutline size={15} /> }
]

// Survive Dashboard unmount (App only renders the active view) so clicking
// back doesn't flash the initial 0 while files are re-read.
let cachedStats: {
  matchFileCount: number
  totalMatches: number
  varCount: number
  packageCount: number
} | null = null

export default function DashboardView({ configInfo, espansoStatus, espansoRunning, onNavigate, showToast, onStartEspanso, onStopEspanso, onRestartEspanso, onAddSnippet }: Props) {
  const [matchFileCount, setMatchFileCount] = useState<number | null>(cachedStats?.matchFileCount ?? null)
  const [totalMatches, setTotalMatches] = useState<number | null>(cachedStats?.totalMatches ?? null)
  const [varCount, setVarCount] = useState<number | null>(cachedStats?.varCount ?? null)
  const [packageCount, setPackageCount] = useState<number | null>(cachedStats?.packageCount ?? null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [files, pkgs] = await Promise.all([
          window.espansoAPI.listMatchFiles(),
          window.espansoAPI.listPackages()
        ])

        const next = {
          matchFileCount: cachedStats?.matchFileCount ?? 0,
          totalMatches: cachedStats?.totalMatches ?? 0,
          varCount: cachedStats?.varCount ?? 0,
          packageCount: cachedStats?.packageCount ?? 0
        }

        if (files.success && files.files) {
          next.matchFileCount = files.files.length
          const contents = await Promise.all(
            files.files.map(file => window.espansoAPI.readMatchFile(file.name))
          )
          next.totalMatches = contents.reduce((total, content) => {
            if (!content.success || !content.content) return total
            return total + extractMatches(content.content).length
          }, 0)
          next.varCount = contents.reduce((total, content) => {
            if (!content.success || !content.content) return total
            return total + Object.keys(extractGlobalVars(content.content)).length
          }, 0)
        }

        if (pkgs.success && pkgs.packages) {
          next.packageCount = pkgs.packages.length
        }

        cachedStats = next
        setMatchFileCount(next.matchFileCount)
        setTotalMatches(next.totalMatches)
        setVarCount(next.varCount)
        setPackageCount(next.packageCount)
      } catch (err) {
        showToast('error', `Statistik konnte nicht geladen werden: ${(err as Error).message}`)
      }
    }
    loadStats()
  }, [showToast])

  const openConfigDir = async () => {
    if (configInfo) {
      await window.espansoAPI.openInExplorer(configInfo.configDir)
    }
  }

  const openDoc = async (url: string) => {
    const result = await window.espansoAPI.openExternal(url)
    if (!result.success) showToast('error', result.error || 'Link konnte nicht geöffnet werden')
  }

  const [tipIndex, setTipIndex] = useState(nextTipIndex)
  const advanceTip = () => setTipIndex(nextTipIndex())

  return (
    <div>
      {!espansoStatus.installed && (
        <div className="card mb-6" style={{ borderColor: 'rgba(251, 191, 36, 0.3)', background: 'rgba(251, 191, 36, 0.05)' }}>
          <div className="flex items-center gap-3">
            <IoAlertCircleOutline size={24} color="var(--warning)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Espanso ist nicht installiert</div>
              <div className="text-sm text-secondary">
                Installiere Espanso von <a href="https://espanso.org" target="_blank" style={{ color: 'var(--accent)' }}>espanso.org</a>, um diese GUI zu nutzen.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top row - add-snippet shortcut on the left, espanso status on the right */}
      <div className="dashboard-top-grid">
        <button className="card add-snippet-card" onClick={onAddSnippet}>
          <span className="add-snippet-icon"><IoAddOutline size={22} /></span>
          <span>
            <span className="quick-action-title">Snippet hinzufügen</span>
            <span className="quick-action-desc">Einen neuen Textbaustein anlegen</span>
          </span>
        </button>

        {espansoStatus.installed && (
          <div className="card">
            <div className="flex items-center justify-between" style={{ gap: 16, flexWrap: 'wrap' }}>
              <div className="flex items-center gap-3">
                <span
                  className={`status-dot ${espansoRunning ? 'running' : 'stopped'}`}
                  style={{ width: 10, height: 10 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    Espanso {espansoRunning ? 'läuft' : 'angehalten'}
                  </div>
                  {espansoStatus.version && (
                    <div className="text-sm text-secondary">v{espansoStatus.version}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!espansoRunning ? (
                  <button className="btn btn-primary" onClick={onStartEspanso}>
                    <IoPlay size={14} /> Starten
                  </button>
                ) : (
                  <button className="btn" onClick={onStopEspanso}>
                    <IoStop size={14} /> Stoppen
                  </button>
                )}
                <button className="btn" onClick={onRestartEspanso}>
                  <IoSyncOutline size={14} /> Neu starten
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalMatches ?? '—'}</div>
          <div className="stat-label">Snippets gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{matchFileCount ?? '—'}</div>
          <div className="stat-label">Match-Dateien</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{varCount ?? '—'}</div>
          <div className="stat-label">Erweiterungen & Formulare</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{packageCount ?? '—'}</div>
          <div className="stat-label">Pakete</div>
        </div>
      </div>

      {/* Two-column layout - quick actions on the left, config on the right */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Schnellaktionen</div>
          </div>
          <div className="quick-actions-grid">
            <button className="quick-action-tile" onClick={() => onNavigate('snippets')}>
              <IoTextOutline size={18} className="quick-action-icon" />
              <div>
                <div className="quick-action-title">Snippets verwalten</div>
                <div className="quick-action-desc">Textbausteine anlegen, bearbeiten und organisieren</div>
              </div>
            </button>
            <button className="quick-action-tile" onClick={() => onNavigate('config')}>
              <IoDocumentTextOutline size={18} className="quick-action-icon" />
              <div>
                <div className="quick-action-title">Konfiguration bearbeiten</div>
                <div className="quick-action-desc">Die zentrale Espanso-Konfigurationsdatei anpassen</div>
              </div>
            </button>
            <button className="quick-action-tile" onClick={() => onNavigate('packages')}>
              <IoCubeOutline size={18} className="quick-action-icon" />
              <div>
                <div className="quick-action-title">Pakete durchsuchen</div>
                <div className="quick-action-desc">Installierte Espanso-Pakete ansehen</div>
              </div>
            </button>
            <button className="quick-action-tile" onClick={openConfigDir}>
              <IoFolderOpenOutline size={18} className="quick-action-icon" />
              <div>
                <div className="quick-action-title">Konfigurationsordner öffnen</div>
                <div className="quick-action-desc">Das Espanso-Konfigurationsverzeichnis im Dateimanager anzeigen</div>
              </div>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Konfiguration</div>
            <button className="btn btn-sm" onClick={openConfigDir}>
              <IoFolderOpenOutline size={14} /> Ordner öffnen
            </button>
          </div>
          {configInfo ? (
            <div className="flex flex-col gap-2">
              <div className="config-path-row">
                <span className="text-sm text-muted">Konfig-Verzeichnis:</span>
                <code className="config-path font-mono text-sm" style={{ color: 'var(--accent)' }}>{configInfo.configDir}</code>
              </div>
              <div className="config-path-row">
                <span className="text-sm text-muted">Hauptkonfiguration:</span>
                <code className="config-path font-mono text-sm" style={{ color: 'var(--accent)' }}>{configInfo.configPath}</code>
              </div>
              <div className="config-path-row">
                <span className="text-sm text-muted">Match-Verzeichnis:</span>
                <code className="config-path font-mono text-sm" style={{ color: 'var(--accent)' }}>{configInfo.matchDir}</code>
              </div>
              <div className="config-path-row">
                <span className="text-sm text-muted">Pakete:</span>
                <code className="config-path font-mono text-sm" style={{ color: 'var(--accent)' }}>{configInfo.packagesDir}</code>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted">Konfigurationsdaten werden geladen …</div>
          )}
        </div>
      </div>

      {/* Docs + rotating tip - one more two-column row at the bottom */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Espanso lernen</div>
          </div>
          <div className="docs-grid">
            {DOC_LINKS.map(doc => (
              <button key={doc.title} className="doc-card" onClick={() => openDoc(doc.url)}>
                <span className="doc-card-icon">{doc.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="doc-card-title">{doc.title}</span>
                  <span className="doc-card-desc">{doc.desc}</span>
                </span>
                <IoOpenOutline size={14} className="doc-card-open" />
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tipp</div>
            <button className="btn btn-sm" onClick={advanceTip} title="Anderen Tipp anzeigen">
              <IoRefreshOutline size={12} /> Nächster Tipp
            </button>
          </div>
          <div className="flex items-start gap-3">
            <span className="tip-icon"><IoBulbOutline size={18} /></span>
            <div className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.55 }}>
              {TIPS[tipIndex]}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
