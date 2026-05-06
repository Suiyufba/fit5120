// @ts-nocheck
export const MAP_VISUAL_STYLES = {
  voyager: {
    label: 'Voyager',
    shortLabel: 'Clean',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  },
  light: {
    label: 'Positron',
    shortLabel: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  },
  terrain: {
    label: 'Outdoors',
    shortLabel: 'Trail',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; OpenTopoMap',
    maxZoom: 17,
  },
}

export const DEFAULT_MAP_VISUAL_STYLE = 'voyager'

export function createLeafletBaseLayer(L, styleId = DEFAULT_MAP_VISUAL_STYLE) {
  const style = MAP_VISUAL_STYLES[styleId] || MAP_VISUAL_STYLES[DEFAULT_MAP_VISUAL_STYLE]

  return L.tileLayer(style.url, {
    maxZoom: style.maxZoom,
    attribution: style.attribution,
  })
}
