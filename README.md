# passport-appointment-bot 🛂🤖

> Bot to automatically find and book an appointment for renewal/creation of a Swedish passport or national identity card.

> _Bott som söker och automatiskt bokar flrst lediga tid för att förnya pass eller nationellt id kort._

## ⚠️ **For educational use only** ⚠️

### What does it do?

The bot searches for available appointments until one is found, it then tries to book the appointment. The bot will run until an appointment is successfully booked.  
The bot can be configured to search for appointments in a specific region & in one or more cities at a time.  
It can also be configured to run several concurrent booking sessions in order to increase searching speed & search multiple locations at the same time.

### How to run

Download `config.json` & `passport-appointment-bot` for your OS from the [latest release](https://github.com/kalkih/passport-appointment-bot/releases/latest), place them in the same folder.

1. Edit the configuration file you downloaded (`config.json`) with text editor of choice, see [Configuration](#configuration)
2. Run the executable you downloaded `passport-appointment-bot`
3. The bot will automatically exit when an appointment is booked
4. A booking confirmation should be sent to the configured email and will also be displayed in the program

### Run from source

Requires **Nodejs** _(Tested on v17.7.1)_

1. Clone the project, install dependencies with `npm install`
2. Edit configuration values in `config.json`, see [Configuration](#configuration)
3. Run the bot with `npm start`
4. The bot will automatically exit when an appointment is booked
5. A booking confirmation should be sent to the configured email and will also be displayed in the console

### Configuration

All options are required

| Option    | Description                                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region    | Desired region, see [Supported Regions & Locations](#supported-regions--locations)                                                                                                                                           |
| locations | One or more cities/locations, see [Supported Regions & Locations](#supported-regions--locations)                                                                                                                             |
| max_date  | Last date to search for appointment (will search all days in the week of the specified date)                                                                                                                                 |
| email     | Your email (confirmation email will be sent to this address)                                                                                                                                                                 |
| phone     | Your phone number                                                                                                                                                                                                            |
| firstname | Your first name                                                                                                                                                                                                              |
| lastname  | Your last name                                                                                                                                                                                                               |
| type      | Type of booking (`passport` for passport, or `id` for identity card)                                                                                                                                                         |
| sessions  | Number of concurrent booking sessions to run, higher number equals faster checking of available times and opens up for checking several locations in parallel, (will still only book one appointment in the end) **(max 6)** |

### Good to know

Only one appointment can be booked per email and phone number.

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

#### Jönkoping

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
