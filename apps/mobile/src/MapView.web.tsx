import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { MAP_HTML, type MapMarker } from './map-html';

export function MapView({ markers, height = 220 }: { markers: MapMarker[]; height?: number }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const json = JSON.stringify({ markers });
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(json, '*');
  }, [json]);
  return (
    <View style={{ height, borderRadius: 18, overflow: 'hidden' }}>
      {createElement('iframe', {
        ref: frame,
        srcDoc: MAP_HTML,
        title: 'map',
        style: { border: 0, width: '100%', height: '100%' },
        onLoad: () => frame.current?.contentWindow?.postMessage(json, '*'),
      })}
    </View>
  );
}
