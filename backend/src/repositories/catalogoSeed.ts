import type { DatabaseSync } from 'node:sqlite';

interface SeedPregunta {
  texto: string;
  critica: boolean;
  pistasMock: string[];
}

interface SeedInstruccion {
  texto: string;
  critica: boolean;
}

interface SeedSubcategoria {
  nombre: string;
  etiqueta: string;
  criterio: string;
  preguntas: SeedPregunta[];
  instruccionesPreArribo: SeedInstruccion[];
}

interface SeedCategoria {
  nombre: string;
  etiqueta: string;
  subcategorias: SeedSubcategoria[];
}

export interface SeedCatalogoResult {
  seeded: boolean;
  categorias: number;
  subcategorias: number;
  preguntas: number;
  instruccionesPreArribo: number;
}

export const PREGUNTAS_UNIVERSALES_SEED: readonly SeedPregunta[] = [
  {
    texto: '¿Cuál es la dirección exacta, altura o intersección del incidente?',
    critica: true,
    pistasMock: [
      'av.',
      'avenida',
      'calle',
      'esquina',
      'casi',
      'entre',
      'al ',
      'autopista',
      'km',
      'plaza',
      'estacion',
    ],
  },
  {
    texto:
      '¿Usted o las personas cercanas se encuentran en un lugar seguro en este momento?',
    critica: true,
    pistasMock: [
      'salio corriendo',
      'evacuacion',
      'evacuando',
      'patio abierto',
      'vereda de enfrente',
      'lugar seguro',
      'techos',
      'atrapado',
      'atrapada',
      'adentro',
    ],
  },
];

export const CATALOGO_CATEGORIAS_SEED: readonly SeedCategoria[] = [
  {
    nombre: 'INCENDIO_RESCATE',
    etiqueta: 'Incendio y Rescate',
    subcategorias: [
      {
        nombre: 'incendio_estructural',
        etiqueta: 'Incendio estructural',
        criterio:
          'Fuego o humo en vivienda, comercio gastronómico, local o edificio.',
        preguntas: [
          {
            texto: '¿Hay personas atrapadas en el interior?',
            critica: true,
            pistasMock: [
              'atrapad',
              'quedo adentro',
              'adentro quedo',
              'no puede salir',
              'salio corriendo',
            ],
          },
          {
            texto: '¿Hay garrafas o cañería de gas activa?',
            critica: true,
            pistasMock: ['garrafa', 'gas', 'llave de gas', 'cocina', 'campana'],
          },
          {
            texto: '¿El humo o el fuego afecta a inmuebles linderos o pisos superiores?',
            critica: false,
            pistasMock: [
              'lindero',
              'piso superior',
              'pisos superiores',
              'edificio',
              'salon',
              'humo negro',
            ],
          },
        ],
        instruccionesPreArribo: [
          {
            texto: 'No reingresar al local o vivienda por ningún motivo.',
            critica: true,
          },
          {
            texto:
              'Mantener a las personas en la vereda de enfrente y cortar la llave de gas solo si es seguro.',
            critica: true,
          },
          {
            texto: 'Cerrar puertas al salir para retardar la propagación del humo.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'incendio_electrico_litio',
        etiqueta: 'Incendio eléctrico o baterías de litio',
        criterio:
          'Fuego, chispas o explosión en tableros eléctricos, subestaciones transformadoras o baterías de litio.',
        preguntas: [
          {
            texto: '¿El edificio o sector cuenta con corte general de energía exterior?',
            critica: true,
            pistasMock: ['corte de luz', 'corto la luz', 'corte general', 'trifasica', 'apagon'],
          },
          {
            texto: '¿Se realizó la evacuación completa hacia un espacio abierto?',
            critica: true,
            pistasMock: ['evacuacion', 'evacuado', 'patio abierto', 'salieron', 'chicos'],
          },
          {
            texto: '¿Hay llamas abiertas o humo tóxico invadiendo la vía de escape?',
            critica: true,
            pistasMock: [
              'llamarada',
              'humo blanco',
              'humo negro',
              'humo gris',
              'chispas',
              'aceite quemado',
            ],
          },
          {
            texto: '¿Hay personas con quemaduras o inhalación de vapores?',
            critica: false,
            pistasMock: ['quemadura', 'no se puede respirar', 'heridos', 'intoxic'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'PROHIBIDO arrojar agua bajo ninguna circunstancia sobre tableros, aceite dieléctrico o baterías de litio.',
            critica: true,
          },
          {
            texto:
              'Evacuar inmediatamente el sector a al menos 50 metros y mantener puertas/persianas cerradas si es seguro.',
            critica: true,
          },
          {
            texto:
              'Utilizar únicamente matafuego clase C (CO2 o polvo químico) si no hay riesgo de explosión ni humo denso.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'incendio_via_publica_pastizal',
        etiqueta: 'Incendio en vía pública o pastizales',
        criterio:
          'Fuego en contenedores de residuos, vehículos estacionados, pastizales o parques públicos.',
        preguntas: [
          {
            texto: '¿Hay vehículos linderos, árboles o viviendas en riesgo de propagación?',
            critica: true,
            pistasMock: [
              'auto estacionado',
              'vehiculo',
              'optica',
              'arboles',
              'juegos infantiles',
              'viviendas',
            ],
          },
          {
            texto: '¿Hacia qué sector avanza el fuego o sopla el viento?',
            critica: false,
            pistasMock: ['avanza hacia', 'viento', 'sector', 'hacia'],
          },
          {
            texto: '¿El humo invade calzadas o afecta la visibilidad del tránsito?',
            critica: false,
            pistasMock: ['humo', 'avenida', 'transito', 'cables aereos'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Alejarse del fuego y de vehículos cercanos por riesgo de explosión del tanque de combustible.',
            critica: true,
          },
          {
            texto:
              'Evacuar sectores recreativos y ubicarse a favor del viento para evitar inhalar humo tóxico.',
            critica: true,
          },
          {
            texto: 'No intentar apagar contenedores con agua si se desconoce su contenido.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'rescate_ascensor',
        etiqueta: 'Rescate en ascensor o espacio confinado',
        criterio:
          'Personas atrapadas en ascensor detenido o espacio confinado sin incendio activo.',
        preguntas: [
          {
            texto: '¿Cuántas personas están atrapadas y hay menores, embarazadas o ancianos?',
            critica: true,
            pistasMock: ['personas adentro', 'embarazada', 'nene', 'menor', 'cuatro'],
          },
          {
            texto: '¿Alguna persona presenta síntomas de asfixia, pánico o descompensación?',
            critica: true,
            pistasMock: ['panico', 'asfixia', 'descomp', 'sin luz', 'corto la luz'],
          },
          {
            texto: '¿Entre qué pisos quedó detenida la cabina y si está desnivelada?',
            critica: false,
            pistasMock: ['entre los pisos', 'pisos', 'desnivel', 'trabo el ascensor'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'No intentar forzar las puertas exteriores ni activar maniobras manuales sin personal técnico o bomberos.',
            critica: true,
          },
          {
            texto:
              'Hablar con los ocupantes desde el piso más cercano para transmitir calma e indicarles que permanezcan sentados.',
            critica: true,
          },
        ],
      },
      {
        nombre: 'derrame_materiales_peligrosos',
        etiqueta: 'Derrame de combustible o sustancias peligrosas',
        criterio:
          'Fuga o derrame de hidrocarburos, químicos o cargas peligrosas en calzada o predios.',
        preguntas: [
          {
            texto: '¿Qué sustancia se derrama y existe presencia de fuego o chispas?',
            critica: true,
            pistasMock: ['gasoil', 'nafta', 'combustible', 'no hay fuego', 'olor'],
          },
          {
            texto: '¿El líquido está ingresando a desagües pluviales o cursos de agua?',
            critica: true,
            pistasMock: ['cordon cuneta', 'desague', 'pluvial', 'chorros'],
          },
          {
            texto: '¿El conductor o personal logró salir del área de riesgo?',
            critica: false,
            pistasMock: ['conductor', 'chofer', 'cabina', 'autos pasando'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Alejar a todas las personas y cortar la circulación a al menos 100 metros del derrame.',
            critica: true,
          },
          {
            texto:
              'Prohibido encender cigarrillos, motores o fuentes de calor a menos de 50 metros.',
            critica: true,
          },
        ],
      },
    ],
  },
  {
    nombre: 'ACCIDENTE_VIAL',
    etiqueta: 'Accidente Vial',
    subcategorias: [
      {
        nombre: 'vial_moto_ciclista',
        etiqueta: 'Siniestro con moto, bicicleta o monopatín',
        criterio:
          'Colisión que involucra motocicleta, bicicleta, monopatín o peatón en calzada o ciclovía.',
        preguntas: [
          {
            texto: '¿La víctima está consciente, respira y responde al diálogo?',
            critica: true,
            pistasMock: ['consciente', 'no se mueve', 'respira', 'responde', 'dolor'],
          },
          {
            texto: '¿Lleva el casco colocado o quedó atrapada debajo de un vehículo?',
            critica: true,
            pistasMock: ['casco', 'debajo del estribo', 'atrapad', 'volo'],
          },
          {
            texto: '¿Hay sangrado activo profuso o pérdida de combustible en el asfalto?',
            critica: false,
            pistasMock: ['sangrado', 'fracturada', 'pierna', 'combustible'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'BAJO NINGUNA CIRCUNSTANCIA retire el casco ni mueva a la víctima del asfalto.',
            critica: true,
          },
          {
            texto:
              'Si hay un vehículo involucrado, ordenar apagar el motor y colocar freno de mano de inmediato.',
            critica: true,
          },
          {
            texto: 'Señalizar o balizar el carril para evitar un segundo atropello.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'vial_colision_multiple_vuelco',
        etiqueta: 'Choque múltiple o vuelco vehicular',
        criterio:
          'Colisión en cadena, choque en autopista o vuelco con posibles personas atrapadas.',
        preguntas: [
          {
            texto: '¿Hay personas atrapadas en los habitáculos o inconscientes?',
            critica: true,
            pistasMock: [
              'atrapado',
              'cinturon',
              'no puede abrir',
              'mareada',
              'inconsciente',
            ],
          },
          {
            texto: '¿Se observa humo, fuego o pérdida de combustible en los vehículos?',
            critica: true,
            pistasMock: ['humo saliendo', 'motor', 'nafta', 'combustible'],
          },
          {
            texto: '¿Cuántos vehículos están involucrados y cuántos carriles quedaron bloqueados?',
            critica: false,
            pistasMock: ['tres autos', 'utilitaria', 'carril rapido', 'zanja', 'volcado'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'No tirar violentamente de ocupantes atrapados para evitar lesiones cervicales.',
            critica: true,
          },
          {
            texto:
              'Los ocupantes que puedan caminar deben cruzar hacia la banquina protegida fuera de la calzada.',
            critica: true,
          },
          {
            texto:
              'Apagar el contacto del vehículo volcado solo si puede hacerse de forma segura.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'vial_obstruccion_vehiculo_pesado',
        etiqueta: 'Obstrucción vial por vehículo pesado',
        criterio:
          'Camión atascado en bajo viaducto, carga caída u obstrucción grave sin heridos graves.',
        preguntas: [
          {
            texto: '¿Hay heridos en la cabina o peatones alcanzados?',
            critica: true,
            pistasMock: ['heridos', 'chofer', 'cabina', 'peatones'],
          },
          {
            texto: '¿Se observa daño estructural en puente o vías ferroviarias?',
            critica: true,
            pistasMock: ['bajo puente', 'vias', 'cartel', 'encajado', 'tren'],
          },
          {
            texto: '¿El tránsito quedó totalmente bloqueado y hay derrame de carga?',
            critica: false,
            pistasMock: ['trabando', 'circulacion', 'carga', 'acoplado'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'No intentar remolcar el vehículo pesado sin presencia técnica o de tránsito.',
            critica: true,
          },
          {
            texto:
              'Mantener al chofer fuera de la cabina en zona segura mientras se evalúa la estructura.',
            critica: false,
          },
        ],
      },
    ],
  },
  {
    nombre: 'EMERGENCIA_MEDICA',
    etiqueta: 'Emergencia Médica',
    subcategorias: [
      {
        nombre: 'medica_respiratoria_anafilaxia',
        etiqueta: 'Dificultad respiratoria aguda o anafilaxia',
        criterio:
          'Crisis asmática grave, broncoespasmo refractario, edema de glotis o reacción alérgica severa.',
        preguntas: [
          {
            texto: '¿El paciente puede hablar o emitir sonidos y presenta labios morados o hinchazón facial?',
            critica: true,
            pistasMock: [
              'no le entra el aire',
              'labios morados',
              'tiraje',
              'cerrando la garganta',
              'hinchada',
              'no puede tragar',
            ],
          },
          {
            texto: '¿Cuenta con autoinyector de adrenalina (EpiPen) o medicación broncodilatadora aplicada?',
            critica: true,
            pistasMock: ['salbutamol', 'disparos', 'epipen', 'adrenalina', 'alergico'],
          },
          {
            texto: '¿Presenta mareos, desmayo o antecedentes de internación previa?',
            critica: false,
            pistasMock: ['mareo', 'desmayo', 'broncoespasmo', 'nueces'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Sentar al paciente erguido e inclinado hacia adelante para facilitar la entrada de aire. NUNCA acostarlo.',
            critica: true,
          },
          {
            texto:
              'Si cuenta con autoinyector de epinefrina para anafilaxia, aplicarlo de inmediato en la cara externa del muslo.',
            critica: true,
          },
          {
            texto: 'Mantener ambiente ventilado con aire fresco y aflojar ropa del cuello.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'medica_sincope_descompensacion',
        etiqueta: 'Síncope, lipotimia o golpe de calor',
        criterio:
          'Desmayo, hipotensión, sudoración fría o descompensación por calor con recuperación parcial.',
        preguntas: [
          {
            texto: '¿La persona recuperó la conciencia y habla de manera coherente?',
            critica: true,
            pistasMock: ['desmayo', 'recupero la conciencia', 'habla', 'blanca', 'transpira frio'],
          },
          {
            texto: '¿Sufrió golpe en la cabeza al caer o refiere dolor en el pecho?',
            critica: true,
            pistasMock: ['golpe', 'pecho', 'no siente las piernas', 'anden', 'calor'],
          },
          {
            texto: '¿Tiene antecedentes cardíacos, diabetes o puede mover ambos brazos?',
            critica: false,
            pistasMock: ['antecedentes', 'diabetes', 'brazos'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Recostar a la persona boca arriba y elevarle las piernas 30 cm sobre el nivel del suelo.',
            critica: true,
          },
          {
            texto:
              'Aflojar ropa ajustada en cuello y cintura y no suministrar líquidos mientras no esté totalmente lúcida.',
            critica: true,
          },
        ],
      },
      {
        nombre: 'medica_trauma_fractura_caida',
        etiqueta: 'Traumatismo, caída o fractura',
        criterio:
          'Caída en adulto mayor, fractura expuesta o traumatismo severo de extremidades.',
        preguntas: [
          {
            texto: '¿El paciente está consciente y perdió el conocimiento en algún momento?',
            critica: true,
            pistasMock: ['llora de dolor', 'gritando', 'consciente', 'tropezo', 'choco'],
          },
          {
            texto: '¿Hay hueso expuesto, deformidad evidente o sangrado pulsátil?',
            critica: true,
            pistasMock: ['fractura expuesta', 'hueso asomando', 'sangrando', 'cadera'],
          },
          {
            texto: '¿La extremidad afectada conserva sensibilidad o toma anticoagulantes?',
            critica: false,
            pistasMock: ['no se puede incorporar', 'anticoagulante', 'tibia', 'perone'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'No intentar parar, sentar ni alinear o enderezar la extremidad lesionada.',
            critica: true,
          },
          {
            texto:
              'Si hay fractura expuesta, cubrir con paño limpio sin presionar directamente sobre el hueso.',
            critica: true,
          },
          {
            texto: 'Abrigar al paciente para prevenir hipotermia por contacto con el suelo.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'medica_convulsion',
        etiqueta: 'Crisis convulsiva activa',
        criterio:
          'Convulsión tónico-clónica, pérdida de conciencia con sacudidas o estatus epiléptico.',
        preguntas: [
          {
            texto: '¿La crisis sigue activa y cuánto tiempo lleva desde que comenzó?',
            critica: true,
            pistasMock: ['convulsionando', 'sacudidas', 'espuma', 'temblar', 'no responde'],
          },
          {
            texto: '¿Tiene la cabeza protegida contra golpes y se evitó introducir objetos en la boca?',
            critica: true,
            pistasMock: ['cayo de la silla', 'piso', 'boca', 'cabeza'],
          },
          {
            texto: '¿Sufrió traumatismo craneal al caer?',
            critica: false,
            pistasMock: ['golpe', 'silla', 'mesa'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'NUNCA introduzca dedos ni ningún objeto dentro de la boca durante una convulsión.',
            critica: true,
          },
          {
            texto:
              'Despejar objetos alrededor y colocar algo blando debajo de la cabeza para evitar golpes.',
            critica: true,
          },
          {
            texto:
              'Al ceder las sacudidas, colocar a la persona de costado en posición lateral de seguridad.',
            critica: false,
          },
        ],
      },
    ],
  },
  {
    nombre: 'DEFENSA_CIVIL',
    etiqueta: 'Defensa Civil',
    subcategorias: [
      {
        nombre: 'dc_fuga_gas',
        etiqueta: 'Fuga de gas en vía pública o edificio',
        criterio:
          'Rotura de cañería de gas, soplido de alta presión u olor intenso ingresando a viviendas.',
        preguntas: [
          {
            texto: '¿La fuga continúa sonando a alta presión y afecta viviendas linderas?',
            critica: true,
            pistasMock: ['soplido', 'olor a gas', 'zanja', 'picando', 'casas'],
          },
          {
            texto: '¿Los vecinos iniciaron evacuación y se apagaron fuentes de ignición?',
            critica: true,
            pistasMock: ['evacuacion', 'cuadrilla', 'bares', 'cocinas'],
          },
          {
            texto: '¿Se trata de rotura por obra en vereda o instalación interna?',
            critica: false,
            pistasMock: ['fibra optica', 'vereda', 'cano de gas'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Evacuar inmediatamente a 100 metros en dirección contraria al viento.',
            critica: true,
          },
          {
            texto:
              'PROHIBIDO fumar, arrancar motores, encender llaves de luz o tocar timbres en el área.',
            critica: true,
          },
        ],
      },
      {
        nombre: 'dc_colapso_estructura_arbolado',
        etiqueta: 'Colapso estructural o caída de árbol',
        criterio:
          'Árbol caído de gran porte, desprendimiento de marquesina o derrumbe de medianera.',
        preguntas: [
          {
            texto: '¿Hay personas atrapadas, lesionadas o dentro de vehículos aplastados?',
            critica: true,
            pistasMock: ['aplasto', 'no habia nadie', 'camionetas', 'vereda'],
          },
          {
            texto: '¿Involucra cables de energía eléctrica caídos o cañerías de gas?',
            critica: true,
            pistasMock: ['cables', 'media tension', 'enganchada', 'canerias'],
          },
          {
            texto: '¿Persiste riesgo de desmoronamiento o caída sobre la acera/calzada?',
            critica: false,
            pistasMock: [
              'marquesina',
              'balanceandose',
              'perno',
              'medianera',
              'ladrillos colgando',
              'calzada',
            ],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Interrumpir el paso peatonal y mantener un perímetro mínimo de 20 metros.',
            critica: true,
          },
          {
            texto:
              'Considerar todo cable caído como energizado con riesgo mortal aunque no haga chispas.',
            critica: true,
          },
          {
            texto:
              'Prohibir el acceso a patios o balcones linderos si hubo derrumbe de mampostería.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'dc_anegamiento_inundacion',
        etiqueta: 'Anegamiento o inundación por temporal',
        criterio:
          'Bajo viaducto o arteria anegada con vehículos varados y riesgo de arrastre.',
        preguntas: [
          {
            texto: '¿Cuántas personas hay varadas y alguna es anciana, menor o presenta hipotermia?',
            critica: true,
            pistasMock: ['techos', 'conductores', 'tres autos', 'esperando rescate'],
          },
          {
            texto: '¿El nivel del agua sigue ascendiendo o hay corriente rápida?',
            critica: true,
            pistasMock: ['inundo', 'mitad de las puertas', 'bajo nivel', 'agua'],
          },
          {
            texto: '¿El paso vehicular se encuentra interrumpido?',
            critica: false,
            pistasMock: ['viaducto', 'intentaron cruzar', 'pararon los motores'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Permanecer sobre los techos de los vehículos y no lanzarse a nadar por riesgo de sumideros abiertos.',
            critica: true,
          },
          {
            texto: 'No intentar cruzar sectores anegados a pie ni con otros rodados.',
            critica: true,
          },
        ],
      },
    ],
  },
  {
    nombre: 'SERVICIOS_PUBLICOS',
    etiqueta: 'Servicios Públicos',
    subcategorias: [
      {
        nombre: 'sp_riesgo_electrico_via_publica',
        etiqueta: 'Cables cortados o riesgo eléctrico en vía pública',
        criterio:
          'Postes arrancados, cables caídos chispeando o tensión en pavimento húmedo.',
        preguntas: [
          {
            texto: '¿Hay chispas, llamas o humo activo en el cable o el suelo?',
            critica: true,
            pistasMock: ['chispeando', 'humo saliendo', 'cable grueso', 'postes'],
          },
          {
            texto: '¿Existe agua o charcos sobre la vereda o calzada en contacto con el tendido?',
            critica: true,
            pistasMock: ['asfalto mojado', 'mojado', 'agua', 'vereda'],
          },
          {
            texto: '¿El vehículo causante permanece en el lugar o hay peatones próximos?',
            critica: false,
            pistasMock: ['camion de mudanzas', 'engancho', 'comercios'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Mantenerse a más de 15 metros de distancia y prohibir pisar charcos en toda la cuadra.',
            critica: true,
          },
          {
            texto: 'No tocar postes metálicos ni intentar apartar cables con ningún elemento.',
            critica: true,
          },
        ],
      },
      {
        nombre: 'sp_rotura_agua_socavon',
        etiqueta: 'Rotura de caño maestro o socavón en calzada',
        criterio:
          'Hundimiento de pavimento, fuga de agua potable a presión o ingreso a subsuelos.',
        preguntas: [
          {
            texto: '¿El agua ingresa a subsuelos con tableros o transformadores eléctricos?',
            critica: true,
            pistasMock: ['subsuelos', 'garaje', 'entrando agua', 'chorro de agua'],
          },
          {
            texto: '¿El socavón sigue ensanchándose o hay vehículos caídos adentro?',
            critica: true,
            pistasMock: ['pozo', 'metros de diametro', 'colectivo', 'fosa'],
          },
          {
            texto: '¿Está afectado el carril exclusivo o la circulación de transporte público?',
            critica: false,
            pistasMock: ['metrobus', 'avenida inundada', 'vereda'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Cortar la electricidad general de los subsuelos antes de que el agua alcance tableros y no descender a pie.',
            critica: true,
          },
          {
            texto:
              'No aproximarse al borde del socavón por riesgo de desmoronamiento de la losa asfáltica.',
            critica: true,
          },
        ],
      },
      {
        nombre: 'sp_semaforizacion_infraestructura',
        etiqueta: 'Semaforización o infraestructura urbana',
        criterio:
          'Semáforos apagados en cruce de avenidas, alumbrado o reclamos de infraestructura urbana (P3/P4).',
        preguntas: [
          {
            texto: '¿Hubo colisiones o heridos en el cruce hasta el momento?',
            critica: true,
            pistasMock: ['atropellan', 'colision', 'heridos', 'casi'],
          },
          {
            texto: '¿Los semáforos están totalmente apagados o titilando en amarillo?',
            critica: false,
            pistasMock: ['apago', 'bateria de semaforos', 'hace 40 minutos'],
          },
          {
            texto: '¿Hay presencia de agentes de tránsito o cercanía a escuelas?',
            critica: false,
            pistasMock: ['maestras', 'escuela', 'colectivos', 'camiones'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Aconsejar a los peatones cruzar por esquinas previas donde la señalización funcione.',
            critica: false,
          },
          {
            texto: 'Evitar ordenar el tránsito manualmente sin chaleco ni habilitación vial.',
            critica: true,
          },
        ],
      },
    ],
  },
  {
    nombre: 'CONVIVENCIA_SEGURIDAD',
    etiqueta: 'Convivencia y Seguridad',
    subcategorias: [
      {
        nombre: 'seg_disturbio_violencia',
        etiqueta: 'Disturbio, riña o amenaza en vía pública',
        criterio:
          'Pelea colectiva, agresión física, amenaza o daño a propiedad comercial.',
        preguntas: [
          {
            texto: '¿Se observan armas blancas o armas de fuego?',
            critica: true,
            pistasMock: ['armas', 'cuchillo', 'pistola', 'botellas', 'sillas'],
          },
          {
            texto: '¿Hay personas inconscientes o con heridas de gravedad en el lugar?',
            critica: true,
            pistasMock: ['raspon', 'herido', 'inconsciente', 'brazo'],
          },
          {
            texto: '¿Los involucrados continúan en el lugar o hacia dónde se dispersan?',
            critica: false,
            pistasMock: ['pelea', 'jovenes', 'vidriera', 'plaza'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'Resguardarse dentro de un local o sitio seguro y no intervenir físicamente en la disputa.',
            critica: true,
          },
          {
            texto: 'Mantener distancia visual segura sin confrontar a los agresores.',
            critica: false,
          },
        ],
      },
      {
        nombre: 'seg_animal_peligroso',
        etiqueta: 'Animal agresivo o suelto en espacio público',
        criterio:
          'Canino agresivo suelto sin dueño, ataque a personas u otros animales en plazas.',
        preguntas: [
          {
            texto: '¿Hay personas mordidas o heridas en este momento?',
            critica: true,
            pistasMock: ['ataco', 'mordio', 'heridas', 'perrito'],
          },
          {
            texto: '¿El animal está contenido dentro de un canil o suelto en el espacio abierto?',
            critica: true,
            pistasMock: ['canil', 'suelto', 'sin bozal', 'sin correa', 'plaza'],
          },
          {
            texto: '¿Tiene collar identificatorio o permanece algún responsable cerca?',
            critica: false,
            pistasMock: ['duenos se fueron', 'dogo', 'pitbull', 'grunendo'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto:
              'No mirar fijamente al animal ni realizar movimientos bruscos; alejar a niños y mascotas.',
            critica: true,
          },
          {
            texto:
              'Trabar la puerta exterior del canil desde afuera únicamente si puede hacerse sin riesgo.',
            critica: false,
          },
        ],
      },
    ],
  },
  {
    nombre: 'OTRO',
    etiqueta: 'Otro / Consulta General',
    subcategorias: [
      {
        nombre: 'general_otro',
        etiqueta: 'Incidente general o consulta administrativa',
        criterio:
          'Respaldo para incidentes fuera de las tipologías anteriores o consultas administrativas de prioridad baja (P4).',
        preguntas: [
          {
            texto: '¿Cuál es el motivo principal del llamado y requiere asistencia presencial?',
            critica: true,
            pistasMock: ['consulta', 'reclamo', 'informacion', 'reporto'],
          },
          {
            texto: '¿Existe algún riesgo inmediato para personas o bienes en el lugar?',
            critica: false,
            pistasMock: ['riesgo', 'peligro', 'heridos', 'urgente'],
          },
        ],
        instruccionesPreArribo: [
          {
            texto: 'Mantener la calma y permanecer en zona segura ante cualquier cambio de situación.',
            critica: false,
          },
          {
            texto: 'Volver a comunicarse de inmediato si surge riesgo físico o agravamiento.',
            critica: false,
          },
        ],
      },
    ],
  },
];

interface CountRow {
  total: number;
}

function readCount(db: DatabaseSync, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as
    | CountRow
    | undefined;
  return Number(row?.total ?? 0);
}

/**
 * Siembra el catálogo normalizado de protocolos cuando `categorias` está vacía.
 */
export function seedCatalogoProtocolos(db: DatabaseSync): SeedCatalogoResult {
  const categoriasExistentes = readCount(db, 'categorias');
  if (categoriasExistentes > 0) {
    return {
      seeded: false,
      categorias: categoriasExistentes,
      subcategorias: readCount(db, 'subcategorias'),
      preguntas: readCount(db, 'preguntas_protocolo'),
      instruccionesPreArribo: readCount(db, 'instrucciones_prearribo_protocolo'),
    };
  }

  let categoriasCount = 0;
  let subcategoriasCount = 0;
  let preguntasCount = 0;
  let instruccionesCount = 0;

  db.exec('BEGIN IMMEDIATE;');
  try {
    const insertCategoria = db.prepare(
      'INSERT INTO categorias (nombre, etiqueta) VALUES (?, ?)',
    );
    const insertSubcategoria = db.prepare(
      'INSERT INTO subcategorias (categoria_id, nombre, etiqueta, criterio) VALUES (?, ?, ?, ?)',
    );
    const insertPregunta = db.prepare(
      'INSERT INTO preguntas_protocolo (subcategoria_id, texto, critica, pistas_mock_json) VALUES (?, ?, ?, ?)',
    );
    const insertInstruccion = db.prepare(
      'INSERT INTO instrucciones_prearribo_protocolo (subcategoria_id, texto, critica) VALUES (?, ?, ?)',
    );

    for (const universal of PREGUNTAS_UNIVERSALES_SEED) {
      insertPregunta.run(
        null,
        universal.texto,
        universal.critica ? 1 : 0,
        JSON.stringify(universal.pistasMock),
      );
      preguntasCount += 1;
    }

    for (const categoria of CATALOGO_CATEGORIAS_SEED) {
      const catResult = insertCategoria.run(categoria.nombre, categoria.etiqueta);
      const categoriaId = Number(catResult.lastInsertRowid);
      categoriasCount += 1;

      for (const sub of categoria.subcategorias) {
        const subResult = insertSubcategoria.run(
          categoriaId,
          sub.nombre,
          sub.etiqueta,
          sub.criterio,
        );
        const subcategoriaId = Number(subResult.lastInsertRowid);
        subcategoriasCount += 1;

        for (const pregunta of sub.preguntas) {
          insertPregunta.run(
            subcategoriaId,
            pregunta.texto,
            pregunta.critica ? 1 : 0,
            JSON.stringify(pregunta.pistasMock),
          );
          preguntasCount += 1;
        }

        for (const instruccion of sub.instruccionesPreArribo) {
          insertInstruccion.run(
            subcategoriaId,
            instruccion.texto,
            instruccion.critica ? 1 : 0,
          );
          instruccionesCount += 1;
        }
      }
    }

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  return {
    seeded: true,
    categorias: categoriasCount,
    subcategorias: subcategoriasCount,
    preguntas: preguntasCount,
    instruccionesPreArribo: instruccionesCount,
  };
}
