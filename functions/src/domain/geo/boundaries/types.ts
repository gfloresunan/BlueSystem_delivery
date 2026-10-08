export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MunicipalBoundary {
  boundaryId: string;
  countryCode: string;
  departmentId: string;
  municipalityId: string;
  municipalityName: string;
  boundaryDatasetVersion: string;
  boundarySource: string;
  boundaryImportedAt: string;
  geometryType: "Polygon" | "MultiPolygon";
  geometryHash: string;
  boundingBox: BoundingBox;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any[];
  };
  isActive: boolean;
}
