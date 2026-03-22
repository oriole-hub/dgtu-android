import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { UserOut } from '@/utils/api';
import { geocodeOfficeAddress } from '@/utils/geocode-address';

import { styles } from './styles';

type Props = {
  user: UserOut;
};

function officeCoordsFromApi(office: UserOut['office']): { lat: number; lng: number } | null {
  if (!office) return null;
  const lat = office.latitude;
  const lng = office.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Встраиваемый виджет Яндекс.Карт (тайлы и данные — Яндекс, не Google).
 * @see https://yandex.ru/dev/maps/map-tools/constructor/
 */
function buildYandexMapWidgetUrl(
  office: { lat: number; lng: number } | null,
  user: { latitude: number; longitude: number } | null,
): string | null {
  const ptParts: string[] = [];
  if (office) ptParts.push(`${office.lng},${office.lat},pm2rdm`);
  if (user) ptParts.push(`${user.longitude},${user.latitude},pm2gnm`);
  if (ptParts.length === 0) return null;
  const pt = ptParts.join('~');

  let llLon: number;
  let llLat: number;
  let z: number;
  if (office && user) {
    llLon = (office.lng + user.longitude) / 2;
    llLat = (office.lat + user.latitude) / 2;
    const dLat = Math.abs(office.lat - user.latitude);
    const dLon = Math.abs(office.lng - user.longitude);
    const maxD = Math.max(dLat, dLon);
    if (maxD > 0.8) z = 9;
    else if (maxD > 0.3) z = 10;
    else if (maxD > 0.1) z = 11;
    else if (maxD > 0.04) z = 12;
    else if (maxD > 0.015) z = 13;
    else z = 14;
  } else if (office) {
    llLon = office.lng;
    llLat = office.lat;
    z = 16;
  } else {
    llLon = user!.longitude;
    llLat = user!.latitude;
    z = 16;
  }

  const q = new URLSearchParams();
  q.set('ll', `${llLon},${llLat}`);
  q.set('z', String(z));
  q.set('pt', pt);
  return `https://yandex.ru/map-widget/v1/?${q.toString()}`;
}

export function OfficeUserMap({ user }: Props) {
  const apiOffice = useMemo(() => officeCoordsFromApi(user.office), [user.office]);

  const [geocodedOffice, setGeocodedOffice] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeDone, setGeocodeDone] = useState(false);

  useEffect(() => {
    const o = user.office;
    if (!o) {
      setGeocodedOffice(null);
      setGeocodeDone(true);
      return;
    }
    if (officeCoordsFromApi(o)) {
      setGeocodedOffice(null);
      setGeocodeDone(true);
      return;
    }
    const addr = `${o.city ?? ''} ${o.address ?? ''}`.trim();
    if (!addr) {
      setGeocodedOffice(null);
      setGeocodeDone(true);
      return;
    }
    let cancelled = false;
    setGeocodeDone(false);
    setGeocodedOffice(null);
    void geocodeOfficeAddress(o.city ?? '', o.address ?? '').then((pos) => {
      if (!cancelled) {
        setGeocodedOffice(pos);
        setGeocodeDone(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user.office]);

  const officePoint = apiOffice ?? geocodedOffice;

  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locDone, setLocDone] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled) {
            setUserLoc({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          }
        }
      } finally {
        if (!cancelled) setLocDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapUrl = useMemo(
    () => buildYandexMapWidgetUrl(officePoint, userLoc),
    [officePoint, userLoc],
  );

  useEffect(() => {
    setMapLoaded(false);
  }, [mapUrl]);

  const geocodingOffice = Boolean(user.office) && !apiOffice && !geocodeDone;
  const waitingForFirstFix = !officePoint && !locDone && !geocodingOffice;
  const emptyMap = locDone && geocodeDone && !officePoint && !userLoc;

  if (geocodingOffice) {
    return (
      <View style={styles.mapPanel}>
        <Text style={styles.mapTitle}>Офис и вы</Text>
        <View style={[styles.mapContainer, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color="#101828" size="large" />
        </View>
        <Text style={styles.mapHint}>Ищем офис по адресу из профиля…</Text>
      </View>
    );
  }

  if (waitingForFirstFix) {
    return (
      <View style={styles.mapPanel}>
        <Text style={styles.mapTitle}>Офис и вы</Text>
        <View style={[styles.mapContainer, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color="#101828" size="large" />
        </View>
      </View>
    );
  }

  if (emptyMap || mapUrl == null) {
    return (
      <View style={styles.mapPanel}>
        <Text style={styles.mapTitle}>Офис и вы</Text>
        <View style={[styles.mapContainer, styles.mapWebPlaceholder]}>
          <Text style={styles.mapWebPlaceholderText}>
            {geocodeDone && user.office && !apiOffice && !geocodedOffice
              ? 'Не удалось определить координаты по адресу офиса. Разрешите геолокацию или уточните адрес в профиле.'
              : 'Нет адреса офиса и нет доступа к геолокации — карта недоступна.'}
          </Text>
        </View>
      </View>
    );
  }

  const officeFromAddress = !apiOffice && Boolean(geocodedOffice);

  return (
    <View style={styles.mapPanel}>
      <Text style={styles.mapTitle}>Офис и вы</Text>
      <View style={styles.mapContainer}>
        {!mapLoaded ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              backgroundColor: '#ECEDEF',
            }}>
            <ActivityIndicator color="#101828" size="large" />
          </View>
        ) : null}
        <WebView
          key={mapUrl}
          source={{ uri: mapUrl }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          onLoadEnd={() => setMapLoaded(true)}
          originWhitelist={['https://*', 'http://*']}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          nestedScrollEnabled
        />
      </View>
      {officeFromAddress ? (
        <Text style={styles.mapHint}>Офис на карте по адресу из профиля</Text>
      ) : null}
      {locDone && !userLoc ? (
        <Text style={styles.mapHint}>Местоположение недоступно — проверьте разрешение геолокации</Text>
      ) : null}
    </View>
  );
}
