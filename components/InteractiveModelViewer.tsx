
import React, { useState, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
// @ts-ignore
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { BackArrowIcon } from './Icons';
import * as THREE from 'three';

// Fix for TypeScript errors regarding Three.js elements in JSX
declare global {
    namespace JSX {
        interface IntrinsicElements {
            mesh: any;
            group: any;
            meshStandardMaterial: any;
            meshBasicMaterial: any;
            sphereGeometry: any;
        }
    }
    // Augment React.JSX namespace which is often used in newer TS/React versions
    namespace React {
        namespace JSX {
            interface IntrinsicElements {
                mesh: any;
                group: any;
                meshStandardMaterial: any;
                meshBasicMaterial: any;
                sphereGeometry: any;
            }
        }
    }
}

// --- TIPI ---
interface Zone {
    id: string;
    position: [number, number, number];
    label: string;
    description: string;
}

// --- SOTT-COMPONENTI ---

// Loader Visuale
function Loader() {
  const { progress } = useProgress();
  return <Html center><div className="text-white font-bold text-xl">{progress.toFixed(0)}% loaded</div></Html>;
}

// Il Modello 3D vero e proprio
const Model = ({ url, type, onModelClick }: { url: string, type: 'stl' | 'obj', onModelClick: (e: any) => void }) => {
    // Usiamo useLoader in modo condizionale in base al tipo
    // Nota: In React "reale" hooks condizionali sono vietati, ma qui la chiave 'key' nel componente padre resetterà il componente al cambio file
    const geom = useLoader(type === 'stl' ? STLLoader : OBJLoader, url);

    const geometry = useMemo(() => {
        if (type === 'obj') {
            // OBJLoader ritorna un Group, dobbiamo trovare la mesh
            let foundGeom: THREE.BufferGeometry | null = null;
            (geom as THREE.Group).traverse((child) => {
                if ((child as THREE.Mesh).isMesh && !foundGeom) {
                    foundGeom = (child as THREE.Mesh).geometry;
                }
            });
            return foundGeom;
        }
        return geom as THREE.BufferGeometry;
    }, [geom, type]);

    if (!geometry) return null;

    return (
        <mesh 
            geometry={geometry} 
            onClick={onModelClick} 
            rotation={[-Math.PI / 2, 0, 0]} // Molti STL sono ruotati, questo aiuta spesso
            castShadow 
            receiveShadow
        >
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.2} />
        </mesh>
    );
};

// I punti cliccabili (Hotspots)
const Hotspot: React.FC<{ zone: Zone, onClick: (z: Zone) => void }> = ({ zone, onClick }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <group position={zone.position}>
            {/* Sfera invisibile per facilitare il click (Hitbox più grande del marker visivo) */}
            <mesh onClick={(e) => { e.stopPropagation(); onClick(zone); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
                <sphereGeometry args={[1.5, 16, 16]} /> 
                <meshBasicMaterial transparent opacity={0.2} color={hovered ? "yellow" : "transparent"} depthTest={false} />
            </mesh>

            {/* Marker Visivo (Puntino rosso/verde) */}
            <mesh position={[0,0,0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial color={hovered ? "#fbbf24" : "#ef4444"} emissive={hovered ? "#fbbf24" : "#ef4444"} emissiveIntensity={2} />
            </mesh>

            {/* Etichetta HTML che fluttua sopra il punto */}
            <Html distanceFactor={30} position={[0, 1, 0]} style={{ pointerEvents: 'none' }}>
                <div className={`px-2 py-1 rounded shadow-lg text-xs font-bold whitespace-nowrap transition-all ${hovered ? 'bg-yellow-400 text-yellow-900 scale-110' : 'bg-slate-800/80 text-white'}`}>
                    {zone.label}
                </div>
            </Html>
        </group>
    );
};

// --- COMPONENTE PRINCIPALE ---

interface InteractiveModelViewerProps {
    onGoBack: () => void;
}

const InteractiveModelViewer: React.FC<InteractiveModelViewerProps> = ({ onGoBack }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'stl' | 'obj'>('stl');
    const [zones, setZones] = useState<Zone[]>([]);
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

    // Gestione caricamento file locale
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const ext = file.name.split('.').pop()?.toLowerCase();
            setFileType(ext === 'obj' ? 'obj' : 'stl');
            setFileUrl(url);
            setZones([]); // Reset zone al cambio file
        }
    };

    // Aggiunta zona al click sul modello
    const handleModelClick = (e: any) => {
        if (mode === 'edit') {
            e.stopPropagation();
            const point = e.point; // Coordinate {x, y, z} dove si è cliccato
            const newZone: Zone = {
                id: Date.now().toString(),
                position: [point.x, point.y, point.z],
                label: `Zona ${zones.length + 1}`,
                description: 'Descrizione modificabile...'
            };
            setZones([...zones, newZone]);
        }
    };

    const handleZoneClick = (zone: Zone) => {
        setSelectedZone(zone);
    };

    const deleteZone = (id: string) => {
        setZones(zones.filter(z => z.id !== id));
        setSelectedZone(null);
    };

    const updateZone = (id: string, key: keyof Zone, value: string) => {
        setZones(zones.map(z => z.id === id ? { ...z, [key]: value } : z));
        if (selectedZone && selectedZone.id === id) {
            setSelectedZone(prev => prev ? { ...prev, [key]: value } : null);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white font-sans overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-slate-800 shadow-md flex justify-between items-center z-10">
                <button onClick={onGoBack} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                    <BackArrowIcon className="h-5 w-5" /> Indietro
                </button>
                <h1 className="font-bold text-lg">Visualizzatore 3D Interattivo</h1>
                <div className="w-20"></div>
            </div>

            <div className="flex flex-grow overflow-hidden relative">
                
                {/* 3D Canvas Area */}
                <div className="flex-grow relative bg-gradient-to-b from-slate-800 to-slate-900 cursor-crosshair">
                    {!fileUrl ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center border-4 border-dashed border-slate-700 m-8 rounded-3xl">
                            <div className="text-6xl mb-4 text-slate-600">🧊</div>
                            <h3 className="text-2xl font-bold text-slate-400 mb-2">Carica un Modello 3D</h3>
                            <p className="text-slate-500 mb-6 max-w-md">Supporta file .STL e .OBJ. Clicca sul modello in modalità "Edit" per aggiungere punti di interesse.</p>
                            <label className="bg-primary hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95">
                                Seleziona File
                                <input type="file" accept=".stl,.obj" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    ) : (
                        <Canvas shadows camera={{ position: [50, 50, 50], fov: 50 }}>
                            <Suspense fallback={<Loader />}>
                                <Stage environment="city" intensity={0.6}>
                                    <Model url={fileUrl} type={fileType} onModelClick={handleModelClick} />
                                </Stage>
                                {zones.map(zone => (
                                    <Hotspot key={zone.id} zone={zone} onClick={handleZoneClick} />
                                ))}
                            </Suspense>
                            <OrbitControls makeDefault />
                        </Canvas>
                    )}

                    {/* Toolbar Modalità */}
                    {fileUrl && (
                        <div className="absolute top-4 left-4 flex bg-slate-800/90 backdrop-blur rounded-lg p-1 border border-slate-700">
                            <button 
                                onClick={() => setMode('view')} 
                                className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-colors ${mode === 'view' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                👁️ View
                            </button>
                            <button 
                                onClick={() => setMode('edit')} 
                                className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-colors ${mode === 'edit' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                ➕ Edit Zones
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar Controlli / Dettagli */}
                <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto z-20 shadow-2xl">
                    
                    {selectedZone ? (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                                <h3 className="font-bold text-lg">Dettaglio Zona</h3>
                                <button onClick={() => setSelectedZone(null)} className="text-slate-400 hover:text-white">&times;</button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Etichetta</label>
                                    <input 
                                        type="text" 
                                        value={selectedZone.label} 
                                        onChange={(e) => updateZone(selectedZone.id, 'label', e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrizione / Azione</label>
                                    <textarea 
                                        value={selectedZone.description} 
                                        onChange={(e) => updateZone(selectedZone.id, 'description', e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white h-32 focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div className="p-3 bg-slate-700/50 rounded text-xs font-mono text-slate-400 break-all">
                                    Pos: [{selectedZone.position.map(n => n.toFixed(2)).join(', ')}]
                                </div>
                                <button 
                                    onClick={() => deleteZone(selectedZone.id)}
                                    className="w-full bg-red-500/20 hover:bg-red-600 text-red-200 hover:text-white py-2 rounded font-bold border border-red-500/50 transition-colors"
                                >
                                    Elimina Zona
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 className="font-bold text-slate-400 uppercase text-xs mb-4">Zone Attive ({zones.length})</h3>
                            {zones.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">Nessuna zona definita. Passa alla modalità EDIT e clicca sul modello.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {zones.map(z => (
                                        <li 
                                            key={z.id} 
                                            onClick={() => setSelectedZone(z)}
                                            className="bg-slate-700 hover:bg-slate-600 p-3 rounded cursor-pointer border border-transparent hover:border-slate-500 transition-all group"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm">{z.label}</span>
                                                <span className="text-xs text-primary group-hover:underline">Modifica</span>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate mt-1">{z.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            
                            {/* File Info */}
                            {fileUrl && (
                                <div className="mt-8 pt-4 border-t border-slate-700">
                                    <label className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 px-4 rounded w-full block text-center cursor-pointer transition-colors">
                                        Carica Nuovo File
                                        <input type="file" accept=".stl,.obj" onChange={handleFileChange} className="hidden" />
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InteractiveModelViewer;
