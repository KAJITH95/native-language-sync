import { COUNTRY_CENTERS, WORLD_LAND_PATH, projectCountry } from '../data/worldAtlas';
import type { CountryInfo, LanguageInfo } from '../types';

/** Lightweight vector identity; petals orbit a globe without external artwork or requests. */
export function FloralGlobeMark() {
  return (
    <svg className="floral-globe-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <circle cx="23" cy="26" r="15.5" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="23" cy="26" rx="7" ry="15.5" stroke="currentColor" strokeWidth="1.45"/>
      <path d="M8 26h30M11 18h24M11 34h24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <g transform="translate(35 11)" fill="#f7d99d" stroke="#ffffff" strokeWidth=".85">
        <ellipse cx="0" cy="-5" rx="3.4" ry="5"/>
        <ellipse cx="0" cy="-5" rx="3.4" ry="5" transform="rotate(72)"/>
        <ellipse cx="0" cy="-5" rx="3.4" ry="5" transform="rotate(144)"/>
        <ellipse cx="0" cy="-5" rx="3.4" ry="5" transform="rotate(216)"/>
        <ellipse cx="0" cy="-5" rx="3.4" ry="5" transform="rotate(288)"/>
        <circle r="2.3" fill="#aa7294" stroke="none"/>
      </g>
      <circle cx="9" cy="37" r="2.5" fill="#bce9d2"/>
    </svg>
  );
}

/** The selected COUNTRY controls the geographic pin; its selected language is shown in the label. */
export function FloralAtlas({ country, language }: { country: CountryInfo; language: LanguageInfo }) {
  const { x, y } = projectCountry(country.code);
  const mapped = Object.prototype.hasOwnProperty.call(COUNTRY_CENTERS, country.code);
  return (
    <div className="destination-atlas" aria-label={`Destination world map: ${country.name}, ${language.name}`}>
      <div className="destination-atlas-heading">
        <span className="destination-atlas-eyebrow"><span className="atlas-orbit-dot"/> GLOBAL DESTINATION</span>
        <span className="destination-atlas-location">{country.flag} {country.name} <span aria-hidden="true">·</span> {language.name}</span>
      </div>
      <svg className="destination-atlas-svg" viewBox="0 0 800 350" role="img" aria-label={`${country.name} is pinned on the world map`}>
        <defs>
          <linearGradient id="atlasSea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#edf4ee"/>
            <stop offset=".55" stopColor="#f5f1fa"/>
            <stop offset="1" stopColor="#e7f4f2"/>
          </linearGradient>
          <radialGradient id="atlasGlow">
            <stop stopColor="#bba7ee" stopOpacity=".34"/>
            <stop offset="1" stopColor="#bba7ee" stopOpacity="0"/>
          </radialGradient>
          <filter id="atlasPinShadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#4e2d87" floodOpacity=".22"/>
          </filter>
        </defs>
        <rect width="800" height="350" rx="20" fill="url(#atlasSea)"/>
        <g className="atlas-graticule" fill="none" stroke="#b5c7c4" strokeWidth=".9" opacity=".38">
          <path d="M0 70H800M0 140H800M0 210H800M0 280H800"/>
          <path d="M100 0V350M200 0V350M300 0V350M400 0V350M500 0V350M600 0V350M700 0V350"/>
        </g>
        <path className="atlas-land" d={WORLD_LAND_PATH} fill="#b8d7c6" stroke="#f9fbf8" strokeWidth="1.1" strokeLinejoin="round"/>
        <g className="atlas-flower" transform="translate(565 72)" opacity=".66" fill="none" stroke="#bd91bb" strokeWidth="2.4">
          <ellipse rx="5" ry="11" transform="translate(0 -10)"/><ellipse rx="5" ry="11" transform="rotate(72) translate(0 -10)"/>
          <ellipse rx="5" ry="11" transform="rotate(144) translate(0 -10)"/><ellipse rx="5" ry="11" transform="rotate(216) translate(0 -10)"/>
          <ellipse rx="5" ry="11" transform="rotate(288) translate(0 -10)"/><circle r="4" fill="#ebc69e" stroke="none"/>
        </g>
        <g className="atlas-flower" transform="translate(148 273)" opacity=".55" fill="none" stroke="#d7ad85" strokeWidth="2">
          <ellipse rx="4" ry="9" transform="translate(0 -8)"/><ellipse rx="4" ry="9" transform="rotate(72) translate(0 -8)"/>
          <ellipse rx="4" ry="9" transform="rotate(144) translate(0 -8)"/><ellipse rx="4" ry="9" transform="rotate(216) translate(0 -8)"/>
          <ellipse rx="4" ry="9" transform="rotate(288) translate(0 -8)"/><circle r="3.5" fill="#d4af76" stroke="none"/>
        </g>
        {mapped && <g key={country.code} className="atlas-location-pin" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
          <circle className="atlas-marker-halo" r="42" fill="url(#atlasGlow)"/>
          <circle className="atlas-marker-pulse" r="17" fill="none" stroke="#8058c8" strokeWidth="2.5" opacity=".75"/>
          <g filter="url(#atlasPinShadow)">
            <path d="M0 -29C-12 -29 -21 -20 -21 -9C-21 5 -6 18 0 27C6 18 21 5 21 -9C21 -20 12 -29 0 -29Z" fill="#5a3fc2" stroke="#fff" strokeWidth="3"/>
            <circle cx="0" cy="-10" r="7.7" fill="#fbe2a5"/>
            <path d="M-3.4 -10H3.4M0 -13.4V-6.6" stroke="#9874bf" strokeWidth="1.2" strokeLinecap="round"/>
          </g>
        </g>}
      </svg>
      <div className="destination-atlas-foot"><span className="atlas-foot-flower" aria-hidden="true">✿</span> Blooming across borders <span className="atlas-foot-side">Destination pinned</span></div>
    </div>
  );
}
