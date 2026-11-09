import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { MAP_HTML, type MapMarker } from './map-html';

// react-native-webview's class typings do not match React 19's JSX types yet.
const Web = WebView as unknown as React.ComponentType<Record<string, unknown> & { ref: React.Ref<WebView> }>;

export function MapView({ markers, height = 220 }: { markers: MapMarker[]; height?: number }) {
  const ref = useRef<WebView>(null);
  const json = JSON.stringify({ markers });
  useEffect(() => {
    ref.current?.injectJavaScript(`window.update && window.update(${JSON.stringify(markers)}); true;`);
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ height, borderRadius: 18, overflow: 'hidden' }}>
      <Web
        ref={ref}
        source={{ html: MAP_HTML }}
        originWhitelist={['*']}
        onLoadEnd={() => ref.current?.injectJavaScript(`window.update(${JSON.stringify(markers)}); true;`)}
        scrollEnabled={false}
      />
    </View>
  );
}
