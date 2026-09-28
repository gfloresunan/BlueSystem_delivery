package com.example.domain.model.geo

/**
 * BlueSystem Delivery Enterprise — Catálogo Canónico Geográfico de Nicaragua
 *
 * Catálogo estructurado oficial de Departamentos y Municipios para
 * validación, persistencia y segmentación operacional en Android.
 */

data class Municipality(
    val id: String,
    val name: String
)

data class Department(
    val id: String,
    val name: String,
    val municipalities: List<Municipality>
)

object GeoCatalog {

    val DEPARTMENTS: List<Department> = listOf(
        Department(
            id = "BOACO",
            name = "Boaco",
            municipalities = listOf(
                Municipality("BOACO", "Boaco"),
                Municipality("CAMOAPA", "Camoapa"),
                Municipality("SAN_JOSE_DE_LOS_REMATES", "San José de los Remates"),
                Municipality("SAN_LORENZO", "San Lorenzo"),
                Municipality("SANTA_LUCIA", "Santa Lucía"),
                Municipality("TEUSTEPE", "Teustepe")
            )
        ),
        Department(
            id = "CARAZO",
            name = "Carazo",
            municipalities = listOf(
                Municipality("DIRIAMBA", "Diriamba"),
                Municipality("DOLORES", "Dolores"),
                Municipality("EL_ROSARIO", "El Rosario"),
                Municipality("JINOTEPE", "Jinotepe"),
                Municipality("LA_CONQUISTA", "La Conquista"),
                Municipality("LA_PAZ_DE_CARAZO", "La Paz de Carazo"),
                Municipality("SAN_MARCOS", "San Marcos"),
                Municipality("SANTA_TERESA", "Santa Teresa")
            )
        ),
        Department(
            id = "CHINANDEGA",
            name = "Chinandega",
            municipalities = listOf(
                Municipality("CHICHIGALPA", "Chichigalpa"),
                Municipality("CHINANDEGA", "Chinandega"),
                Municipality("CINCO_PINOS", "Cinco Pinos"),
                Municipality("CORINTO", "Corinto"),
                Municipality("EL_REALEJO", "El Realejo"),
                Municipality("EL_VIEJO", "El Viejo"),
                Municipality("POSOLTEGA", "Posoltega"),
                Municipality("PUERTO_MORAZAN", "Puerto Morazán"),
                Municipality("SAN_FRANCISCO_DEL_NORTE", "San Francisco del Norte"),
                Municipality("SAN_PEDRO_DEL_NORTE", "San Pedro del Norte"),
                Municipality("SANTO_TOMAS_DEL_NORTE", "Santo Tomás del Norte"),
                Municipality("SOMOTILLO", "Somotillo"),
                Municipality("VILLANUEVA", "Villanueva")
            )
        ),
        Department(
            id = "CHONTALES",
            name = "Chontales",
            municipalities = listOf(
                Municipality("ACOYAPA", "Acoyapa"),
                Municipality("COMALAPA", "Comalapa"),
                Municipality("CUAPA", "San Francisco de Cuapa"),
                Municipality("EL_CORAL", "El Coral"),
                Municipality("JUIGALPA", "Juigalpa"),
                Municipality("LA_LIBERTAD", "La Libertad"),
                Municipality("SAN_PEDRO_DE_LOVAGO", "San Pedro de Lóvago"),
                Municipality("SANTO_DOMINGO", "Santo Domingo"),
                Municipality("SANTO_TOMAS", "Santo Tomás"),
                Municipality("VILLA_SANDINO", "Villa Sandino")
            )
        ),
        Department(
            id = "ESTELI",
            name = "Estelí",
            municipalities = listOf(
                Municipality("CONDEGA", "Condega"),
                Municipality("ESTELI", "Estelí"),
                Municipality("LA_TRINIDAD", "La Trinidad"),
                Municipality("PUEBLO_NUEVO", "Pueblo Nuevo"),
                Municipality("SAN_JUAN_DE_LIMAY", "San Juan de Limay"),
                Municipality("SAN_NICOLAS", "San Nicolás")
            )
        ),
        Department(
            id = "GRANADA",
            name = "Granada",
            municipalities = listOf(
                Municipality("DIRIA", "Diriá"),
                Municipality("DIRIOMO", "Diriomo"),
                Municipality("GRANADA", "Granada"),
                Municipality("NANDAIME", "Nandaime")
            )
        ),
        Department(
            id = "JINOTEGA",
            name = "Jinotega",
            municipalities = listOf(
                Municipality("EL_CUA", "El Cuá"),
                Municipality("JINOTEGA", "Jinotega"),
                Municipality("LA_CONCORDIA", "La Concordia"),
                Municipality("SAN_JOSE_DE_BOCAY", "San José de Bocay"),
                Municipality("SAN_RAFAEL_DEL_NORTE", "San Rafael del Norte"),
                Municipality("SAN_SEBASTIAN_DE_YALI", "San Sebastián de Yalí"),
                Municipality("SANTA_MARIA_DE_PANTASMA", "Santa María de Pantasma"),
                Municipality("WIWILI_DE_JINOTEGA", "Wiwilí de Jinotega")
            )
        ),
        Department(
            id = "LEON",
            name = "León",
            municipalities = listOf(
                Municipality("ACHUAPA", "Achuapa"),
                Municipality("EL_JICARAL", "El Jicaral"),
                Municipality("EL_SAUCE", "El Sauce"),
                Municipality("LA_PAZ_CENTRO", "La Paz Centro"),
                Municipality("LARREYNAGA", "Larreynaga (Malpaisillo)"),
                Municipality("LEON", "León"),
                Municipality("NAGAROTE", "Nagarote"),
                Municipality("QUEZALGUAQUE", "Quezalguaque"),
                Municipality("SANTA_ROSA_DEL_PENON", "Santa Rosa del Peñón"),
                Municipality("TELICA", "Telica")
            )
        ),
        Department(
            id = "MADRIZ",
            name = "Madriz",
            municipalities = listOf(
                Municipality("LAS_SABANAS", "Las Sabanas"),
                Municipality("PALACAGUINA", "Palacagüina"),
                Municipality("SAN_JOSE_DE_CUSMAPA", "San José de Cusmapa"),
                Municipality("SAN_JUAN_DE_RIO_COCO", "San Juan de Río Coco"),
                Municipality("SAN_LUCAS", "San Lucas"),
                Municipality("SOMOTO", "Somoto"),
                Municipality("TELPANECA", "Telpaneca"),
                Municipality("TOTOGALPA", "Totogalpa"),
                Municipality("YALAGUINA", "Yalagüina")
            )
        ),
        Department(
            id = "MANAGUA",
            name = "Managua",
            municipalities = listOf(
                Municipality("CIUDAD_SANDINO", "Ciudad Sandino"),
                Municipality("EL_CRUCERO", "El Crucero"),
                Municipality("MANAGUA", "Managua"),
                Municipality("MATEARE", "Mateare"),
                Municipality("SAN_FRANCISCO_LIBRE", "San Francisco Libre"),
                Municipality("SAN_RAFAEL_DEL_SUR", "San Rafael del Sur"),
                Municipality("TICUANTEPE", "Ticuantepe"),
                Municipality("TIPITAPA", "Tipitapa"),
                Municipality("VILLA_EL_CARMEN", "Villa El Carmen")
            )
        ),
        Department(
            id = "MASAYA",
            name = "Masaya",
            municipalities = listOf(
                Municipality("CATARINA", "Catarina"),
                Municipality("LA_CONCEPCION", "La Concepción"),
                Municipality("MASATEPE", "Masatepe"),
                Municipality("MASAYA", "Masaya"),
                Municipality("NANDASMO", "Nandasmo"),
                Municipality("NINDIRI", "Nindirí"),
                Municipality("NIQUINOHOMO", "Niquinohomo"),
                Municipality("SAN_JUAN_DE_ORIENTE", "San Juan de Oriente"),
                Municipality("TISMA", "Tisma")
            )
        ),
        Department(
            id = "MATAGALPA",
            name = "Matagalpa",
            municipalities = listOf(
                Municipality("CIUDAD_DARIO", "Ciudad Darío"),
                Municipality("ESQUIPULAS", "Esquipulas"),
                Municipality("MATAGALPA", "Matagalpa"),
                Municipality("MATIGUAS", "Matiguás"),
                Municipality("MUY_MUY", "Muy Muy"),
                Municipality("RANCHO_GRANDE", "Rancho Grande"),
                Municipality("RIO_BLANCO", "Río Blanco"),
                Municipality("SAN_DIONISIO", "San Dionisio"),
                Municipality("SAN_ISIDRO", "San Isidro"),
                Municipality("SAN_RAMON", "San Ramón"),
                Municipality("SEBACO", "Sébaco"),
                Municipality("TERRABONA", "Terrabona"),
                Municipality("TUMA_LA_DALIA", "El Tuma - La Dalia")
            )
        ),
        Department(
            id = "NUEVA_SEGOVIA",
            name = "Nueva Segovia",
            municipalities = listOf(
                Municipality("CIUDAD_ANTIGUA", "Ciudad Antigua"),
                Municipality("DIPILTO", "Dipilto"),
                Municipality("EL_JICARO", "El Jícaro"),
                Municipality("JALAPA", "Jalapa"),
                Municipality("MACUELIZO", "Macuelizo"),
                Municipality("MOZONTE", "Mozonte"),
                Municipality("MURRA", "Murra"),
                Municipality("OCOTAL", "Ocotal"),
                Municipality("QUILALI", "Quilalí"),
                Municipality("SAN_FERNANDO", "San Fernando"),
                Municipality("SANTA_MARIA", "Santa María"),
                Municipality("WIWILI", "Wiwilí de Nueva Segovia")
            )
        ),
        Department(
            id = "RIO_SAN_JUAN",
            name = "Río San Juan",
            municipalities = listOf(
                Municipality("EL_ALMENDRO", "El Almendro"),
                Municipality("EL_CASTILLO", "El Castillo"),
                Municipality("MORRITO", "Morrito"),
                Municipality("SAN_CARLOS", "San Carlos"),
                Municipality("SAN_JUAN_DEL_NORTE", "San Juan del Norte"),
                Municipality("SAN_MIGUELITO", "San Miguelito")
            )
        ),
        Department(
            id = "RIVAS",
            name = "Rivas",
            municipalities = listOf(
                Municipality("ALTAGRACIA", "Altagracia"),
                Municipality("BELEN", "Belén"),
                Municipality("BUENOS_AIRES", "Buenos Aires"),
                Municipality("CARDENAS", "Cárdenas"),
                Municipality("MOYOGALPA", "Moyogalpa"),
                Municipality("POTOSI", "Potosí"),
                Municipality("RIVAS", "Rivas"),
                Municipality("SAN_JORGE", "San Jorge"),
                Municipality("SAN_JUAN_DEL_SUR", "San Juan del Sur"),
                Municipality("TOLA", "Tola")
            )
        ),
        Department(
            id = "RACCN",
            name = "Costa Caribe Norte (RACCN)",
            municipalities = listOf(
                Municipality("BILWI", "Bilwi (Puerto Cabezas)"),
                Municipality("BONANZA", "Bonanza"),
                Municipality("MULUKUKU", "Mulukukú"),
                Municipality("PRINZAPOLKA", "Prinzapolka"),
                Municipality("ROSITA", "Rosita"),
                Municipality("SIUNA", "Siuna"),
                Municipality("WASLALA", "Waslala"),
                Municipality("WASPAM", "Waspam")
            )
        ),
        Department(
            id = "RACCS",
            name = "Costa Caribe Sur (RACCS)",
            municipalities = listOf(
                Municipality("BLUEFIELDS", "Bluefields"),
                Municipality("CORN_ISLAND", "Corn Island"),
                Municipality("DESEMBOCADURA_RIO_GRANDE", "Desembocadura de Río Grande"),
                Municipality("EL_AYOTE", "El Ayote"),
                Municipality("EL_RAMA", "El Rama"),
                Municipality("EL_TORTUGUERO", "El Tortuguero"),
                Municipality("KUKRA_HILL", "Kukra Hill"),
                Municipality("LA_CRUZ_DE_RIO_GRANDE", "La Cruz de Río Grande"),
                Municipality("LAGUNA_DE_PERLAS", "Laguna de Perlas"),
                Municipality("MUELLE_DE_LOS_BUEYES", "Muelle de los Bueyes"),
                Municipality("NUEVA_GUINEA", "Nueva Guinea"),
                Municipality("PAIWAS", "Bocana de Paiwas")
            )
        )
    )

    fun getDepartment(departmentId: String?): Department? {
        if (departmentId.isNullOrBlank()) return null
        val clean = departmentId.uppercase().trim()
        return DEPARTMENTS.firstOrNull { it.id == clean }
    }

    fun getMunicipalities(departmentId: String?): List<Municipality> {
        return getDepartment(departmentId)?.municipalities ?: emptyList()
    }

    fun isValidMunicipality(departmentId: String?, municipalityId: String?): Boolean {
        if (departmentId.isNullOrBlank() || municipalityId.isNullOrBlank()) return false
        val cleanMuni = municipalityId.uppercase().trim()
        return getMunicipalities(departmentId).any { it.id == cleanMuni }
    }

    fun normalize(departmentInput: String?, municipalityInput: String?): Pair<String, String> {
        val rawDept = (departmentInput ?: "").trim().uppercase()
        val rawMuni = (municipalityInput ?: "").trim().uppercase()

        var matchedDept = DEPARTMENTS.firstOrNull { it.id == rawDept || it.name.uppercase() == rawDept }
        if (matchedDept == null && rawMuni.isNotBlank()) {
            matchedDept = DEPARTMENTS.firstOrNull { dept ->
                dept.municipalities.any { it.id == rawMuni || it.name.uppercase() == rawMuni }
            }
        }
        val dept = matchedDept ?: getDepartment("MANAGUA")!!
        val muni = dept.municipalities.firstOrNull { it.id == rawMuni || it.name.uppercase() == rawMuni }
            ?: dept.municipalities.firstOrNull { it.id == dept.id }
            ?: dept.municipalities.first()

        return Pair(dept.id, muni.id)
    }
}
