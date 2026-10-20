"use client";

import { useEffect, useMemo, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { BoxGeometry, DoubleSide, MeshStandardMaterial, Shape, ShapeGeometry } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { buildFloorGeometry } from "@/lib/building/floor-geometry";
import { FLOOR_VIEW } from "@/lib/building/floor-config";

export default function SvgFloorModel({ svgPath, lowWalls, elevation = 0, onLoaded, selectedRoom, onSelectRoom }: {
  svgPath: string; lowWalls: boolean; elevation?: number; onLoaded: (count: number, rooms: number) => void;
  selectedRoom: number | null; onSelectRoom: (room: number | null) => void;
}) {
  const svg = useLoader(SVGLoader, svgPath);
  const model = useMemo(() => buildFloorGeometry(svg.paths, FLOOR_VIEW.scale), [svg]);
  const [hoveredRoom, setHoveredRoom] = useState<number | null>(null);
  const roomGeometries = useMemo(() => model.rooms.map(points => {
    const shape = new Shape();
    points.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
    shape.closePath();
    return new ShapeGeometry(shape);
  }), [model]);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => new MeshStandardMaterial({ color: "#9ca8b3", roughness: 0.8, metalness: 0 }), []);
  useEffect(() => { onLoaded(model.walls.length, model.rooms.length); }, [model, onLoaded]);
  useEffect(() => () => roomGeometries.forEach(room => room.dispose()), [roomGeometries]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <group position={[0, elevation, 0]} scale={[1, lowWalls ? FLOOR_VIEW.lowWallScale : 1, 1]}>
    {roomGeometries.map((room, index) => <mesh key={`room-${index}`} geometry={room} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}
      onPointerOver={event => { event.stopPropagation(); setHoveredRoom(index); }}
      onPointerOut={() => setHoveredRoom(null)}
      onClick={event => { event.stopPropagation(); if (event.delta <= 5) onSelectRoom(index); }}>
      <meshStandardMaterial color={selectedRoom === index ? "#137be8" : hoveredRoom === index ? "#8bc8f5" : "#dce8ef"} side={DoubleSide} roughness={0.9} />
    </mesh>)}
    {model.walls.map((wall, index) => <mesh key={index} geometry={geometry} material={material}
      position={[wall.x, FLOOR_VIEW.wallHeight / 2, wall.z]} rotation={[0, wall.rotationY, 0]}
      scale={[wall.length, FLOOR_VIEW.wallHeight, FLOOR_VIEW.wallThickness]} />)}
  </group>;
}
