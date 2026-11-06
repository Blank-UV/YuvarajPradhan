import React from 'react'
import { Panel, RouteLink } from './archive-kit.jsx'
import general from './data/sp-guide-general-info.json'
import gacha from './data/sp-guide-gacha.json'
import gear from './data/sp-guide-gear-guide.json'

export const GUIDE_TABS = [
  { id: 'general', label: 'General', guide: general },
  { id: 'gacha', label: 'Gacha', guide: gacha },
  { id: 'gear', label: 'Gear', guide: gear },
  { id: 'team', label: 'Team', guide: null },
]

const SECTION_LINKS = {
  motives: { to: '/silver-palace/archives/motives', label: 'CHECK MOTIVES' },
  implements: { to: '/silver-palace/archives/implements', label: 'CHECK IMPLEMENTS' },
  epiphanies: { to: '/silver-palace/archives/epiphanies', label: 'CHECK EPIPHANIES' },
  catalysts: { to: '/silver-palace/archives/catalysts', label: 'CHECK CATALYSTS' },
  'the-four-gear-types': { to: '/silver-palace/guides/gear', label: 'GEAR GUIDE' },
}

const images = import.meta.glob('../images/sp/guides/*.webp', {
  eager: true,
  import: 'default',
})
const imageUrl = (file) => images[`../images/sp/guides/${file}`]

function Block({ block }) {
  switch (block.type) {
    case 'text':
      return <p className="sp-guide-text">{block.text}</p>
    case 'equation':
      return <p className="sp-guide-equation">{block.text}</p>
    case 'stats':
      return (
        <ul className="sp-guide-stats">
          {block.items.map((item) => (
            <li key={item.label}>
              <b>{item.value}</b>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="sp-guide-table-wrap">
          <table className="sp-guide-table">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, index) => (
                    <td key={index}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'note':
      return (
        <aside className="sp-guide-note">
          <i aria-hidden="true">i</i>
          <div>
            <b>{block.title}</b>
            <p>{block.text}</p>
          </div>
        </aside>
      )
    case 'steps':
      return (
        <ol className="sp-guide-steps">
          {block.items.map((item) => (
            <li key={item.title}>
              <b>{item.title}</b>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      )
    case 'cards':
      return (
        <ul className="sp-guide-cards">
          {block.items.map((item) => (
            <li key={item.name}>
              {item.image && <img src={imageUrl(item.image)} alt="" width="48" height="48" />}
              <span>
                <em>{item.label}</em>
                <b>{item.name}</b>
                <small>{item.text}</small>
              </span>
            </li>
          ))}
        </ul>
      )
    case 'heading':
      return <h3 className="sp-guide-subheading">{block.text}</h3>
    case 'image':
      return (
        <img
          className="sp-guide-image"
          src={imageUrl(block.image)}
          alt={block.alt}
          loading="lazy"
        />
      )
    case 'chips':
      return (
        <ul className="sp-guide-chips">
          {block.items.map((item) => (
            <li key={item.name}>
              {item.image ? (
                <img src={imageUrl(item.image)} alt="" width="40" height="40" />
              ) : (
                <i className="sp-guide-chip-blank" aria-hidden="true">
                  {item.name[0]}
                </i>
              )}
              <span>
                <b>{item.name}</b>
                {item.note && <small>{item.note}</small>}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'video':
      return (
        <div className="sp-guide-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.id}`}
            title={block.title}
            loading="lazy"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    default:
      return null
  }
}

export default function SilverPalaceGuide({ id, navigate }) {
  const guide = GUIDE_TABS.find((tab) => tab.id === id).guide
  const sections = guide.sections

  return (
    <section className="wuwa-section sp-guide" aria-labelledby="sp-guide-title">
      <header className="wuwa-heading">
        <h1 id="sp-guide-title">
          <i aria-hidden="true" /> {guide.title}
        </h1>
        {guide.updated && <span className="wuwa-count">Updated {guide.updated}</span>}
      </header>

      <Panel>
        <div className="sp-guide-intro">
          {guide.intro.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>
      </Panel>

      <nav className="sp-guide-jump" aria-label="Guide sections">
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>

      {sections.map((section) => (
        <article key={section.id} id={section.id} className="sp-guide-section">
          <div className="sp-guide-section-head">
            <h2>{section.title}</h2>
            {SECTION_LINKS[section.id] && (
              <RouteLink
                className="wuwa-btn sp-guide-check"
                to={SECTION_LINKS[section.id].to}
                navigate={navigate}
              >
                {SECTION_LINKS[section.id].label} {'\u2192'}
              </RouteLink>
            )}
          </div>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </article>
      ))}

      <RouteLink className="wuwa-btn" to="/silver-palace/archives/characters" navigate={navigate}>
        Browse characters {'\u2192'}
      </RouteLink>
    </section>
  )
}
