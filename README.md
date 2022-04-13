# passport-appointment-bot 🛂🤖

> Bot to automatically find and book an appointment for renewal/creation of a Swedish passport or national identity card.

> _Bott som automatiskt söker och bokar första lediga tid för att förnya pass och/eller nationellt id kort._

## ⚠️ **For educational use only** ⚠️

### What does it do?

The bot searches for available appointments until one is found, it then tries to book the appointment. The bot will run until an appointment is successfully booked.  
The bot can be configured to search for appointments in a specific region & in one or more cities at a time.  
It can also be configured to run several concurrent booking sessions in order to increase searching speed & search multiple locations at the same time.

### How to run

Requires **Google Chrome**

Download `config.json` & `passport-appointment-bot` for your OS from the [latest release](https://github.com/kalkih/passport-appointment-bot/releases/latest), place them in the same folder.

1. Edit the configuration file you downloaded (`config.json`) with text editor of choice, see [Configuration](#configuration) for option descriptions
2. Run the executable you downloaded `passport-appointment-bot`
3. The bot will open a webpage where the user is required to solve a captcha in order to proceed
4. The bot will search until an appointment is found
5. The bot will once again open a webpage where the user is required to solve a captcha in order to proceed
6. The bot will proceed with the booking and a booking confirmation should be sent to the configured email and will also be displayed in the program

### Run from source

Requires **Google Chrome**  
Requires **Nodejs** _(Tested on v17.7.1)_

1. Clone the project, install dependencies with `npm install`
2. Edit configuration values in `config.json`, see [Configuration](#configuration) for option descriptions
3. Run the bot with `npm start`
4. The bot will open a webpage where the user is required to solve a captcha in order to proceed
5. The bot will search until an appointment is found
6. The bot will once again open a webpage where the user is required to solve a captcha in order to proceed
7. The bot will proceed with the booking and a booking confirmation should be sent to the configured email and will also be displayed in the console

### Configuration

All options are required

| Option       | Required | Description                                                                                                                                                                                                                  |
| ------------ | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region       | &#x2705; | Desired region, see [Supported Regions & Locations](#supported-regions--locations)                                                                                                                                           |
| locations    | &#x2705; | One or more cities/locations, see [Supported Regions & Locations](#supported-regions--locations)                                                                                                                             |
| max_date     | &#x2705; | Latest date to search for appointment (will search all days in the week of the specified date)                                                                                                                               |
| min_date     | &#10060; | Earliest date to search for appointment (will search all days in the week of the specified date)                                                                                                                             |
| email        | &#x2705; | Email (confirmation will be sent to this address)                                                                                                                                                                            |
| phone        | &#x2705; | Phone number (confirmation will be sent to this number)                                                                                                                                                                      |
| personnummer | &#x2705; | Personnummer / Social security number(s), one or multiple when booking for more than one person e.g. `["19940101-8453", "19960101-6406"]`                                                                                    |
| firstname    | &#x2705; | First name(s), one or multiple when booking for more than one person e.g. `["John", "Jane"]`                                                                                                                                 |
| lastname     | &#x2705; | Last name(s), one or multiple when booking for more than one person e.g. `["Doe", "Doe"]`                                                                                                                                    |
| passport     | &#x2705; | Set to `true` if the booking appointment is for passport, else `false`                                                                                                                                                       |
| id           | &#x2705; | Set to `true` if the booking appointment is for national identity card, else `false`                                                                                                                                         |
| confirmation | &#x2705; | Method for receiving booking confirmation `email` and/or `sms`                                                                                                                                                               |
| sessions     | &#x2705; | Number of concurrent booking sessions to run, higher number equals faster checking of available times and opens up for checking several locations in parallel, (will still only book one appointment in the end) **(max 6)** |
| throttle     | &#x2705; | Add a timeout (in seconds) between searches                                                                                                                                                                                  |

### Good to know

- Only one appointment can be booked per email and phone number.
- Both passport & national identity card can be renewed in one appointment, both options can therefore be set to true.
- Searching for appointment for more than one person at a time requires a longer appointment time and are thus harder to find.
- A maximum of 8 people can be booked in one appointment

### Related projects

- [Pass-fur-alle](https://github.com/jonkpirateboy/Pass-fur-alle) - Python & Selenium solution by @jonkpirateboy
- [passport_booker_se](https://github.com/elias123tre/passport_booker_se) - Python based solution by @elias123tre

### Supported Regions & Locations

Supported regions & locations can also be found in the `src/locations.js` file.

#### Blekinge

- Karlshamn
- Karlskrona

#### Dalarna

- Avesta
- Borlänge
- Ludvika
- Mora

#### Gotland

- Visby

#### Gävleborg

- Bollnäs
- Gävle
- Hudiksvall

#### Halland

- Falkenberg
- Halmstad
- Kungsbacka
- Varberg

#### Jämtland

- Funäsdalen
- Strömsund
- Sveg
- Åre
- Östersund

#### Jönköping

- Eksjö
- Jönköping
- Värnamo

#### Kalmar

- Kalmar
- Oskarshamn
- Västervik

#### Kronoberg

- Ljungby
- Växjö
- Älmhult

#### Norrbotten

- Arvidsjaur
- Boden
- Gällivare
- Haparanda
- Kalix
- Kiruna
- Luleå
- Piteå

#### Skåne

- Eslöv
- Helsingborg
- Hässleholm
- Klippan
- Kristianstad
- Landskrona
- Lund
- Malmö
- Trelleborg
- Ystad
- Ängelholm

#### Stockholm

- Flemingsberg
- Globen
- Haninge
- Järva
- Nacka
- Norrtälje
- Sollentuna
- Solna
- Sthlm City
- Södertälje
- Södra Roslagen

#### Södermanland

- Eskilstuna
- Katrineholm
- Nyköping
- Skavsta
- Strängnäs

#### Uppsala

- Enköping
- Tierp
- Uppsala
- Östhammar

#### Värmland

- Arvika
- Karlstad
- Kristinehamn
- Torsby

#### Västerbotten

- Lycksele
- Skellefteå
- Storuman
- Umeå
- Vilhelmina

#### Västernorrland

- Härnösand
- Kramfors
- Sollefteå
- Sundsvall
- Ånge
- Örnsköldsvik

#### Västmanland

- Fagersta
- Köping
- Sala
- Västerås

#### VästraGötaland

- Alingsås
- Borås
- Falköping
- Göteborg
- Lidköping
- Mariestad
- Mark/Kinna
- Mölndal
- Skövde
- Stenungsund
- Strömstad
- Trollhättan
- Uddevalla
- Ulricehamn
- Åmål

#### Örebro

- Hallsberg
- Karlskoga
- Lindesberg
- Vivalla
- Örebro

#### Östergötland

- Linköping
- Motala
- Norrköping
