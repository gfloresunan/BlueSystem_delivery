/**
 * BlueSystem Delivery Enterprise — Catálogo Canónico Geográfico de Nicaragua
 *
 * Catálogo estructurado oficial de Departamentos y Municipios para
 * validación, persistencia y segmentación operacional en Cloud Functions.
 */

export interface Municipality {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  municipalities: Municipality[];
}

export const NICARAGUA_DEPARTMENTS: Department[] = [
  {
    id: "BOACO",
    name: "Boaco",
    municipalities: [
      { id: "BOACO", name: "Boaco" },
      { id: "CAMOAPA", name: "Camoapa" },
      { id: "SAN_JOSE_DE_LOS_REMATES", name: "San José de los Remates" },
      { id: "SAN_LORENZO", name: "San Lorenzo" },
      { id: "SANTA_LUCIA", name: "Santa Lucía" },
      { id: "TEUSTEPE", name: "Teustepe" },
    ],
  },
  {
    id: "CARAZO",
    name: "Carazo",
    municipalities: [
      { id: "DIRIAMBA", name: "Diriamba" },
      { id: "DOLORES", name: "Dolores" },
      { id: "EL_ROSARIO", name: "El Rosario" },
      { id: "JINOTEPE", name: "Jinotepe" },
      { id: "LA_CONQUISTA", name: "La Conquista" },
      { id: "LA_PAZ_DE_CARAZO", name: "La Paz de Carazo" },
      { id: "SAN_MARCOS", name: "San Marcos" },
      { id: "SANTA_TERESA", name: "Santa Teresa" },
    ],
  },
  {
    id: "CHINANDEGA",
    name: "Chinandega",
    municipalities: [
      { id: "CHICHIGALPA", name: "Chichigalpa" },
      { id: "CHINANDEGA", name: "Chinandega" },
      { id: "CINCO_PINOS", name: "Cinco Pinos" },
      { id: "CORINTO", name: "Corinto" },
      { id: "EL_REALEJO", name: "El Realejo" },
      { id: "EL_VIEJO", name: "El Viejo" },
      { id: "POSOLTEGA", name: "Posoltega" },
      { id: "PUERTO_MORAZAN", name: "Puerto Morazán" },
      { id: "SAN_FRANCISCO_DEL_NORTE", name: "San Francisco del Norte" },
      { id: "SAN_PEDRO_DEL_NORTE", name: "San Pedro del Norte" },
      { id: "SANTO_TOMAS_DEL_NORTE", name: "Santo Tomás del Norte" },
      { id: "SOMOTILLO", name: "Somotillo" },
      { id: "VILLANUEVA", name: "Villanueva" },
    ],
  },
  {
    id: "CHONTALES",
    name: "Chontales",
    municipalities: [
      { id: "ACOYAPA", name: "Acoyapa" },
      { id: "COMALAPA", name: "Comalapa" },
      { id: "CUAPA", name: "San Francisco de Cuapa" },
      { id: "EL_CORAL", name: "El Coral" },
      { id: "JUIGALPA", name: "Juigalpa" },
      { id: "LA_LIBERTAD", name: "La Libertad" },
      { id: "SAN_PEDRO_DE_LOVAGO", name: "San Pedro de Lóvago" },
      { id: "SANTO_DOMINGO", name: "Santo Domingo" },
      { id: "SANTO_TOMAS", name: "Santo Tomás" },
      { id: "VILLA_SANDINO", name: "Villa Sandino" },
    ],
  },
  {
    id: "ESTELI",
    name: "Estelí",
    municipalities: [
      { id: "CONDEGA", name: "Condega" },
      { id: "ESTELI", name: "Estelí" },
      { id: "LA_TRINIDAD", name: "La Trinidad" },
      { id: "PUEBLO_NUEVO", name: "Pueblo Nuevo" },
      { id: "SAN_JUAN_DE_LIMAY", name: "San Juan de Limay" },
      { id: "SAN_NICOLAS", name: "San Nicolás" },
    ],
  },
  {
    id: "GRANADA",
    name: "Granada",
    municipalities: [
      { id: "DIRIA", name: "Diriá" },
      { id: "DIRIOMO", name: "Diriomo" },
      { id: "GRANADA", name: "Granada" },
      { id: "NANDAIME", name: "Nandaime" },
    ],
  },
  {
    id: "JINOTEGA",
    name: "Jinotega",
    municipalities: [
      { id: "EL_CUA", name: "El Cuá" },
      { id: "JINOTEGA", name: "Jinotega" },
      { id: "LA_CONCORDIA", name: "La Concordia" },
      { id: "SAN_JOSE_DE_BOCAY", name: "San José de Bocay" },
      { id: "SAN_RAFAEL_DEL_NORTE", name: "San Rafael del Norte" },
      { id: "SAN_SEBASTIAN_DE_YALI", name: "San Sebastián de Yalí" },
      { id: "SANTA_MARIA_DE_PANTASMA", name: "Santa María de Pantasma" },
      { id: "WIWILI_DE_JINOTEGA", name: "Wiwilí de Jinotega" },
    ],
  },
  {
    id: "LEON",
    name: "León",
    municipalities: [
      { id: "ACHUAPA", name: "Achuapa" },
      { id: "EL_JICARAL", name: "El Jicaral" },
      { id: "EL_SAUCE", name: "El Sauce" },
      { id: "LA_PAZ_CENTRO", name: "La Paz Centro" },
      { id: "LARREYNAGA", name: "Larreynaga (Malpaisillo)" },
      { id: "LEON", name: "León" },
      { id: "NAGAROTE", name: "Nagarote" },
      { id: "QUEZALGUAQUE", name: "Quezalguaque" },
      { id: "SANTA_ROSA_DEL_PENON", name: "Santa Rosa del Peñón" },
      { id: "TELICA", name: "Telica" },
    ],
  },
  {
    id: "MADRIZ",
    name: "Madriz",
    municipalities: [
      { id: "LAS_SABANAS", name: "Las Sabanas" },
      { id: "PALACAGUINA", name: "Palacagüina" },
      { id: "SAN_JOSE_DE_CUSMAPA", name: "San José de Cusmapa" },
      { id: "SAN_JUAN_DE_RIO_COCO", name: "San Juan de Río Coco" },
      { id: "SAN_LUCAS", name: "San Lucas" },
      { id: "SOMOTO", name: "Somoto" },
      { id: "TELPANECA", name: "Telpaneca" },
      { id: "TOTOGALPA", name: "Totogalpa" },
      { id: "YALAGUINA", name: "Yalagüina" },
    ],
  },
  {
    id: "MANAGUA",
    name: "Managua",
    municipalities: [
      { id: "CIUDAD_SANDINO", name: "Ciudad Sandino" },
      { id: "EL_CRUCERO", name: "El Crucero" },
      { id: "MANAGUA", name: "Managua" },
      { id: "MATEARE", name: "Mateare" },
      { id: "SAN_FRANCISCO_LIBRE", name: "San Francisco Libre" },
      { id: "SAN_RAFAEL_DEL_SUR", name: "San Rafael del Sur" },
      { id: "TICUANTEPE", name: "Ticuantepe" },
      { id: "TIPITAPA", name: "Tipitapa" },
      { id: "VILLA_EL_CARMEN", name: "Villa El Carmen" },
    ],
  },
  {
    id: "MASAYA",
    name: "Masaya",
    municipalities: [
      { id: "CATARINA", name: "Catarina" },
      { id: "LA_CONCEPCION", name: "La Concepción" },
      { id: "MASATEPE", name: "Masatepe" },
      { id: "MASAYA", name: "Masaya" },
      { id: "NANDASMO", name: "Nandasmo" },
      { id: "NINDIRI", name: "Nindirí" },
      { id: "NIQUINOHOMO", name: "Niquinohomo" },
      { id: "SAN_JUAN_DE_ORIENTE", name: "San Juan de Oriente" },
      { id: "TISMA", name: "Tisma" },
    ],
  },
  {
    id: "MATAGALPA",
    name: "Matagalpa",
    municipalities: [
      { id: "CIUDAD_DARIO", name: "Ciudad Darío" },
      { id: "ESQUIPULAS", name: "Esquipulas" },
      { id: "MATAGALPA", name: "Matagalpa" },
      { id: "MATIGUAS", name: "Matiguás" },
      { id: "MUY_MUY", name: "Muy Muy" },
      { id: "RANCHO_GRANDE", name: "Rancho Grande" },
      { id: "RIO_BLANCO", name: "Río Blanco" },
      { id: "SAN_DIONISIO", name: "San Dionisio" },
      { id: "SAN_ISIDRO", name: "San Isidro" },
      { id: "SAN_RAMON", name: "San Ramón" },
      { id: "SEBACO", name: "Sébaco" },
      { id: "TERRABONA", name: "Terrabona" },
      { id: "TUMA_LA_DALIA", name: "El Tuma - La Dalia" },
    ],
  },
  {
    id: "NUEVA_SEGOVIA",
    name: "Nueva Segovia",
    municipalities: [
      { id: "CIUDAD_ANTIGUA", name: "Ciudad Antigua" },
      { id: "DIPILTO", name: "Dipilto" },
      { id: "EL_JICARO", name: "El Jícaro" },
      { id: "JALAPA", name: "Jalapa" },
      { id: "MACUELIZO", name: "Macuelizo" },
      { id: "MOZONTE", name: "Mozonte" },
      { id: "MURRA", name: "Murra" },
      { id: "OCOTAL", name: "Ocotal" },
      { id: "QUILALI", name: "Quilalí" },
      { id: "SAN_FERNANDO", name: "San Fernando" },
      { id: "SANTA_MARIA", name: "Santa María" },
      { id: "WIWILI", name: "Wiwilí de Nueva Segovia" },
    ],
  },
  {
    id: "RIO_SAN_JUAN",
    name: "Río San Juan",
    municipalities: [
      { id: "EL_ALMENDRO", name: "El Almendro" },
      { id: "EL_CASTILLO", name: "El Castillo" },
      { id: "MORRITO", name: "Morrito" },
      { id: "SAN_CARLOS", name: "San Carlos" },
      { id: "SAN_JUAN_DEL_NORTE", name: "San Juan del Norte" },
      { id: "SAN_MIGUELITO", name: "San Miguelito" },
    ],
  },
  {
    id: "RIVAS",
    name: "Rivas",
    municipalities: [
      { id: "ALTAGRACIA", name: "Altagracia" },
      { id: "BELEN", name: "Belén" },
      { id: "BUENOS_AIRES", name: "Buenos Aires" },
      { id: "CARDENAS", name: "Cárdenas" },
      { id: "MOYOGALPA", name: "Moyogalpa" },
      { id: "POTOSI", name: "Potosí" },
      { id: "RIVAS", name: "Rivas" },
      { id: "SAN_JORGE", name: "San Jorge" },
      { id: "SAN_JUAN_DEL_SUR", name: "San Juan del Sur" },
      { id: "TOLA", name: "Tola" },
    ],
  },
  {
    id: "RACCN",
    name: "Costa Caribe Norte (RACCN)",
    municipalities: [
      { id: "BILWI", name: "Bilwi (Puerto Cabezas)" },
      { id: "BONANZA", name: "Bonanza" },
      { id: "MULUKUKU", name: "Mulukukú" },
      { id: "PRINZAPOLKA", name: "Prinzapolka" },
      { id: "ROSITA", name: "Rosita" },
      { id: "SIUNA", name: "Siuna" },
      { id: "WASLALA", name: "Waslala" },
      { id: "WASPAM", name: "Waspam" },
    ],
  },
  {
    id: "RACCS",
    name: "Costa Caribe Sur (RACCS)",
    municipalities: [
      { id: "BLUEFIELDS", name: "Bluefields" },
      { id: "CORN_ISLAND", name: "Corn Island" },
      { id: "DESEMBOCADURA_RIO_GRANDE", name: "Desembocadura de Río Grande" },
      { id: "EL_AYOTE", name: "El Ayote" },
      { id: "EL_RAMA", name: "El Rama" },
      { id: "EL_TORTUGUERO", name: "El Tortuguero" },
      { id: "KUKRA_HILL", name: "Kukra Hill" },
      { id: "LA_CRUZ_DE_RIO_GRANDE", name: "La Cruz de Río Grande" },
      { id: "LAGUNA_DE_PERLAS", name: "Laguna de Perlas" },
      { id: "MUELLE_DE_LOS_BUEYES", name: "Muelle de los Bueyes" },
      { id: "NUEVA_GUINEA", name: "Nueva Guinea" },
      { id: "PAIWAS", name: "Bocana de Paiwas" },
    ],
  },
];

export function getDepartment(departmentId?: string | null): Department | undefined {
  if (!departmentId) return undefined;
  const clean = departmentId.toUpperCase().trim();
  return NICARAGUA_DEPARTMENTS.find((d) => d.id === clean);
}

export function getMunicipalities(departmentId?: string | null): Municipality[] {
  const dept = getDepartment(departmentId);
  return dept ? dept.municipalities : [];
}

export function isValidDepartment(departmentId?: string | null): boolean {
  return Boolean(getDepartment(departmentId));
}

export function isValidMunicipality(departmentId?: string | null, municipalityId?: string | null): boolean {
  if (!departmentId || !municipalityId) return false;
  const munis = getMunicipalities(departmentId);
  const cleanMuni = municipalityId.toUpperCase().trim();
  return munis.some((m) => m.id === cleanMuni);
}

export function getDepartmentName(departmentId?: string | null): string {
  const dept = getDepartment(departmentId);
  return dept ? dept.name : (departmentId || '');
}

export function getMunicipalityName(departmentId?: string | null, municipalityId?: string | null): string {
  if (!departmentId || !municipalityId) return municipalityId || '';
  const munis = getMunicipalities(departmentId);
  const cleanMuni = municipalityId.toUpperCase().trim();
  const found = munis.find((m) => m.id === cleanMuni);
  return found ? found.name : (municipalityId || '');
}

/**
 * Valida si un ID de departamento existe en el catálogo oficial de Nicaragua.
 */
export function isValidDepartmentId(deptId?: string | null): boolean {
  if (!deptId) return false;
  const clean = deptId.trim().toUpperCase();
  return NICARAGUA_DEPARTMENTS.some((d) => d.id === clean);
}

/**
 * Valida si un ID de municipio existe en el catálogo oficial de Nicaragua.
 */
export function isValidMunicipalityId(muniId?: string | null): boolean {
  if (!muniId) return false;
  const clean = muniId.trim().toUpperCase();
  return NICARAGUA_DEPARTMENTS.some((d) =>
    d.municipalities.some((m) => m.id === clean)
  );
}

/**
 * Obtiene un municipio por su ID canónico buscando en todos los departamentos.
 */
export function getMunicipalityById(muniId?: string | null): { id: string; name: string; departmentId: string } | null {
  if (!muniId) return null;
  const clean = muniId.trim().toUpperCase();
  for (const d of NICARAGUA_DEPARTMENTS) {
    const m = d.municipalities.find((item) => item.id === clean);
    if (m) {
      return { id: m.id, name: m.name, departmentId: d.id };
    }
  }
  return null;
}

/**
 * Normalización estricta Fail-Closed: retorna null si la entrada no corresponde a ningún municipio válido.
 * Jamás aplica fallback arbitrario a Managua u otra ciudad.
 */
export function normalizeGeoLocationStrict(
  departmentInput?: string | null,
  municipalityInput?: string | null
): {
  departmentId: string;
  departmentName: string;
  municipalityId: string;
  municipalityName: string;
} | null {
  const rawDept = (departmentInput || "").trim().toUpperCase();
  const rawMuni = (municipalityInput || "").trim().toUpperCase();

  if (!rawMuni && !rawDept) {
    return null; // Fail-Closed: sin entrada, no hay geo
  }

  let matchedDept = NICARAGUA_DEPARTMENTS.find(
    (d) => d.id === rawDept || d.name.toUpperCase() === rawDept
  );

  if (!matchedDept && rawMuni) {
    for (const d of NICARAGUA_DEPARTMENTS) {
      if (d.municipalities.some((m) => m.id === rawMuni || m.name.toUpperCase() === rawMuni)) {
        matchedDept = d;
        break;
      }
    }
  }

  if (!matchedDept) {
    return null; // Fail-Closed: departamento no reconocido
  }

  const matchedMuni = matchedDept.municipalities.find(
    (m) => m.id === rawMuni || m.name.toUpperCase() === rawMuni
  );

  if (!matchedMuni) {
    return null; // Fail-Closed: municipio no encontrado dentro del departamento
  }

  return {
    departmentId: matchedDept.id,
    departmentName: matchedDept.name,
    municipalityId: matchedMuni.id,
    municipalityName: matchedMuni.name,
  };
}

/**
 * Normaliza cualquier entrada (id, texto libre o mayúsculas/minúsculas)
 * al ID técnico canónico y nombre correspondiente.
 */
export function normalizeGeoLocation(
  departmentInput?: string | null,
  municipalityInput?: string | null
): {
  departmentId: string;
  departmentName: string;
  municipalityId: string;
  municipalityName: string;
} {
  const strict = normalizeGeoLocationStrict(departmentInput, municipalityInput);
  if (strict) {
    return strict;
  }

  // 🔒 FAIL-CLOSED: Jamás aplicar fallback arbitrario a MANAGUA
  return {
    departmentId: "",
    departmentName: "",
    municipalityId: "",
    municipalityName: "",
  };
}

