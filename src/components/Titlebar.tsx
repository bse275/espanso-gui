import { useEffect, useState } from 'react'
import { IoRemoveOutline, IoSquareOutline, IoCopyOutline, IoCloseOutline } from 'react-icons/io5'
import Logo from './Logo'

export default function Titlebar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.windowControls.isMaximized().then(setMaximized)
    const unsubscribe = window.windowControls.onMaximizedChange(setMaximized)
    return unsubscribe
  }, [])

  return (
    <div className="titlebar">
      <Logo size={14} className="titlebar-icon" />
      <span className="titlebar-title">Espanso GUI</span>
      <div className="titlebar-spacer" onDoubleClick={() => window.windowControls.maximizeToggle()} />
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.windowControls.minimize()} title="Minimieren">
          <IoRemoveOutline size={16} />
        </button>
        <button className="titlebar-btn" onClick={() => window.windowControls.maximizeToggle()} title={maximized ? 'Wiederherstellen' : 'Maximieren'}>
          {maximized ? <IoCopyOutline size={13} style={{ transform: 'scaleX(-1)' }} /> : <IoSquareOutline size={13} />}
        </button>
        <button className="titlebar-btn titlebar-btn-close" onClick={() => window.windowControls.close()} title="Schließen">
          <IoCloseOutline size={17} />
        </button>
      </div>
    </div>
  )
}
