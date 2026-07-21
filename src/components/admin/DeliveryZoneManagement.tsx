import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus, Pencil, Trash2, Power, MapPin, Undo2, Check, XCircle,
  CircleDollarSign, ExternalLink, Map as MapIcon, Crosshair, Hexagon,
} from 'lucide-react';
import { useDeliveryZones, DeliveryZoneInput } from '../../hooks/useDeliveryZones';
import { DeliveryZone, LatLng } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import { Card, PageHeader, Button, IconButton, Badge, EmptyState, Spinner, Field, Input, Switch, Modal } from './ui/Kit';

// Aitit, Tyre (Sour) District, South Lebanon — default map center.
const DEFAULT_CENTER: LatLng = { lat: 33.2765, lng: 35.2065 };
const DEFAULT_ZOOM = 14;

const ZONE_COLOR = '#a86b35';
const INACTIVE_COLOR = '#9ca3af';

function vertexIcon(draggable: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${ZONE_COLOR};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:${draggable ? 'grab' : 'default'}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Equirectangular-projected shoelace — good enough at city scale (same
// approximation philosophy as the server's haversine_m helper).
function polygonAreaM2(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const meanLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const cosLat = Math.cos(rad(meanLat));
  const xy = points.map((p) => ({ x: rad(p.lng) * R * cosLat, y: rad(p.lat) * R }));
  let area = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    area += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return Math.abs(area / 2);
}

function centroid(points: LatLng[]): LatLng {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

const fmtRadius = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km` : `${m} m`);
const fmtArea = (m2: number) => (m2 >= 1_000_000 ? `${(m2 / 1_000_000).toFixed(2)} km²` : `${Math.round(m2).toLocaleString()} m²`);

type Mode = 'idle' | 'drawing' | 'editing';

const emptyMeta = { name: '', fee: '0', is_active: true, sort_order: '0' };
const emptyCircle = { name: '', center_lat: '', center_lng: '', radius_m: '2000', fee: '0', is_active: true, sort_order: '0' };

export function DeliveryZoneManagement() {
  const { zones, loading, createZone, updateZone, deleteZone } = useDeliveryZones();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const zoneLayerGroup = useRef<L.LayerGroup | null>(null);
  const draftLayerGroup = useRef<L.LayerGroup | null>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [draftPoints, setDraftPoints] = useState<LatLng[]>([]);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [meta, setMeta] = useState(emptyMeta);
  const [saving, setSaving] = useState(false);

  const [circleModalOpen, setCircleModalOpen] = useState(false);
  const [circleForm, setCircleForm] = useState(emptyCircle);
  const [circleEditing, setCircleEditing] = useState<DeliveryZone | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);

  // ── map init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: true }).setView(
      [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      DEFAULT_ZOOM
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    zoneLayerGroup.current = L.layerGroup().addTo(map);
    draftLayerGroup.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── map click adds a draft vertex while drawing ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      if (mode !== 'drawing') return;
      setDraftPoints((pts) => [...pts, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    };
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [mode]);

  // ── render saved zones (dimmed while drawing/editing so the draft stands out) ──
  useEffect(() => {
    const group = zoneLayerGroup.current;
    if (!group) return;
    group.clearLayers();
    zones.forEach((zone) => {
      if (mode !== 'idle' && zone.id === editingZoneId) return;
      const dim = !zone.is_active || mode !== 'idle';
      const color = zone.is_active ? ZONE_COLOR : INACTIVE_COLOR;
      const opts = { color, weight: 2, fillOpacity: dim ? 0.06 : 0.16, opacity: dim ? 0.35 : 0.9 };
      const layer = zone.polygon && zone.polygon.length >= 3
        ? L.polygon(zone.polygon.map((p) => [p.lat, p.lng] as [number, number]), opts)
        : L.circle([zone.center_lat, zone.center_lng], { ...opts, radius: zone.radius_m || 0 });
      layer.bindTooltip(`${zone.name} — $${Number(zone.fee).toFixed(2)}`, { sticky: true });
      group.addLayer(layer);
    });
  }, [zones, mode, editingZoneId]);

  // ── render draft polygon + draggable vertices ───────────────────────────
  useEffect(() => {
    const group = draftLayerGroup.current;
    if (!group) return;
    group.clearLayers();
    if (mode === 'idle' || draftPoints.length === 0) return;

    const latlngs = draftPoints.map((p) => [p.lat, p.lng] as [number, number]);
    if (draftPoints.length >= 3) {
      L.polygon(latlngs, { color: ZONE_COLOR, weight: 2, fillOpacity: 0.22, dashArray: mode === 'drawing' ? '6 4' : undefined }).addTo(group);
    } else if (draftPoints.length === 2) {
      L.polyline(latlngs, { color: ZONE_COLOR, weight: 2, dashArray: '6 4' }).addTo(group);
    }

    draftPoints.forEach((pt, i) => {
      const draggable = mode === 'editing';
      const marker = L.marker([pt.lat, pt.lng], { icon: vertexIcon(draggable), draggable }).addTo(group);
      if (draggable) {
        marker.on('drag', (e) => {
          const ll = (e.target as L.Marker).getLatLng();
          setDraftPoints((pts) => pts.map((p, idx) => (idx === i ? { lat: ll.lat, lng: ll.lng } : p)));
        });
      }
    });
  }, [draftPoints, mode]);

  const startDrawing = () => {
    setMode('drawing');
    setDraftPoints([]);
    setEditingZoneId(null);
    setMeta(emptyMeta);
  };

  const undoPoint = () => setDraftPoints((pts) => pts.slice(0, -1));

  const finishDrawing = () => {
    if (draftPoints.length < 3) return toastError('Place at least 3 points to close a shape');
    setMode('editing');
  };

  const cancelDraft = () => {
    setMode('idle');
    setDraftPoints([]);
    setEditingZoneId(null);
    setMeta(emptyMeta);
  };

  const startEditPolygon = (zone: DeliveryZone) => {
    if (!zone.polygon || zone.polygon.length < 3) return;
    setEditingZoneId(zone.id);
    setDraftPoints(zone.polygon);
    setMeta({
      name: zone.name,
      fee: String(zone.fee),
      is_active: zone.is_active,
      sort_order: String(zone.sort_order),
    });
    setMode('editing');
    mapRef.current?.flyTo([zone.center_lat, zone.center_lng], 15);
  };

  const saveDraft = async () => {
    if (draftPoints.length < 3) return toastError('Shape needs at least 3 points');
    if (!meta.name.trim()) return toastError('Zone name is required');
    const fee = parseFloat(meta.fee);
    if (Number.isNaN(fee) || fee < 0) return toastError('Fee cannot be negative');

    const c = centroid(draftPoints);
    const input: DeliveryZoneInput = {
      name: meta.name.trim(),
      center_lat: c.lat,
      center_lng: c.lng,
      radius_m: null,
      polygon: draftPoints,
      area_m2: polygonAreaM2(draftPoints),
      fee,
      is_active: meta.is_active,
      sort_order: parseInt(meta.sort_order) || 0,
    };

    setSaving(true);
    const { error } = editingZoneId ? await updateZone(editingZoneId, input) : await createZone(input);
    setSaving(false);

    if (error) {
      toastError(error.message);
    } else {
      success(editingZoneId ? 'Zone updated' : 'Zone created');
      cancelDraft();
    }
  };

  // ── legacy circle zones (lat/lng + radius) ──────────────────────────────
  const openCreateCircle = () => {
    setCircleEditing(null);
    setCircleForm(emptyCircle);
    setCircleModalOpen(true);
  };

  const openEditCircle = (zone: DeliveryZone) => {
    setCircleEditing(zone);
    setCircleForm({
      name: zone.name,
      center_lat: String(zone.center_lat),
      center_lng: String(zone.center_lng),
      radius_m: String(zone.radius_m ?? 2000),
      fee: String(zone.fee),
      is_active: zone.is_active,
      sort_order: String(zone.sort_order),
    });
    setCircleModalOpen(true);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toastError('Geolocation is not supported by this browser');
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCircleForm((f) => ({ ...f, center_lat: pos.coords.latitude.toFixed(6), center_lng: pos.coords.longitude.toFixed(6) }));
        setGpsBusy(false);
      },
      () => {
        toastError('Could not get location — enter coordinates manually');
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(circleForm.center_lat);
    const lng = parseFloat(circleForm.center_lng);
    const radius = parseFloat(circleForm.radius_m);
    const fee = parseFloat(circleForm.fee);

    if (!circleForm.name.trim()) return toastError('Zone name is required');
    if (Number.isNaN(lat) || lat < -90 || lat > 90) return toastError('Latitude must be between -90 and 90');
    if (Number.isNaN(lng) || lng < -180 || lng > 180) return toastError('Longitude must be between -180 and 180');
    if (Number.isNaN(radius) || radius <= 0) return toastError('Radius must be a positive number of meters');
    if (Number.isNaN(fee) || fee < 0) return toastError('Fee cannot be negative');

    const input: DeliveryZoneInput = {
      name: circleForm.name.trim(),
      center_lat: lat,
      center_lng: lng,
      radius_m: radius,
      polygon: null,
      area_m2: null,
      fee,
      is_active: circleForm.is_active,
      sort_order: parseInt(circleForm.sort_order) || 0,
    };

    setSaving(true);
    const { error } = circleEditing ? await updateZone(circleEditing.id, input) : await createZone(input);
    setSaving(false);

    if (error) toastError(error.message);
    else {
      success(circleEditing ? 'Zone updated' : 'Zone created');
      setCircleModalOpen(false);
    }
  };

  const handleDelete = async (zone: DeliveryZone) => {
    const ok = await confirm({
      title: 'Delete zone',
      message: `"${zone.name}" will be removed. Orders in this area will fall back to the default delivery fee.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const { error } = await deleteZone(zone.id);
    if (error) toastError(error.message);
    else {
      success('Zone deleted');
      if (editingZoneId === zone.id) cancelDraft();
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    const { error } = await updateZone(zone.id, { is_active: !zone.is_active });
    if (error) toastError(error.message);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Zones"
        subtitle="Draw shapes on the map, each with its own delivery fee. The smallest matching zone wins; outside every zone the default fee from Settings applies."
        actions={
          mode === 'idle' ? (
            <>
              <Button icon={Hexagon} onClick={startDrawing}>Draw New Zone</Button>
              <Button variant="secondary" icon={Plus} onClick={openCreateCircle}>Add Circle (by coordinates)</Button>
            </>
          ) : undefined
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div ref={mapEl} className="h-[420px] sm:h-[520px] w-full" />
      </Card>

      {mode === 'drawing' && (
        <Card className="flex flex-wrap items-center gap-3 border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Click the map to place points ({draftPoints.length} placed{draftPoints.length < 3 ? `, need ${3 - draftPoints.length} more` : ''}).
          </p>
          <div className="flex items-center gap-2 ms-auto">
            <Button variant="secondary" size="sm" icon={Undo2} onClick={undoPoint} disabled={draftPoints.length === 0}>Undo point</Button>
            <Button size="sm" icon={Check} onClick={finishDrawing} disabled={draftPoints.length < 3}>Finish shape</Button>
            <Button variant="ghost" size="sm" icon={XCircle} onClick={cancelDraft}>Cancel</Button>
          </div>
        </Card>
      )}

      {mode === 'editing' && (
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
              <Hexagon size={19} className="text-primary-600 dark:text-primary-400" />
            </span>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">{editingZoneId ? 'Edit Zone Shape' : 'New Zone Details'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drag the points on the map to fine-tune the shape · {fmtArea(polygonAreaM2(draftPoints))}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Zone name" required>
              <Input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} placeholder="e.g. City Center" />
            </Field>
            <Field label="Delivery fee (USD)" required>
              <Input type="number" min="0" step="0.01" value={meta.fee} onChange={(e) => setMeta({ ...meta, fee: e.target.value })} />
            </Field>
            <Field label="Sort order">
              <Input type="number" value={meta.sort_order} onChange={(e) => setMeta({ ...meta, sort_order: e.target.value })} />
            </Field>
            <div className="flex items-end pb-2.5">
              <Switch checked={meta.is_active} onChange={(v) => setMeta({ ...meta, is_active: v })} label="Active" />
            </div>
          </div>

          <div className="flex gap-3 pt-5">
            <Button variant="secondary" onClick={cancelDraft} className="flex-1">Cancel</Button>
            <Button onClick={saveDraft} loading={saving} className="flex-1">
              {editingZoneId ? 'Save Changes' : 'Create Zone'}
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : zones.length === 0 && mode === 'idle' ? (
        <EmptyState
          icon={MapIcon}
          title="No delivery zones yet"
          message="Without zones every delivery uses the flat default fee. Draw a shape on the map to charge by area."
          action={<Button icon={Hexagon} onClick={startDrawing}>Draw your first zone</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {zones.map((zone) => (
            <Card key={zone.id} padded className={!zone.is_active ? 'opacity-60 border-dashed' : ''}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                    {zone.polygon ? <Hexagon size={19} className="text-primary-600 dark:text-primary-400" /> : <MapPin size={19} className="text-primary-600 dark:text-primary-400" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{zone.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {zone.polygon ? `${fmtArea(zone.area_m2 || 0)} drawn shape` : `${fmtRadius(zone.radius_m || 0)} radius circle`}
                    </p>
                  </div>
                </div>
                <Badge tone={zone.is_active ? 'success' : 'neutral'}>{zone.is_active ? 'Active' : 'Off'}</Badge>
              </div>

              <div className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 tabular-nums">
                <CircleDollarSign size={20} className="text-primary-500" />
                ${Number(zone.fee).toFixed(2)}
              </div>
              <a
                href={`https://www.google.com/maps?q=${zone.center_lat},${zone.center_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mb-4"
              >
                {zone.center_lat.toFixed(4)}, {zone.center_lng.toFixed(4)}
                <ExternalLink size={12} />
              </a>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => toggleActive(zone)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    zone.is_active
                      ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  <Power size={14} />
                  {zone.is_active ? 'Disable' : 'Enable'}
                </button>
                <div className="flex-1" />
                <IconButton
                  icon={Pencil}
                  label={`Edit ${zone.name}`}
                  tone="primary"
                  onClick={() => (zone.polygon ? startEditPolygon(zone) : openEditCircle(zone))}
                />
                <IconButton icon={Trash2} label={`Delete ${zone.name}`} tone="danger" onClick={() => handleDelete(zone)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={circleModalOpen}
        onClose={() => setCircleModalOpen(false)}
        title={circleEditing ? 'Edit Circle Zone' : 'New Circle Zone'}
        subtitle="Legacy shape — a center point and radius instead of a drawn outline."
      >
        <form onSubmit={submitCircle} className="space-y-4">
          <Field label="Zone name" required>
            <Input value={circleForm.name} onChange={(e) => setCircleForm({ ...circleForm, name: e.target.value })} placeholder="e.g. City Center" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" required>
              <Input type="number" step="any" value={circleForm.center_lat} onChange={(e) => setCircleForm({ ...circleForm, center_lat: e.target.value })} placeholder="33.2765" required />
            </Field>
            <Field label="Longitude" required>
              <Input type="number" step="any" value={circleForm.center_lng} onChange={(e) => setCircleForm({ ...circleForm, center_lng: e.target.value })} placeholder="35.2065" required />
            </Field>
          </div>

          <Button type="button" variant="secondary" onClick={useMyLocation} disabled={gpsBusy} className="w-full" icon={gpsBusy ? undefined : Crosshair} loading={gpsBusy}>
            Use my current location
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Radius (meters)" required>
              <Input type="number" min="1" step="1" value={circleForm.radius_m} onChange={(e) => setCircleForm({ ...circleForm, radius_m: e.target.value })} required />
            </Field>
            <Field label="Delivery fee (USD)" required>
              <Input type="number" min="0" step="0.01" value={circleForm.fee} onChange={(e) => setCircleForm({ ...circleForm, fee: e.target.value })} required />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="w-28">
              <Field label="Sort order">
                <Input type="number" value={circleForm.sort_order} onChange={(e) => setCircleForm({ ...circleForm, sort_order: e.target.value })} />
              </Field>
            </div>
            <div className="pb-2.5">
              <Switch checked={circleForm.is_active} onChange={(v) => setCircleForm({ ...circleForm, is_active: v })} label="Active" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCircleModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{circleEditing ? 'Save Changes' : 'Create Zone'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
