# passport-appointment-bot 🛂🤖

## ⚠️ **For educational use only** ⚠️

Bot to quickly search for and book an appointment for renewal of a Swedish passport.

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
5. A booking confirmation should be sent to the configured email and will also be displayed in the console.

### Supported locations

Currently all regions & cities are not configured for the project.
Supported regions & cities can be found in `src/locations.js`.
Missing regions & cities can easily be added by following the structure of `src/locations.js`.
