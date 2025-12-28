
import { Product, Till, StaffMember, VehicleCompartment } from './types';

export const TILLS: Till[] = [
    { id: 'TA', name: 'Cassa TA', shift: 'a' },
    { id: 'TB', name: 'Cassa TB', shift: 'b' },
    { id: 'TC', name: 'Cassa TC', shift: 'c' },
    { id: 'TD', name: 'Cassa TD', shift: 'd' },
];

// Dati iniziali per i prodotti
export const INITIAL_MENU_ITEMS: Product[] = [
    {
        id: 'prod-1',
        name: 'Caffè Espresso',
        price: 1.10,
        category: 'Caffetteria',
        description: 'Caffè espresso classico',
        stock: 100,
        isFavorite: true,
        icon: '☕',
        costPrice: 0.20
    },
    {
        id: 'prod-2',
        name: 'Cappuccino',
        price: 1.50,
        category: 'Caffetteria',
        description: 'Cappuccino con latte fresco',
        stock: 50,
        isFavorite: true,
        icon: '🥛',
        costPrice: 0.35
    },
    {
        id: 'prod-3',
        name: 'Cornetto',
        price: 1.20,
        category: 'Pasticceria',
        description: 'Cornetto vuoto o farcito',
        stock: 80,
        isFavorite: false,
        icon: '🥐',
        costPrice: 0.40
    }
];

// Dati iniziali per il personale con emoji
export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
    { id: 'staff-1', name: 'Mario Rossi', shift: 'a', rcSubGroup: 1, icon: '👨‍🍳' },
    { id: 'staff-2', name: 'Laura Bianchi', shift: 'b', rcSubGroup: 1, icon: '👩‍💼' },
    { id: 'staff-3', name: 'Paolo Verdi', shift: 'c', rcSubGroup: 1, icon: '👨‍💻' },
    { id: 'staff-4', name: 'Anna Neri', shift: 'd', rcSubGroup: 1, icon: '👩‍🎨' },
];

// Configurazione Gradi VVF
export const VVF_GRADES = [
    { id: 'VIG', label: 'Vigile del Fuoco', short: 'VIG', type: 'chevron', count: 1 },
    { id: 'VE', label: 'Vigile Esperto', short: 'VE', type: 'chevron', count: 2 },
    { id: 'VESC', label: 'Vigile Esp. Scatto', short: 'VESC', type: 'chevron', count: 2 },
    { id: 'VC', label: 'Vigile Coord.', short: 'VC', type: 'chevron', count: 3 },
    { id: 'VCSC', label: 'Vigile Coord. Scatto', short: 'VCSC', type: 'chevron', count: 3 },
    { id: 'CS', label: 'Capo Squadra', short: 'CS', type: 'bar', count: 1 },
    { id: 'CQE', label: 'Capo Squadra Esp.', short: 'CQE', type: 'bar', count: 2 },
    { id: 'CR', label: 'Capo Reparto', short: 'CR', type: 'bar', count: 3 },
    { id: 'CRE', label: 'Capo Reparto Esp.', short: 'CRE', type: 'bar', count: 3 },
];

// Tipologie Intervento Standard
export const DEFAULT_INTERVENTION_TYPES = [
    "Intervento non più Necessario",
    "Allagamento",
    "Apertura Porta",
    "Ascensore Bloccato",
    "Bonifica Nido Insetti",
    "Caduta Pianta",
    "Crollo Tetto",
    "Danni D'Acqua",
    "Dissesto Statico",
    "Fuga Gas",
    "Gronda Pericolante",
    "Incendio Appartamento",
    "Incendio Autovettura",
    "Incendio Bosco",
    "Incendio Canna Fumaria",
    "Incendio Cantina",
    "Incendio Capanno Agricolo",
    "Incendio Cassonetto",
    "Incendio Generale",
    "Incendio Fabbrica",
    "Incendio Rotoballe",
    "Incendio Tetto",
    "Incendio Sterpaglie",
    "Monitoraggio Sostanze Pericolose",
    "Incidente Stradale",
    "Incidente Aeromobile",
    "Infiltrazioni Acqua",
    "Ingombro sede stradale",
    "Inquinamento acque superficiali o di falda",
    "Lavaggio sede stradale",
    "Muro Pericolante",
    "Palo Pericolante",
    "Pianta Pericolante",
    "Rami Pericolanti",
    "Recupero Beni",
    "Recupero Veicoli e Merci",
    "Recupero Salma",
    "Ricerca Persona",
    "Rimozione Ostacoli",
    "Salvataggio Animali",
    "Servizio Assistenza",
    "Soccorso a Persona",
    "Smottamento",
    "Tegole Pericolanti",
    "Verifica Allarme",
    "Verifica esalazioni monossido",
    "Verifica Incendio",
    "Verifica Stabilità"
];

// Standard Loadout APS VF 30217
export const APS_VF30217_LOADOUT: Omit<VehicleCompartment, 'id'>[] = [
    {
        name: "ANTERIORE CABINA",
        items: [
            { id: '1', name: "TELEPAS n. 0617851480", quantity: 1 },
            { id: '2', name: "PALETTA SEGNALAZIONE N.13720", quantity: 1 },
            { id: '3', name: "LIBRETTO CIRCOLAZIONE", quantity: 1 },
            { id: '4', name: "COPIA CERTIFICATO ASSICURAZIONE + CID VVF", quantity: 1 },
            { id: '5', name: "COPIA CERTIFICATO REVISIONE", quantity: 1 },
            { id: '6', name: "RADIO VEICOLARE", quantity: 1 }
        ]
    },
    {
        name: "POSTERIORE CABINA",
        items: [
            { id: '7', name: "KIT IGIENICO", quantity: 1 },
            { id: '8', name: "VALIGETTA NERA RILEVATORI (Altair 4X/4XR, Rados, Sewerin)", quantity: 1 },
            { id: '9', name: "TERMOCAMERA CON BATT. DI SCORTA", quantity: 1 },
            { id: '10', name: "CUNEI IN PVC (2 COPPIE)", quantity: 4 },
            { id: '11', name: "SACCA VVF RADIO PER MASCHERE BLUETOOTH", quantity: 1 },
            { id: '12', name: "SACCA VVF CON 5 RADIO FFSS", quantity: 1 },
            { id: '13', name: "SACCA VVF CON 2 RADIO VVF + RADIO AIB", quantity: 1 },
            { id: '14', name: "BORSA NERA CON GPS + NAVIGATORE AUTO", quantity: 1 },
            { id: '15', name: "LASTRE PER APERTURA PORTA", quantity: 10 },
            { id: '16', name: "RACCOGLITORE SOSTANZE PERICOLOSE", quantity: 1 },
            { id: '17', name: "TANICA IPOCLORITO DA RIEMPIRE CON ACQUA", quantity: 1 },
            { id: '18', name: "ROTOLO PELLICOLA", quantity: 1 },
            { id: '19', name: "CONFEZIONE GUANTI MONOUSO", quantity: 1 },
            { id: '20', name: "ROTOLO CARTA", quantity: 1 },
            { id: '21', name: "SCATOLA IN FERRO CON DOSIMETRI", quantity: 1 },
            { id: '22', name: "PUMP WEDGE (POMPETTA APERTURA PORTIERE)", quantity: 1 },
            { id: '23', name: "SALVAGENTE", quantity: 1 },
            { id: '24', name: "MASCHERE PER AUTORESPIRATORE", quantity: 5 },
            { id: '25', name: "CAPPUCCIO SECONDA UTENZA", quantity: 1 },
            { id: '26', name: "EROGATORE A PRESSIONE PER IPOCLORITO", quantity: 1 },
            { id: '27', name: "D A E", quantity: 1 },
            { id: '28', name: "AUTORESPIRATORI", quantity: 4 },
            { id: '29', name: "SACCHI PLASTICA PER AUTORESPIRATORI CONTAMINATI", quantity: 1 },
            { id: '30', name: "ATTREZZO APRIVEICOLI + FIL DI FERRO", quantity: 1 },
            { id: '31', name: "ATTREZZO INTONACI + PROLUNGA ASTA", quantity: 1 },
            { id: '32', name: "ATTREZZO CATTURA ANIMALI", quantity: 1 },
            { id: '33', name: "CORDINI", quantity: 2 },
            { id: '34', name: "TROUSSE ATTREZZI DEL MEZZO", quantity: 1 },
            { id: '35', name: "STRADARIO", quantity: 1 },
            { id: '36', name: "TABELLA TRATTO COMPETENZA A1", quantity: 1 },
            { id: '37', name: "GEL IGIENIZZANTE MANI", quantity: 1 },
            { id: '38', name: "AUTORESPIRATORE (Extra)", quantity: 1 },
            { id: '39', name: "CHIAVI A1", quantity: 1 },
            { id: '40', name: "CHIAVI ASCENSORI", quantity: 1 },
            { id: '41', name: "CHIAVI IDRANTI", quantity: 1 },
            { id: '42', name: "LAMPADE LED (SILMP 067-074)", quantity: 2 },
            { id: '43', name: "RACCOGLITORE CON MODULISTICA", quantity: 1 },
            { id: '44', name: "RACCOLTA CARTE GEOGRAFICHE TERRITORIO", quantity: 1 },
            { id: '45', name: "CODICE CANCELLI A1", quantity: 1 }
        ]
    },
    {
        name: "SOTTO SEDILE POSTERIORE CABINA",
        items: [
            { id: '46', name: "SACCO SAF + SACCO CORDE", quantity: 1 },
            { id: '47', name: "SACCO ATP", quantity: 1 },
            { id: '48', name: "TUTA ANTITAGLIO", quantity: 1 },
            { id: '49', name: "CORSETTO ESTRICATORE (KED)", quantity: 1 },
            { id: '50', name: "KIT ACCESSORI PER BARELLA SPINALE", quantity: 1 },
            { id: '51', name: "TRIANGOLO VVF + BANDIERINA DI SEGNALAZIONE", quantity: 1 },
            { id: '52', name: "CASSETTA SALVAGENTE (Corda Donges, Cordino, Rescue Line, Sacco Armo, Rulliera)", quantity: 1 }
        ]
    },
    {
        name: "VANO 1 ANTERIORE SINISTRO",
        items: [
            { id: '53', name: "TUBI ARIA PER CUSCINI (GIALLO, ROSSO, BLU)", quantity: 3 },
            { id: '54', name: "VALVOLA PER CHIUSURA ARIA CUSCINI", quantity: 1 },
            { id: '55', name: "CENTRALINA CUSCINI SOLLEVAMENTO AD ARIA", quantity: 1 },
            { id: '56', name: "BOMBOLA ARIA + RIDUTTORE PRESSIONE + TUBO", quantity: 1 },
            { id: '57', name: "SMERIGLIATRICE ANG. BATT. MAKITA + BAT. SCORTA", quantity: 1 },
            { id: '58', name: "CONI SEGNALAZIONE", quantity: 4 },
            { id: '59', name: "POMPA MANUALE CESOIE/DIVARICATORE HOLMATRO", quantity: 1 },
            { id: '60', name: "CUSCINI SOLLEVAMENTO (2x 50x50, 1x 30x30)", quantity: 3 },
            { id: '61', name: "SCATOLA N.3 AIRBAG PROTECTION", quantity: 1 },
            { id: '62', name: "SEGA TAGLIAVETRO MULTIFUNZIONE", quantity: 1 },
            { id: '63', name: "STENDINASTRO (CASSETTA AIRBAG PROTECTION)", quantity: 1 },
            { id: '64', name: "TAGLIACINTURE", quantity: 1 },
            { id: '65', name: "CATENE PER DIVARICATORE", quantity: 2 },
            { id: '66', name: "ANGOLARE ACCIAIO PER DIVARICATORE", quantity: 1 },
            { id: '67', name: "TUBI ATTREZZATURA OLEOD. HOLMATRO (10mt)", quantity: 2 },
            { id: '68', name: "DIVARICATORE OLEODINAMICO HOLMATRO", quantity: 1 },
            { id: '69', name: "CESOIA OLEODINAMICA HOLMATRO", quantity: 1 },
            { id: '70', name: "GRUPPO OLEODINAMICO HOLMATRO SMIDB016", quantity: 1 },
            { id: '71', name: "PISTONE IDRAULICO OLEODIN. + 3 PROLUNGHE", quantity: 1 },
            { id: '72', name: "BARELLA SPINALE", quantity: 1 },
            { id: '73', name: "TELO PORTAFERITI", quantity: 1 },
            { id: '74', name: "SACCA VVF 2 CINGHIE ANCORAGGIO CRICCHETTO", quantity: 1 }
        ]
    },
    {
        name: "VANO 3 CENTRALE SINISTRO",
        items: [
            { id: '75', name: "MOTOSEGA STIHL TETTI VENTILATI SIMS063", quantity: 1 },
            { id: '76', name: "BARRA DI RICAMBIO PER SIMS063 A LEGNO", quantity: 1 },
            { id: '77', name: "ZAINO T.P.S.S.", quantity: 1 },
            { id: '78', name: "GATTUCCIO BATT. MAKITA + LAME + BATT. SCORTA", quantity: 1 },
            { id: '79', name: "TUBI DA 45", quantity: 6 },
            { id: '80', name: "TUBI DA 70", quantity: 4 },
            { id: '81', name: "MOTOSEGA SIMS057", quantity: 1 },
            { id: '82', name: "MOTOSEGA SIMS039", quantity: 1 },
            { id: '83', name: "MOTOTRONCATRICE SIMTT023 CLIPPER", quantity: 1 },
            { id: '84', name: "IMBUTO", quantity: 1 },
            { id: '85', name: "TROUSSE MOTOSEGHE + CATENE DI SCORTA", quantity: 2 },
            { id: '86', name: "DISCO DI SCORTA (PER FERRO)", quantity: 1 },
            { id: '87', name: "CASSETTA ATTREZZI GENERICA (Cacciaviti, Pinze, Chiavi...)", quantity: 1 },
            { id: '88', name: "TANICA OLIO/MISCELA", quantity: 1 },
            { id: '89', name: "SEGHETTO A FERRO", quantity: 1 }
        ]
    },
    {
        name: "VANO 5 POSTERIORE SINISTRO",
        items: [
            { id: '90', name: "CASSETTA KIT FUGA GAS", quantity: 1 },
            { id: '91', name: "CASSETTE NBCR (vario materiale)", quantity: 7 },
            { id: '92', name: "AVVITATORE BATT. MAKITA + PUNTE + BATT. SCORTA", quantity: 1 },
            { id: '93', name: "LANCIA REGOLABILE 70", quantity: 1 },
            { id: '94', name: "LANCIA REGOLABILE 45", quantity: 1 },
            { id: '95', name: "LANCIA AMERICANA 45", quantity: 1 },
            { id: '96', name: "ESTINTORE CO2 kg.5", quantity: 1 },
            { id: '97', name: "ESTINTORE A POLVERE", quantity: 1 },
            { id: '98', name: "ESTINTORE A SCHIUMA", quantity: 1 },
            { id: '99', name: "LANCIA COMETA DA 45", quantity: 1 },
            { id: '100', name: "MOTOVENTILATORE SIMVB005 PLUS", quantity: 1 },
            { id: '101', name: "CEDONI IN LEGNO", quantity: 2 },
            { id: '102', name: "LANCIA DA 45 COMPLETA DI TROMBONCINO", quantity: 1 },
            { id: '103', name: "LANCIA CAVA DA 45", quantity: 1 },
            { id: '104', name: "TANICA GASOLIO DA 10 LT", quantity: 1 },
            { id: '105', name: "CASSETTA RACCORDI E CHIAVI IDRANTI", quantity: 1 }
        ]
    },
    {
        name: "VANO BASSO POSTERIORE SINISTRO",
        items: [
            { id: '106', name: "KIT RIPARAZIONE PNEUMATICI", quantity: 1 },
            { id: '107', name: "BENZINA DA 10 LT", quantity: 1 },
            { id: '108', name: "FASCIA DA 10 mt.", quantity: 1 },
            { id: '109', name: "FASCIA AD ANELLO", quantity: 1 },
            { id: '110', name: "GRILLI", quantity: 7 },
            { id: '111', name: "KIT SOLLEVAMENTO AUTOMEZZO", quantity: 1 },
            { id: '112', name: "CAVO D'ACCIAIO", quantity: 1 }
        ]
    },
    {
        name: "VANO POMPA",
        items: [
            { id: '113', name: "TROMBONCINO PER NASPO", quantity: 1 },
            { id: '114', name: "CHIAVI DI MANDATA", quantity: 2 }
        ]
    },
    {
        name: "SOPRA MACCHINA (IMPERIALE)",
        items: [
            { id: '115', name: "SCALA ITALIANA", quantity: 1 },
            { id: '116', name: "FIORETTO DIELETTRICO (013)", quantity: 1 },
            { id: '117', name: "SCALA A GANCI", quantity: 1 },
            { id: '118', name: "TIRFOR SITRF012 + PALO", quantity: 1 }
        ]
    },
    {
        name: "VANO 2 ANTERIORE DESTRO",
        items: [
            { id: '119', name: "CALZATOIE PER RUOTE", quantity: 2 },
            { id: '120', name: "GUANTI DIELETTRICI GDIE08/GDIE015", quantity: 2 },
            { id: '121', name: "CESOIA TAGLIABULLONI", quantity: 1 },
            { id: '122', name: "CESOIA DIELETTRICA CSD 013", quantity: 1 },
            { id: '123', name: "ROTOLO NASTRO SEGNALETICO", quantity: 1 },
            { id: '124', name: "STABILIZZATORE LX STRUT LUCAS", quantity: 2 },
            { id: '125', name: "TREPPIEDI PER FARO LED", quantity: 1 },
            { id: '126', name: "FARO LED CON SUPPORTO DA PAVIMENTO", quantity: 1 },
            { id: '127', name: "FARO LED PER TREPPIEDI", quantity: 1 },
            { id: '128', name: "ZAINO FOTOVOLTAICO", quantity: 1 },
            { id: '129', name: "ADATTATORI PRESA ELETTRICA", quantity: 4 },
            { id: '130', name: "PROLUNGA ELETTRICA 220V DA 25 MT", quantity: 2 },
            { id: '131', name: "PEDANA ISOLANTE + 4 PIEDINI (SIPDI 006)", quantity: 1 },
            { id: '132', name: "GRUPPO ELETTROGENO SIGE051", quantity: 1 }
        ]
    },
    {
        name: "VANO 4 CENTRALE DESTRO",
        items: [
            { id: '133', name: "MAZZA", quantity: 1 },
            { id: '134', name: "PICCONE", quantity: 1 },
            { id: '135', name: "ASCIA", quantity: 1 },
            { id: '136', name: "PENNATO", quantity: 1 },
            { id: '137', name: "LEVERINO", quantity: 1 },
            { id: '138', name: "PIEDE DI PORCO", quantity: 1 },
            { id: '139', name: "SEGACCIO SVEDESE", quantity: 1 },
            { id: '140', name: "CHIAVE IDRANTE LUNGA", quantity: 1 },
            { id: '141', name: "HULLIGAN", quantity: 1 },
            { id: '142', name: "BARELLA ULTRA BASKET STRETCHER", quantity: 1 },
            { id: '143', name: "TUBI MANDATA DA 45", quantity: 5 },
            { id: '144', name: "TUBI MANDATA DA 70", quantity: 3 },
            { id: '145', name: "BOMBOLA ARIA SCORTA", quantity: 3 },
            { id: '146', name: "SACCA CON CATENE DA NEVE", quantity: 2 },
            { id: '147', name: "BORSA VVF CON SISTEMA CINGHIE BARELLA", quantity: 1 },
            { id: '148', name: "COPPIA CUNEI IN PVC", quantity: 1 }
        ]
    },
    {
        name: "VANO 6 POSTERIORE DESTRO",
        items: [
            { id: '149', name: "TROMBONCINO PER NASPO", quantity: 1 },
            { id: '150', name: "CHIAVI DI MANDATA", quantity: 2 },
            { id: '151', name: "PREMESCOLATORE DI LINEA DA 45 COMPLETO", quantity: 1 },
            { id: '152', name: "ELETTROPOMPA EP 031", quantity: 1 },
            { id: '153', name: "TURBOPOMPA", quantity: 1 },
            { id: '154', name: "DIVISORE 70/45 A 3 VIE", quantity: 1 },
            { id: '155', name: "TUBI PESCAGGIO SCHIUMOGENO", quantity: 2 },
            { id: '156', name: "TUBO ASPIRAZIONE SCHIUMOGENO", quantity: 1 },
            { id: '157', name: "KIT LANCE PIERCING (Divisore, 2 Lance)", quantity: 1 }
        ]
    },
    {
        name: "VANO BASSO POSTERIORE DESTRO",
        items: [
            { id: '158', name: "TUBI ASPIRAZIONE", quantity: 4 },
            { id: '159', name: "CHIAVI ASPIRAZIONE", quantity: 2 },
            { id: '160', name: "PEDANA DI COLLEGAMENTO TRA PEDANE RIBALTABILI", quantity: 1 },
            { id: '161', name: "SACCA CON CATENE DA NEVE", quantity: 1 },
            { id: '162', name: "VALVOLA DI FONDO", quantity: 1 }
        ]
    }
];

// Standard Loadout POL VF 29068
export const POL_VF29068_LOADOUT: Omit<VehicleCompartment, 'id'>[] = [
    {
        name: "ANTERIORE CABINA",
        items: [
            { id: '1', name: "TELEPAS n. 0659792956", quantity: 1 },
            { id: '2', name: "RADIO VEICOLARE VHF", quantity: 1 },
            { id: '3', name: "PALETTA SEGNALAZIONE N. 377", quantity: 1 },
            { id: '4', name: "SCATOLA GUANTI IN LATTICE", quantity: 1 },
            { id: '5', name: "LIBRETTO CIRCOLAZIONE", quantity: 1 },
            { id: '6', name: "LASTRE PER APERTURA PORTA", quantity: 1 },
            { id: '7', name: "COPIA CERTIFICATO ASSICURAZIONE", quantity: 1 },
            { id: '8', name: "CRICK IDRAULICO CON LEVA", quantity: 1 },
            { id: '9', name: "COPIA CERTIFICATO REVISIONE", quantity: 1 },
            { id: '10', name: "TROUSSE (CHIAVE RUOTE + CACCIAVITE)", quantity: 1 },
            { id: '11', name: "CID VVF", quantity: 1 },
            { id: '12', name: "TRATTO COMPETENZA A1", quantity: 1 },
            { id: '13', name: "GEL DISINFETTANTE MANI", quantity: 1 }
        ]
    },
    {
        name: "VANO 1 ANTERIORE",
        items: [
            { id: '14', name: "TRIANGOLO AD OMBRELLO AUTO FERMA", quantity: 1 },
            { id: '15', name: "DEFIBRILLATORE AUTOMATICO ESTERNO (DAE)", quantity: 1 },
            { id: '16', name: "CESOIE TAGLIABULLONI", quantity: 1 },
            { id: '17', name: "COPERTA ANTIFIAMMA", quantity: 1 },
            { id: '18', name: "RETINO DA PESCA", quantity: 1 },
            { id: '19', name: "ROTOLO NASTRO TURAFALLE", quantity: 1 },
            { id: '20', name: "CERCAFALLE SPRAY", quantity: 1 },
            { id: '21', name: "ROTOLO NASTRO B/R", quantity: 1 },
            { id: '22', name: "CASSETTA BOSCH (Trapano + Inserti + 2 Batt. Makita)", quantity: 1 },
            { id: '23', name: "PALA", quantity: 1 },
            { id: '24', name: "CASSETTA ATTREZZI COMPLETA (Chiavi, Cacciaviti, Martello...)", quantity: 1 },
            { id: '25', name: "TANICA METALLICA 10 LT BENZINA + RACCORDO", quantity: 1 },
            { id: '26', name: "CASSETTA AMIANTO (Tute, Maschere, Guanti, Sacchi...)", quantity: 1 },
            { id: '27', name: "CALZATOIE PER RUOTE", quantity: 2 },
            { id: '28', name: "MOTOSEGA MSSI 030 + TROUSSE", quantity: 1 },
            { id: '29', name: "MOTOSEGA MAKITA 36V MSG 071 + 2 BATTERIE", quantity: 1 },
            { id: '30', name: "TANICA OLIO CATENA PER MOTOSEGA", quantity: 1 },
            { id: '31', name: "TANICA MISCELA", quantity: 1 },
            { id: '32', name: "PENNATO", quantity: 1 },
            { id: '33', name: "CUSCINI SOLLEVAMENTO", quantity: 2 },
            { id: '34', name: "CENTRALINA COMANDO CUSCINI", quantity: 1 },
            { id: '35', name: "TUBI PER CUSCINI (GIALLO + ROSSO)", quantity: 2 },
            { id: '36', name: "CORDINO", quantity: 1 },
            { id: '37', name: "CASSETTA NERA RACCORDI/CHIAVI (Olivella, Chiusini, Idrante...)", quantity: 1 },
            { id: '38', name: "CHIAVE IDRANTI SOTTOSUOLO", quantity: 1 },
            { id: '39', name: "MOTOTRONCATRICE SI-MTT 015", quantity: 1 },
            { id: '40', name: "PROLUNGA ELETTRICA", quantity: 1 },
            { id: '41', name: "MASCHERE PER AUTOPROTETTORI", quantity: 2 },
            { id: '42', name: "AUTOPROTETTORI", quantity: 2 },
            { id: '43', name: "ESTINTORE A SCHIUMA", quantity: 1 },
            { id: '44', name: "ESTINTORE A POLVERE", quantity: 1 },
            { id: '45', name: "ESTINTORE A CO2", quantity: 1 },
            { id: '46', name: "TORCE A BATTERIA (SILMP050 - SILMP051)", quantity: 2 },
            { id: '47', name: "BOMBOLA ARIA CON RIDUTTORE PRESSIONE", quantity: 1 }
        ]
    },
    {
        name: "VANO 3 CENTRALE",
        items: [
            { id: '48', name: "DIVARICATORE ELETTRICO CON BATTERIA", quantity: 1 },
            { id: '49', name: "CESOIE ELETTRICHE CON BATTERIA", quantity: 1 },
            { id: '50', name: "PISTONE IDRAULICO", quantity: 1 },
            { id: '51', name: "CATENE PER DIVARICATORE", quantity: 2 },
            { id: '52', name: "PIEDE DI PORCO", quantity: 1 },
            { id: '53', name: "ALIMENTATORE 220V PER CESOIE E DIVARICATORE", quantity: 1 },
            { id: '54', name: "TAGLIACINTURE", quantity: 1 },
            { id: '55', name: "MAZZA", quantity: 1 },
            { id: '56', name: "KIT RIPARAZIONE PNEUMATICI", quantity: 1 },
            { id: '57', name: "COLLO D'OCA DA 45", quantity: 1 },
            { id: '58', name: "SACCO TPSS", quantity: 1 },
            { id: '59', name: "PAIO DI GUANTI DIELETTRICI SI GDIE 07", quantity: 1 },
            { id: '60', name: "PAIO CATENE DA NEVE", quantity: 1 },
            { id: '61', name: "TRINCIABULLONI A BATTERIA MAKITA + 2 BATTERIE", quantity: 1 },
            { id: '62', name: "CARICABATT. X BATTERIA MAKITA (TRINCIABUL.)", quantity: 1 },
            { id: '63', name: "CARICABATTERIA X BATTERIA BOSCH (TRAPANO)", quantity: 1 },
            { id: '64', name: "CARICABATTERIA LUCAS (DIVARIC.-CESOIE-PISTONE)", quantity: 1 },
            { id: '65', name: "ANGOLARE DI SUPPORTO", quantity: 1 }
        ]
    },
    {
        name: "VANO 5 POSTERIORE",
        items: [
            { id: '66', name: "BOMBOLE ARIA COMPRESSA PER IFEX", quantity: 2 },
            { id: '67', name: "MANICHETTE DA 45", quantity: 4 },
            { id: '68', name: "NASPO ALTA PRESSIONE", quantity: 1 },
            { id: '69', name: "RIDUTTORE 70/45", quantity: 1 },
            { id: '70', name: "LANCIA REGOLABILE DA 45", quantity: 1 },
            { id: '71', name: "IFEX", quantity: 1 }
        ]
    },
    {
        name: "SOPRA MACCHINA (IMPERIALE)",
        items: [
            { id: '72', name: "SCALA ITALIANA", quantity: 1 },
            { id: '73', name: "RAMPONE", quantity: 1 },
            { id: '74', name: "FIORETTO DIELETTRICO", quantity: 1 }
        ]
    },
    {
        name: "VANO POMPA",
        items: [
            { id: '75', name: "PROLUNGA NASPO", quantity: 1 }
        ]
    }
];

// Standard Loadout CA/PU VF32356
export const CAPU_VF32356_LOADOUT: Omit<VehicleCompartment, 'id'>[] = [
    {
        name: "CABINA",
        items: [
            { id: '1', name: "TELEPAS n. 0968332700", quantity: 1 },
            { id: '2', name: "PALETTA SEGNALAZIONE N. 1294", quantity: 1 },
            { id: '3', name: "LIBRETTO CIRCOLAZIONE", quantity: 1 },
            { id: '4', name: "COPIA CERTIFICATO ASSICURAZIONE", quantity: 1 },
            { id: '5', name: "COPPIA CATENE DA NEVE", quantity: 1 },
            { id: '6', name: "TRATTO COMPETENZA A1", quantity: 1 },
            { id: '7', name: "CID VVF", quantity: 1 },
            { id: '8', name: "LASTRE APERTURA PORTA", quantity: 1 },
            { id: '9', name: "RADIO VEICOLARE", quantity: 1 },
            { id: '10', name: "NASTRO B/R", quantity: 1 },
            { id: '11', name: "CONFEZIONE GUANTI IN LATTICE", quantity: 1 },
            { id: '12', name: "SACCA ROSSA VVF (2 Radio Hytera + Caricabatt + Radio Puma)", quantity: 1 }
        ]
    },
    {
        name: "CABINA SOTTO SEDILE POSTERIORE",
        items: [
            { id: '13', name: "TRIANGOLO AUTO FERMA", quantity: 1 },
            { id: '14', name: "CRIC MECCANICO COMPLETO DI LEVE", quantity: 1 },
            { id: '15', name: "GILET ALTA VISIBILITA", quantity: 1 },
            { id: '16', name: "KIT PRONTO SOCCORSO", quantity: 1 },
            { id: '17', name: "ESTINTORE A POLVERE DA 1 Kg", quantity: 1 }
        ]
    },
    {
        name: "CASSONE POSTERIORE",
        items: [
            { id: '18', name: "MODULO ANTINCENDIO (ESK SIMO 022)", quantity: 1 },
            { id: '19', name: "CASSETTA GIALLA (Pennato, Grillo, Chiavi Mandata, Fascia, Riduttore, Leverino)", quantity: 1 },
            { id: '20', name: "TANICA GASOLIO 10 L", quantity: 1 },
            { id: '21', name: "CORDINO", quantity: 1 },
            { id: '22', name: "BATTIFIAMMA", quantity: 1 },
            { id: '23', name: "ESTINTORE A POLVERE DA 6 Kg", quantity: 1 },
            { id: '24', name: "SACCA MOTOSEGA SIMSG 076 + TROUSSE", quantity: 1 },
            { id: '25', name: "CALZATOIA PER RUOTE", quantity: 1 },
            { id: '26', name: "TUBO ASPIRAZIONE FONTE ESTERNA CON VALVOLA DI FONDO", quantity: 1 },
            { id: '27', name: "MANICHETTA DA 45", quantity: 1 }
        ]
    }
];

// Standard Loadout ABP VF 22456
export const ABP_VF22456_LOADOUT: Omit<VehicleCompartment, 'id'>[] = [
    {
        name: "ANTERIORE CABINA",
        items: [
            { id: '1', name: "TELEPAS n. 0617847348", quantity: 1 },
            { id: '2', name: "PALETTA SEGNALAZIONE N. 0074", quantity: 1 },
            { id: '3', name: "PALETTA SEGNALAZIONE N. 0075", quantity: 1 },
            { id: '4', name: "LIBRETTO CIRCOLAZIONE", quantity: 1 },
            { id: '5', name: "COPIA CERTIFICATO ASSICURAZIONE", quantity: 1 },
            { id: '6', name: "COPIA CERTIFICATO REVISIONE", quantity: 1 },
            { id: '7', name: "CID VVF", quantity: 1 },
            { id: '8', name: "RADIO VEICOLARE", quantity: 1 },
            { id: '9', name: "CASETTA PRONTO SOCCORSO", quantity: 1 },
            { id: '10', name: "TRIANGOLO VEICOLO FERMO", quantity: 1 },
            { id: '11', name: "TUBO ARIA MEZZI INCIDENTATI", quantity: 1 },
            { id: '12', name: "CUFFIE ANTIRUMORE", quantity: 1 },
            { id: '13', name: "CHIAVE A1", quantity: 1 },
            { id: '14', name: "CONFEZIONE GUANTI IN LATTICE", quantity: 1 }
        ]
    },
    {
        name: "VANO 1 ANTERIORE SINISTRO",
        items: [
            { id: '15', name: "CORDINI", quantity: 2 },
            { id: '16', name: "CESOIA", quantity: 1 },
            { id: '17', name: "BADILE", quantity: 1 },
            { id: '18', name: "PICCONE", quantity: 1 },
            { id: '19', name: "MARTELLO DA MURATORE", quantity: 1 },
            { id: '20', name: "PENNATO", quantity: 1 },
            { id: '21', name: "CASSETTA CON 2 AUTOPROTETTORI E 2 MASCHERE", quantity: 1 },
            { id: '22', name: "TRIANGOLO OMBRELLO", quantity: 1 },
            { id: '23', name: "PIEDE DI PORCO GRANDE", quantity: 1 },
            { id: '24', name: "PIEDE DI PORCO PICCOLO", quantity: 1 },
            { id: '25', name: "CAVO D'ACCIAIO", quantity: 1 },
            { id: '26', name: "GRILLI", quantity: 2 },
            { id: '27', name: "CESOIA DIELETTRICA SICSD011", quantity: 1 },
            { id: '28', name: "ESTINTORE A POLVERE KG 6", quantity: 1 },
            { id: '29', name: "ESTINTORE A CO2 KG 5", quantity: 1 },
            { id: '30', name: "FORCONE", quantity: 1 }
        ]
    },
    {
        name: "VANO 2 POSTERIORE SINISTRO",
        items: [
            { id: '31', name: "MANICHETTA DA 70", quantity: 3 },
            { id: '32', name: "MANICHETTA DA 45", quantity: 7 },
            { id: '33', name: "LANCIA GETTO VARIABILE DA 70", quantity: 1 },
            { id: '34', name: "LANCIA GETTO VARIABILE DA 45", quantity: 1 },
            { id: '35', name: "COLONNINA IDRANTE DA 45", quantity: 1 },
            { id: '36', name: "SPEZZONE MANICHETTA DA 70", quantity: 1 },
            { id: '37', name: "LANCIA REGOLABILE UNIFIRE DA 45", quantity: 1 },
            { id: '38', name: "DIVISORE 70x45 3 VIE", quantity: 1 },
            { id: '39', name: "DIVISORE 70x70 2 VIE", quantity: 1 },
            { id: '40', name: "RIDUTTORE 70/45", quantity: 2 },
            { id: '41', name: "DIFFUSORE 45/70", quantity: 2 },
            { id: '42', name: "LANCIA CAVA AWG da 70 + TROMBONCINO", quantity: 1 }
        ]
    },
    {
        name: "VANO BASSO POSTERIORE SOTTO VANO 2",
        items: [
            { id: '43', name: "TUBI ASPIRAZIONE DA 100", quantity: 4 }
        ]
    },
    {
        name: "VANO POMPA",
        items: [
            { id: '44', name: "CHIAVE ASPIRAZIONE", quantity: 2 },
            { id: '45', name: "CHIAVE DI MANDATA", quantity: 2 },
            { id: '46', name: "LANCIA SCHIUMA PER NASPO", quantity: 1 },
            { id: '47', name: "CHIAVE TUBI STORZ", quantity: 2 },
            { id: '48', name: "SPINOTTO PER GANCIO TRAINO", quantity: 1 }
        ]
    },
    {
        name: "SOPRA MACCHINA (IMPERIALE)",
        items: [
            { id: '49', name: "SCALA ITALIANA", quantity: 1 },
            { id: '50', name: "CANNONCINO", quantity: 1 }
        ]
    },
    {
        name: "VANO 3 POSTERIORE DESTRO",
        items: [
            { id: '51', name: "MANICHETTA DA 70", quantity: 3 },
            { id: '52', name: "MANICHETTA DA 45", quantity: 4 },
            { id: '53', name: "CHIAVI IDRANTI", quantity: 2 },
            { id: '54', name: "MANICHETTA STORZ DA 38", quantity: 3 },
            { id: '55', name: "NASPO STORZ", quantity: 1 },
            { id: '56', name: "LANCIA SCHIUMA PER NASPO STORZ", quantity: 1 },
            { id: '57', name: "VALVOLA DI FONDO", quantity: 1 },
            { id: '58', name: "LEVA AVVOLGIMENTO NASPO", quantity: 1 },
            { id: '59', name: "LANCIA CAVA BLUE DEVIL + TROMBONCINO", quantity: 1 },
            { id: '60', name: "ADATTATORE SCHIUMA MEDIA ESPANSIONE", quantity: 1 },
            { id: '61', name: "TUBO PESCAGGIO SCHIUMOGENO", quantity: 2 },
            { id: '62', name: "DOPPIA FEMMINA DA 45", quantity: 1 },
            { id: '63', name: "DOPPIA FEMMINA DA 70", quantity: 1 },
            { id: '64', name: "DOPPIO MASCHIO DA 45", quantity: 1 },
            { id: '65', name: "DOPPIO MASCHIO DA 70", quantity: 1 },
            { id: '66', name: "COLONNINA IDRANTE DA 70", quantity: 1 },
            { id: '67', name: "PREMESCOLATORE DI LINEA DA 45", quantity: 1 }
        ]
    },
    {
        name: "VANO 4 ANTERIORE DESTRO",
        items: [
            { id: '68', name: "CALZATOIA", quantity: 2 },
            { id: '69', name: "LEVA PER MARTINETTO", quantity: 2 },
            { id: '70', name: "CHIAVE IDRANTE SOTTOSUOLO", quantity: 1 },
            { id: '71', name: "LAMPADA PORTATILE SILMP025", quantity: 1 },
            { id: '72', name: "TREPIEDE PER FARETTO", quantity: 1 },
            { id: '73', name: "MARTINETTO IDRAULICO", quantity: 1 },
            { id: '74', name: "CASSETTA ATTREZZI", quantity: 1 },
            { id: '75', name: "FARETTO PORTATILE", quantity: 2 },
            { id: '76', name: "COPPIA CATENE DA NEVE + CHIAVE", quantity: 1 }
        ]
    }
];
