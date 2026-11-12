import { useEffect, useState } from 'react';
import { COUNTRY_CENTERS, WORLD_LAND_PATH, projectCountry } from '../data/worldAtlas';
import { COUNTRY_OUTLINES } from '../data/countryOutlines';
import type { CountryInfo, LanguageInfo } from '../types';

/** Decorative identity mark remains floral, but the interactive MAP is clean. */
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

/**
 * Real location-aware zoom: focus the SVG camera on the selected country,
 * with a simplified actual border silhouette where available. Map is fully
 * local and has no decorative flowers or external maps/tiles/API requests.
 */
export function FloralAtlas({ country, language }: { country: CountryInfo; language: LanguageInfo }) {
  const [focused, setFocused] = useState(true);
  useEffect(() => { setFocused(true); }, [country.code]);

  const center = projectCountry(country.code);
  const outline = COUNTRY_OUTLINES[country.code];
  const mapped = Object.prototype.hasOwnProperty.call(COUNTRY_CENTERS, country.code);
  const scale = focused ? (outline?.zoom ?? 3.4) : 1;
  const offsetX = 400 - center.x * scale;
  const offsetY = 175 - center.y * scale;
  const camera = 'translate(' + offsetX.toFixed(2) + 'px, ' + offsetY.toFixed(2) + 'px) scale(' + scale.toFixed(2) + ')';
  const pinX = focused ? 400 : center.x;
  const pinY = focused ? 175 : center.y;
  const pinPosition = 'translate(' + pinX.toFixed(1) + 'px, ' + pinY.toFixed(1) + 'px)';

  return (
    <div className="destination-atlas" aria-label={'Destination world map: ' + country.name + ', ' + language.name}>
      <div className="destination-atlas-heading">
        <span className="destination-atlas-eyebrow"><span className="atlas-orbit-dot"/> DESTINATION MAP</span>
        <span className="atlas-heading-tools">
          <span className="destination-atlas-location">{country.flag} {country.name} <span aria-hidden="true">·</span> {language.name}</span>
          <button type="button" className="atlas-zoom-toggle" aria-pressed={focused} title={focused ? 'Show full world map' : 'Zoom to selected country'} onClick={() => setFocused(v => !v)}>{focused ? 'World view' : 'Zoom in'}</button>
        </span>
      </div>
      <svg className="destination-atlas-svg" viewBox="0 0 800 350" role="img" aria-label={country.name + ' highlighted ' + (focused ? 'in a zoomed region' : 'on the world map')}>
        <defs>
          <linearGradient id="atlasSea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#edf4f1"/>
            <stop offset=".55" stopColor="#f3f5fb"/>
            <stop offset="1" stopColor="#e9f4f5"/>
          </linearGradient>
          <radialGradient id="atlasGlow">
            <stop stopColor="#bba7ee" stopOpacity=".32"/>
            <stop offset="1" stopColor="#bba7ee" stopOpacity="0"/>
          </radialGradient>
          <filter id="atlasPinShadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#4e2d87" floodOpacity=".19"/>
          </filter>
        </defs>
        <rect width="800" height="350" rx="20" fill="url(#atlasSea)"/>
        <g className="atlas-camera" style={{transform:camera}}>
          <g className="atlas-graticule" fill="none" stroke="#aec4bf" strokeWidth=".9" opacity=".30">
            <path d="M0 70H800M0 140H800M0 210H800M0 280H800"/>
            <path d="M100 0V350M200 0V350M300 0V350M400 0V350M500 0V350M600 0V350M700 0V350"/>
          </g>
          <path className="atlas-land" d={WORLD_LAND_PATH} fill="#c2d9d0" stroke="#f8faf8" strokeWidth="1" strokeLinejoin="round"/>
          {outline?.path
            ? <path key={country.code} className="atlas-country-outline" d={outline.path} fill="#9f89c6" fillOpacity=".80" stroke="#5d4aa8" strokeWidth="2.1" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
            : mapped && <circle className="atlas-small-country" cx={center.x} cy={center.y} r="3.2" fill="#6755b2" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
        </g>
        {mapped && <g key={country.code} className="atlas-location-pin" style={{transform:pinPosition}}>
          <circle className="atlas-marker-halo" r="40" fill="url(#atlasGlow)"/>
          <circle className="atlas-marker-pulse" r="17" fill="none" stroke="#8058c8" strokeWidth="2.5" opacity=".75"/>
          <g filter="url(#atlasPinShadow)">
            <path d="M0 -29C-12 -29 -21 -20 -21 -9C-21 5 -6 18 0 27C6 18 21 5 21 -9C21 -20 12 -29 0 -29Z" fill="#5a3fc2" stroke="#fff" strokeWidth="3"/>
            <circle cx="0" cy="-10" r="7.7" fill="#fbe2a5"/>
            <path d="M-3.4 -10H3.4M0 -13.4V-6.6" stroke="#9874bf" strokeWidth="1.2" strokeLinecap="round"/>
          </g>
        </g>}
      </svg>
      <div className="destination-atlas-foot"><span>Country-focused geographic view</span><span className="atlas-foot-side">{outline?.path ? 'Border highlighted' : 'Regional city-state location'}</span></div>
    </div>
  );
}
