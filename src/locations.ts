export interface RegionConfig {
  id: number;
  passportServiceId: number;
  cardServiceId: number;
  locations: Locations;
}

export type Locations = Record<string, LocationConfig>;

export interface LocationConfig {
  id: number;
  serviceId: number;
}

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
      Karlshamn: {
        id: 106,
        serviceId: 1756,
      },
      Karlskrona: {
        id: 105,
        serviceId: 1739,
      },
    },
  },
  [Region.DALARNA]: {
    id: 15,
    passportServiceId: 27,
    cardServiceId: 26,
    locations: {
      Avesta: {
        id: 50,
        serviceId: 802,
      },
      Borlänge: {
        id: 6,
        serviceId: 14,
      },
      Ludvika: {
        id: 55,
        serviceId: 887,
      },
      Mora: {
        id: 56,
        serviceId: 904,
      },
    },
  },
  [Region.GOTLAND]: {
    id: 21,
    passportServiceId: 27,
    cardServiceId: 26,
    locations: {
      Visby: {
        id: 12,
        serviceId: 22,
      },
    },
  },
  [Region.GAVLEBORG]: {
    id: 19,
    passportServiceId: 29,
    cardServiceId: 28,
    locations: {
      Bollnäs: {
        id: 37,
        serviceId: 581,
      },
      Gävle: {
        id: 13,
        serviceId: 23,
      },
      Hudiksvall: {
        id: 32,
        serviceId: 496,
      },
    },
  },
  [Region.HALLAND]: {
    id: 65,
    passportServiceId: 67,
    cardServiceId: 66,
    locations: {
      Falkenberg: {
        id: 96,
        serviceId: 1586,
      },
      Halmstad: {
        id: 97,
        serviceId: 1603,
      },
      Kungsbacka: {
        id: 94,
        serviceId: 1552,
      },
      Varberg: {
        id: 95,
        serviceId: 1569,
      },
    },
  },
  [Region.JAMTLAND]: {
    id: 18,
    passportServiceId: 31,
    cardServiceId: 30,
    locations: {
      Funäsdalen: {
        id: 62,
        serviceId: 1007,
      },
      Strömsund: {
        id: 73,
        serviceId: 1194,
      },
      Sveg: {
        id: 74,
        serviceId: 1211,
      },
      Åre: {
        id: 77,
        serviceId: 1262,
      },
      Östersund: {
        id: 9,
        serviceId: 19,
      },
    },
  },
  [Region.JONKOPING]: {
    id: 59,
    passportServiceId: 64,
    cardServiceId: 63,
    locations: {
      Eksjö: {
        id: 82,
        serviceId: 1348,
      },
      Jönköping: {
        id: 83,
        serviceId: 1365,
      },
      Värnamo: {
        id: 84,
        serviceId: 1382,
      },
    },
  },
  [Region.KALMAR]: {
    id: 69,
    passportServiceId: 72,
    cardServiceId: 73,
    locations: {
      Kalmar: {
        id: 102,
        serviceId: 1688,
      },
      Oskarshamn: {
        id: 103,
        serviceId: 1705,
      },
      Västervik: {
        id: 104,
        serviceId: 1722,
      },
    },
  },
  [Region.KRONOBERG]: {
    id: 68,
    passportServiceId: 71,
    cardServiceId: 70,
    locations: {
      Ljungby: {
        id: 98,
        serviceId: 1620,
      },
      Växjö: {
        id: 99,
        serviceId: 1637,
      },
      Älmhult: {
        id: 100,
        serviceId: 1654,
      },
    },
  },
  [Region.NORRBOTTEN]: {
    id: 53,
    passportServiceId: 54,
    cardServiceId: 55,
    locations: {
      Arvidsjaur: {
        id: 60,
        serviceId: 973,
      },
      Boden: {
        id: 61,
        serviceId: 990,
      },
      Gällivare: {
        id: 63,
        serviceId: 1024,
      },
      Haparanda: {
        id: 64,
        serviceId: 1041,
      },
      Kalix: {
        id: 65,
        serviceId: 1058,
      },
      Kiruna: {
        id: 66,
        serviceId: 1075,
      },
      Luleå: {
        id: 79,
        serviceId: 1296,
      },
      Piteå: {
        id: 70,
        serviceId: 1143,
      },
    },
  },
  [Region.SKANE]: {
    id: 77,
    passportServiceId: 79,
    cardServiceId: 78,
    locations: {
      Eslöv: {
        id: 110,
        serviceId: 1791,
      },
      Helsingborg: {
        id: 111,
        serviceId: 1808,
      },
      Hässleholm: {
        id: 108,
        serviceId: 1842,
      },
      Klippan: {
        id: 67,
        serviceId: 1092,
      },
      Kristianstad: {
        id: 109,
        serviceId: 1859,
      },
      Landskrona: {
        id: 114,
        serviceId: 2145,
      },
      Lund: {
        id: 118,
        serviceId: 2238,
      },
      Malmö: {
        id: 112,
        serviceId: 1825,
      },
      Trelleborg: {
        id: 116,
        serviceId: 2200,
      },
      Ystad: {
        id: 117,
        serviceId: 2219,
      },
      Ängelholm: {
        id: 115,
        serviceId: 99,
      },
    },
  },
  [Region.STOCKHOLM]: {
    id: 47,
    passportServiceId: 52,
    cardServiceId: 48,
    locations: {
      Flemingsberg: {
        id: 38,
        serviceId: 598,
      },
      Globen: {
        id: 40,
        serviceId: 632,
      },
      Haninge: {
        id: 46,
        serviceId: 734,
      },
      Nacka: {
        id: 45,
        serviceId: 717,
      },
      Norrtälje: {
        id: 44,
        serviceId: 700,
      },
      Järva: {
        id: 113,
        serviceId: 2164,
      },
      Sollentuna: {
        id: 43,
        serviceId: 683,
      },
      Solna: {
        id: 42,
        serviceId: 666,
      },
      "Sthlm City": {
        id: 41,
        serviceId: 649,
      },
      Södertälje: {
        id: 47,
        serviceId: 751,
      },
      "Södra Roslagen": {
        id: 48,
        serviceId: 768,
      },
    },
  },
  [Region.SODERMANLAND]: {
    id: 60,
    passportServiceId: 62,
    cardServiceId: 61,
    locations: {
      Eskilstuna: {
        id: 85,
        serviceId: 1399,
      },
      Katrineholm: {
        id: 86,
        serviceId: 1416,
      },
      Nyköping: {
        id: 87,
        serviceId: 1433,
      },
      Skavsta: {
        id: 88,
        serviceId: 9999999,
      },
      Strängnäs: {
        id: 89,
        serviceId: 1467,
      },
    },
  },
  [Region.UPPSALA]: {
    id: 20,
    passportServiceId: 25,
    cardServiceId: 24,
    locations: {
      Enköping: {
        id: 3,
        serviceId: 15,
      },
      Tierp: {
        id: 34,
        serviceId: 530,
      },
      Uppsala: {
        id: 5,
        serviceId: 21,
      },
      Östhammar: {
        id: 33,
        serviceId: 513,
      },
    },
  },
  [Region.VARMLAND]: {
    id: 16,
    passportServiceId: 23,
    cardServiceId: 22,
    locations: {
      Arvika: {
        id: 49,
        serviceId: 785,
      },
      Karlstad: {
        id: 7,
        serviceId: 17,
      },
      Kristinehamn: {
        id: 53,
        serviceId: 853,
      },
      Torsby: {
        id: 57,
        serviceId: 921,
      },
    },
  },
  [Region.VASTERBOTTEN]: {
    id: 13,
    passportServiceId: 35,
    cardServiceId: 34,
    locations: {
      Lycksele: {
        id: 69,
        serviceId: 1126,
      },
      Skellefteå: {
        id: 11,
        serviceId: 20,
      },
      Storuman: {
        id: 72,
        serviceId: 1177,
      },
      Umeå: {
        id: 81,
        serviceId: 1330,
      },
      Vilhelmina: {
        id: 75,
        serviceId: 1228,
      },
    },
  },
  [Region.VASTERNORRLAND]: {
    id: 14,
    passportServiceId: 37,
    cardServiceId: 36,
    locations: {
      Härnösand: {
        id: 10,
        serviceId: 16,
      },
      Kramfors: {
        id: 68,
        serviceId: 1109,
      },
      Sollefteå: {
        id: 71,
        serviceId: 1160,
      },
      Sundsvall: {
        id: 80,
        serviceId: 1313,
      },
      Ånge: {
        id: 76,
        serviceId: 1245,
      },
      Örnsköldsvik: {
        id: 78,
        serviceId: 1279,
      },
    },
  },
  [Region.VASTMANLAND]: {
    id: 1,
    passportServiceId: 3,
    cardServiceId: 2,
    locations: {
      Fagersta: {
        id: 36,
        serviceId: 564,
      },
      Köping: {
        id: 2,
        serviceId: 1,
      },
      Sala: {
        id: 35,
        serviceId: 547,
      },
      Västerås: {
        id: 93,
        serviceId: 1535,
      },
    },
  },
  [Region.VASTRA_GOTALAND]: {
    id: 40,
    passportServiceId: 42,
    cardServiceId: 41,
    locations: {
      Alingsås: {
        id: 17,
        serviceId: 206,
      },
      Borås: {
        id: 18,
        serviceId: 223,
      },
      Falköping: {
        id: 24,
        serviceId: 360,
      },
      Göteborg: {
        id: 15,
        serviceId: 240,
      },
      Lidköping: {
        id: 31,
        serviceId: 479,
      },
      Mariestad: {
        id: 26,
        serviceId: 394,
      },
      "Mark/Kinna": {
        id: 19,
        serviceId: 258,
      },
      Mölndal: {
        id: 16,
        serviceId: 275,
      },
      Skövde: {
        id: 27,
        serviceId: 411,
      },
      Stenungsund: {
        id: 28,
        serviceId: 428,
      },
      Strömstad: {
        id: 29,
        serviceId: 445,
      },
      Trollhättan: {
        id: 30,
        serviceId: 462,
      },
      Uddevalla: {
        id: 25,
        serviceId: 377,
      },
      Ulricehamn: {
        id: 20,
        serviceId: 326,
      },
      Åmål: {
        id: 23,
        serviceId: 343,
      },
    },
  },
  [Region.OREBRO]: {
    id: 17,
    passportServiceId: 39,
    cardServiceId: 38,
    locations: {
      Hallsberg: {
        id: 51,
        serviceId: 819,
      },
      Karlskoga: {
        id: 52,
        serviceId: 836,
      },
      Lindesberg: {
        id: 54,
        serviceId: 870,
      },
      Vivalla: {
        id: 58,
        serviceId: 938,
      },
      Örebro: {
        id: 8,
        serviceId: 18,
      },
    },
  },
  [Region.OSTERGOTLAND]: {
    id: 56,
    passportServiceId: 58,
    cardServiceId: 57,
    locations: {
      Linköping: {
        id: 90,
        serviceId: 1484,
      },
      Motala: {
        id: 91,
        serviceId: 1501,
      },
      Norrköping: {
        id: 92,
        serviceId: 1518,
      },
    },
  },
};
