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
* **region**: Desired region
* **locations**: One or more cities/locations
* **max_date**: Last date to search for appointment (will search all days in the week of the specified date)
* **email**: Your email (confirmation email will be sent to this address)
* **phone**: Your phone number
* **firstname**: Your first name
* **lastname**: Your last name
* **type**: Type of booking (`passport` for passport, or `id` for identity card)

### Supported locations

Supported regions & cities/locations can be found in `src/locations.js`.
