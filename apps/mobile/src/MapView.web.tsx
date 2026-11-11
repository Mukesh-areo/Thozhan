import { createElement, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { MAP_HTML, type MapMarker } from './map-html';

export function MapView({ markers, height = 220, fill, route }: { markers: MapMarker[]; height?: number; fill?: boolean; route?: boolean }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const json = JSON.stringify({ markers, route: !!route });
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(json, '*');
  }, [json]);
  return (
    <View style={fill ? StyleSheet.absoluteFill : { height, borderRadius: 18, overflow: 'hidden' }}>
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
