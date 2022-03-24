# passport-appointment-bot 🛂🤖

## ⚠️ **For educational use only** ⚠️

Bot to quickly find and book an appointment for renewal/creation of a Swedish passport or national identity card.

### What does it do?

The bot will scan for available appointments until one is found and successfully booked.
The bot can be configured to search for appointments in a specific region & in one or more cities at a time.

### Prerequisites

- Nodejs _(Tested on v17.7.1)_

### How to run

1. Clone the project, install dependencies with `npm install`
2. Enter desired configuration values in `config.js`
3. Run the bot with `npm start`
4. The bot will automatically exit when an appointment is booked
5. A booking confirmation should be sent to the configured email and will also be displayed in the console

### Configuration
**All options are required**
* **region**: Desired region, see [Supported Regions & Locations](#supported-regions--locations)
* **locations**: One or more cities/locations, see [Supported Regions & Locations](#supported-regions--locations)
* **max_date**: Last date to search for appointment (will search all days in the week of the specified date)
* **email**: Your email (confirmation email will be sent to this address)
* **phone**: Your phone number
* **firstname**: Your first name
* **lastname**: Your last name
* **type**: Type of booking (`passport` for passport, or `id` for identity card)
* **sessions**: Number of concurrent booking sessions to run, higher number equals faster checking of available times and opens up for checking several locations in parallel, (will still only book one appointment in the end) **(max 6)**

### Supported Regions & Locations

Supported regions & locations can also be found in the `src/locations.js` file.

#### Blekinge
* Karlshamn
* Karlskrona

#### Dalarna
* Avesta
* Borlänge
* Ludvika
* Mora

#### Gotland
* Visby

#### Gävleborg
* Bollnäs
* Gävle
* Hudiksvall

#### Halland
* Falkenberg
* Halmstad
* Kungsbacka
* Varberg

#### Jämtland
* Funäsdalen
* Strömsund
* Sveg
* Åre
* Östersund

#### Jönkoping
* Eksjö
* Jönköping
* Värnamo

#### Kalmar
* Kalmar
* Oskarshamn
* Västervik

#### Kronoberg
* Ljungby
* Växjö
* Älmhult

#### Norrbotten
* Arvidsjaur
* Boden
* Gällivare
* Haparanda
* Kalix
* Kiruna
* Luleå
* Piteå

#### Skåne
* Eslöv
* Helsingborg
* Hässleholm
* Klippan
* Kristianstad
* Landskrona
* Lund
* Malmö
* Trelleborg
* Ystad
* Ängelholm

#### Stockholm
* Flemingsberg
* Globen
* Haninge
* Järva
* Nacka
* Norrtälje
* Sollentuna
* Solna
* Sthlm City
* Södertälje
* Södra Roslagen

#### Södermanland
* Eskilstuna
* Katrineholm
* Nyköping
* Skavsta
* Strängnäs

#### Uppsala
* Enköping
* Tierp
* Uppsala
* Östhammar

#### Värmland
* Arvika
* Karlstad
* Kristinehamn
* Torsby

#### Västerbotten
* Lycksele
* Skellefteå
* Storuman
* Umeå
* Vilhelmina

#### Västernorrland
* Härnösand
* Kramfors
* Sollefteå
* Sundsvall
* Ånge
* Örnsköldsvik

#### Västmanland
* Fagersta
* Köping
* Sala
* Västerås

#### VästraGötaland
* Alingsås
* Borås
* Falköping
* Göteborg
* Lidköping
* Mariestad
* Mark/Kinna
* Mölndal
* Skövde
* Stenungsund
* Strömstad
* Trollhättan
* Uddevalla
* Ulricehamn
* Åmål

#### Örebro
* Hallsberg
* Karlskoga
* Lindesberg
* Vivalla
* Örebro

#### Östergötland
* Linköping
* Motala
* Norrköping

