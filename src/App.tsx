import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import { Sun, MapPin, Compass, Mountain, Calculator, TrendingUp, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface SolarData {
  yearlyIrradiation: number;
  monthlyData: number[];
  optimalTilt: number;
  optimalAzimuth: number;
  loss: number;
}

function LocationMarker({ position, setPosition }: { 
  position: [number, number] | null; 
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/65 backdrop-blur-[20px] border border-white/40 rounded-xl shadow-glass ${className}`}>
      {children}
    </div>
  );
}

export default function App() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tilt, setTilt] = useState(35);
  const [azimuth, setAzimuth] = useState(180);
  const [shading, setShading] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [solarData, setSolarData] = useState<SolarData | null>(null);

  const handlePositionChange = useCallback((pos: [number, number]) => {
    setPosition(pos);
    setLat(pos[0].toFixed(5));
    setLng(pos[1].toFixed(5));
  }, []);

  const handleLatLngInput = useCallback(() => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      setPosition([latNum, lngNum]);
    }
  }, [lat, lng]);

  const calculateSolar = async () => {
    if (!position) {
      setError('Bitte waehlen Sie einen Standort auf der Karte.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        lat: position[0].toString(),
        lon: position[1].toString(),
        peakpower: '1',
        loss: shading.toString(),
        angle: tilt.toString(),
        aspect: (azimuth - 180).toString(),
        outputformat: 'json',
        pvtechchoice: 'crystSi',
      });

      const apiUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${params}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('PVGIS API Fehler');
      }

      const data = await response.json();
      const monthlyData = data.outputs.monthly.fixed.map((m: { E_m: number }) => m.E_m);
      const yearlyIrradiation = data.outputs.totals.fixed.E_y;

      // Plausibilitaetspruefung
      if (yearlyIrradiation < 800 || yearlyIrradiation > 2500) {
        setError(`Warnung: Berechneter Wert (${yearlyIrradiation.toFixed(0)} kWh/m2/Jahr) liegt ausserhalb des erwarteten Bereichs (800-2500).`);
      }

      // Nordhalbkugel: Sommer > Winter
      const isNorthernHemisphere = position[0] > 0;
      const summerMonth = isNorthernHemisphere ? monthlyData[5] : monthlyData[11];
      const winterMonth = isNorthernHemisphere ? monthlyData[11] : monthlyData[5];
      
      if (summerMonth <= winterMonth) {
        console.warn('Saisonale Verteilung unerwartet');
      }

      setSolarData({
        yearlyIrradiation,
        monthlyData,
        optimalTilt: Math.abs(position[0]),
        optimalAzimuth: position[0] > 0 ? 180 : 0,
        loss: shading,
      });
    } catch (err) {
      setError('Fehler beim Abrufen der Solardaten. Bitte versuchen Sie es erneut.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  return (
    <div className="w-screen h-screen relative font-sans">
      {/* Map Background */}
      <MapContainer
        center={[51.1657, 10.4515]}
        zoom={6}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={handlePositionChange} />
      </MapContainer>

      {/* Glass Sidebar */}
      <div className="absolute top-6 left-6 bottom-6 w-[400px] z-[1000] flex flex-col gap-4 max-md:left-2 max-md:right-2 max-md:top-auto max-md:bottom-2 max-md:w-auto">
        
        {/* Input Panel */}
        <GlassPanel className="p-6 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="w-6 h-6 text-accent-orange" />
            <h1 className="text-xl font-semibold text-gray-800">Solar-Irradiationsrechner</h1>
          </div>

          {/* Coordinates */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Klicken Sie auf die Karte oder geben Sie Koordinaten ein</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Breitengrad</label>
                <input
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  onBlur={handleLatLngInput}
                  placeholder="51.1657"
                  className="w-full px-3 py-2 bg-white/50 border border-white/30 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Laengengrad</label>
                <input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  onBlur={handleLatLngInput}
                  placeholder="10.4515"
                  className="w-full px-3 py-2 bg-white/50 border border-white/30 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Tilt Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-600 flex items-center gap-1">
                  <Mountain className="w-4 h-4" /> Neigungswinkel
                </label>
                <span className="text-sm font-medium text-primary-500">{tilt} Grad</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={tilt}
                onChange={(e) => setTilt(Number(e.target.value))}
                className="w-full h-2 bg-gray-200/50 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            {/* Azimuth Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-600 flex items-center gap-1">
                  <Compass className="w-4 h-4" /> Ausrichtung (Azimut)
                </label>
                <span className="text-sm font-medium text-primary-500">{azimuth} Grad</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={azimuth}
                onChange={(e) => setAzimuth(Number(e.target.value))}
                className="w-full h-2 bg-gray-200/50 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>N</span><span>O</span><span>S</span><span>W</span><span>N</span>
              </div>
            </div>

            {/* Shading */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-600">Verschattungsverlust</label>
                <span className="text-sm font-medium text-primary-500">{shading}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={shading}
                onChange={(e) => setShading(Number(e.target.value))}
                className="w-full h-2 bg-gray-200/50 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateSolar}
              disabled={loading || !position}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <span className="animate-pulse">Berechne...</span>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Berechnen
                </>
              )}
            </button>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50/80 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </GlassPanel>

        {/* Results Panel */}
        {solarData && (
          <GlassPanel className="p-6 flex-1 overflow-auto">
            {/* Main Result */}
            <div className="text-center mb-4">
              <div className="text-sm text-gray-500 mb-1">Jaehrliche Globalstrahlung</div>
              <div className="text-4xl font-bold text-accent-orange">
                {solarData.yearlyIrradiation.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">kWh/m2/Jahr</div>
            </div>

            {/* Monthly Chart */}
            <div className="h-48 mb-4">
              <div className="flex items-end justify-between h-full gap-1">
                {months.map((month, i) => {
                  const value = solarData.monthlyData[i];
                  const maxVal = Math.max(...solarData.monthlyData);
                  const height = (value / maxVal) * 100;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full rounded-t-sm bg-gradient-to-t from-accent-yellow to-accent-orange transition-all"
                        style={{ height: `${height}%` }}
                        title={`${month}: ${value.toFixed(1)} kWh/m2`}
                      />
                      <span className="text-xs text-gray-500 mt-1">{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optimization Suggestion */}
            <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-accent-green font-medium mb-2">
                <TrendingUp className="w-5 h-5" />
                Optimierungsvorschlag
              </div>
              <p className="text-sm text-gray-700">
                Fuer Ihren Standort ({position?.[0].toFixed(2)} Grad N) empfehlen wir:
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>Optimaler Neigungswinkel: <strong>{solarData.optimalTilt.toFixed(0)} Grad</strong></li>
                <li>Optimale Ausrichtung: <strong>{solarData.optimalAzimuth === 180 ? 'Sued (180 Grad)' : 'Nord (0 Grad)'}</strong></li>
                {tilt !== Math.round(solarData.optimalTilt) && (
                  <li className="text-accent-orange">
                    Anpassung des Neigungswinkels koennte den Ertrag um ca. {Math.abs(tilt - solarData.optimalTilt)}% verbessern.
                  </li>
                )}
              </ul>
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
