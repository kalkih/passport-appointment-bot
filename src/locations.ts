export interface RegionConfig {
  id: number;
  passportServiceId: number;
  cardServiceId: number;
  locations: Locations;
}

export type Locations = Record<string, number>;

export enum Region {
  BLEKINGE = "Blekinge",
  DALARNA = "Dalarna",
  GOTLAND = "Gotland",
  GAVLEBORG = "Gävleborg",
  HALLAND = "Halland",
  JAMTLAND = "Jämtland",
  JONKOPING = "Jönköping",
  KALMAR = "Kalmar",
  KRONOBERG = "Kronoberg",
  NORRBOTTEN = "Norrbotten",
  SKANE = "Skåne",
  STOCKHOLM = "Stockholm",
  SODERMANLAND = "Södermanland",
  UPPSALA = "Uppsala",
  VARMLAND = "Värmland",
  VASTERBOTTEN = "Västerbotten",
  VASTERNORRLAND = "Västernorrland",
  VASTMANLAND = "Västmanland",
  VASTRA_GOTALAND = "VästraGötaland",
  OREBRO = "Örebro",
  OSTERGOTLAND = "Östergötland",
}

export const isValidRegion = (region: string): region is Region =>
  Object.values(Region).includes(region as Region);

export const LOCATIONS: Record<Region, RegionConfig> = {
  [Region.BLEKINGE]: {
    id: 74,
    passportServiceId: 76,
    cardServiceId: 75,
    locations: {
      Karlshamn: 106,
      Karlskrona: 105,
    },
  },
  [Region.DALARNA]: {
    id: 15,
    passportServiceId: 27,
    cardServiceId: 26,
    locations: {
      Avesta: 50,
      Borlänge: 6,
      Ludvika: 55,
      Mora: 56,
    },
  },
  [Region.GOTLAND]: {
    id: 21,
    passportServiceId: 27,
    cardServiceId: 26,
    locations: {
      Visby: 12,
    },
  },
  [Region.GAVLEBORG]: {
    id: 19,
    passportServiceId: 29,
    cardServiceId: 28,
    locations: {
      Bollnäs: 37,
      Gävle: 13,
      Hudiksvall: 32,
    },
  },
  [Region.HALLAND]: {
    id: 65,
    passportServiceId: 67,
    cardServiceId: 66,
    locations: {
      Falkenberg: 96,
      Halmstad: 97,
      Kungsbacka: 94,
      Varberg: 95,
    },
  },
  [Region.JAMTLAND]: {
    id: 18,
    passportServiceId: 31,
    cardServiceId: 30,
    locations: {
      Funäsdalen: 62,
      Strömsund: 73,
      Sveg: 74,
      Åre: 77,
      Östersund: 9,
    },
  },
  [Region.JONKOPING]: {
    id: 59,
    passportServiceId: 64,
    cardServiceId: 63,
    locations: {
      Eksjö: 82,
      Jönköping: 83,
      Värnamo: 84,
    },
  },
  [Region.KALMAR]: {
    id: 69,
    passportServiceId: 72,
    cardServiceId: 73,
    locations: {
      Kalmar: 102,
      Oskarshamn: 103,
      Västervik: 104,
    },
  },
  [Region.KRONOBERG]: {
    id: 68,
    passportServiceId: 71,
    cardServiceId: 70,
    locations: {
      Ljungby: 98,
      Växjö: 99,
      Älmhult: 100,
    },
  },
  [Region.NORRBOTTEN]: {
    id: 53,
    passportServiceId: 54,
    cardServiceId: 55,
    locations: {
      Arvidsjaur: 60,
      Boden: 61,
      Gällivare: 63,
      Haparanda: 64,
      Kalix: 65,
      Kiruna: 66,
      Luleå: 79,
      Piteå: 70,
    },
  },
  [Region.SKANE]: {
    id: 77,
    passportServiceId: 79,
    cardServiceId: 78,
    locations: {
      Eslöv: 110,
      Helsingborg: 111,
      Hässleholm: 108,
      Klippan: 67,
      Kristianstad: 109,
      Landskrona: 114,
      Lund: 118,
      Malmö: 112,
      Trelleborg: 116,
      Ystad: 117,
      Ängelholm: 115,
    },
  },
  [Region.STOCKHOLM]: {
    id: 47,
    passportServiceId: 52,
    cardServiceId: 48,
    locations: {
      Flemingsberg: 38,
      Globen: 40,
      Haninge: 46,
      Järva: 113,
      Nacka: 45,
      Norrtälje: 44,
      Sollentuna: 43,
      Solna: 42,
      "Sthlm City": 41,
      Södertälje: 47,
      "Södra Roslagen": 48,
    },
  },
  [Region.SODERMANLAND]: {
    id: 60,
    passportServiceId: 62,
    cardServiceId: 61,
    locations: {
      Eskilstuna: 85,
      Katrineholm: 86,
      Nyköping: 87,
      Skavsta: 88,
      Strängnäs: 89,
    },
  },
  [Region.UPPSALA]: {
    id: 20,
    passportServiceId: 25,
    cardServiceId: 24,
    locations: {
      Enköping: 3,
      Tierp: 34,
      Uppsala: 5,
      Östhammar: 33,
    },
  },
  [Region.VARMLAND]: {
    id: 16,
    passportServiceId: 23,
    cardServiceId: 22,
    locations: {
      Arvika: 49,
      Karlstad: 7,
      Kristinehamn: 53,
      Torsby: 57,
    },
  },
  [Region.VASTERBOTTEN]: {
    id: 13,
    passportServiceId: 35,
    cardServiceId: 34,
    locations: {
      Lycksele: 69,
      Skellefteå: 11,
      Storuman: 72,
      Umeå: 81,
      Vilhelmina: 75,
    },
  },
  [Region.VASTERNORRLAND]: {
    id: 14,
    passportServiceId: 37,
    cardServiceId: 36,
    locations: {
      Härnösand: 10,
      Kramfors: 68,
      Sollefteå: 71,
      Sundsvall: 80,
      Ånge: 76,
      Örnsköldsvik: 78,
    },
  },
  [Region.VASTMANLAND]: {
    id: 1,
    passportServiceId: 3,
    cardServiceId: 2,
    locations: {
      Fagersta: 36,
      Köping: 2,
      Sala: 35,
      Västerås: 93,
    },
  },
  [Region.VASTRA_GOTALAND]: {
    id: 40,
    passportServiceId: 42,
    cardServiceId: 41,
    locations: {
      Alingsås: 17,
      Borås: 18,
      Falköping: 24,
      Göteborg: 15,
      Lidköping: 31,
      Mariestad: 26,
      "Mark/Kinna": 19,
      Mölndal: 16,
      Skövde: 27,
      Stenungsund: 28,
      Strömstad: 29,
      Trollhättan: 30,
      Uddevalla: 25,
      Ulricehamn: 20,
      Åmål: 23,
    },
  },
  [Region.OREBRO]: {
    id: 17,
    passportServiceId: 39,
    cardServiceId: 38,
    locations: {
      Hallsberg: 51,
      Karlskoga: 52,
      Lindesberg: 54,
      Vivalla: 58,
      Örebro: 8,
    },
  },
  [Region.OSTERGOTLAND]: {
    id: 56,
    passportServiceId: 58,
    cardServiceId: 57,
    locations: {
      Linköping: 90,
      Motala: 91,
      Norrköping: 92,
    },
  },
};
