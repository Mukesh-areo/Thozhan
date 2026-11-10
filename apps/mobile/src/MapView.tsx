import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { MAP_HTML, type MapMarker } from './map-html';

// react-native-webview's class typings do not match React 19's JSX types yet.
const Web = WebView as unknown as React.ComponentType<Record<string, unknown> & { ref: React.Ref<WebView> }>;

export function MapView({ markers, height = 220, fill, route }: { markers: MapMarker[]; height?: number; fill?: boolean; route?: boolean }) {
  const ref = useRef<WebView>(null);
  const script = `window.update(${JSON.stringify(markers)}, ${!!route}); true;`;
  useEffect(() => {
    ref.current?.injectJavaScript(`window.update && ${script}`);
  }, [script]);
  return (
    <View style={fill ? StyleSheet.absoluteFill : { height, borderRadius: 18, overflow: 'hidden' }}>
      <Web ref={ref} source={{ html: MAP_HTML }} originWhitelist={['*']} onLoadEnd={() => ref.current?.injectJavaScript(script)} scrollEnabled={false} />
    </View>
  );
}
