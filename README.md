# Midnight NodeJS Framework

## Introduction

Midnight is a NodeJS-based framework, where I used to implement a monitoring website uptime. It allows users to receive SMS notifications about their website's status, using only NodeJS's core functionalities.

## Installation

1. Clone the repository from GitHub.
2. Navigate to the project's root directory.
3. Copy `config-dist.js` from the `lib` directory to `config.js`.
4. Run `node .` in the root directory to start the CLI and the environment.

## Configuration

Edit `config.js` in the `lib` directory to set up your environment and specify your Twilio API credentials for SMS notifications.

## Usage

After starting the application, use the command-line interface to interact with the framework. Available commands include managing user accounts, checks, and viewing logs.

## Features

- Website uptime monitoring
- SMS notifications via Twilio
- CLI for management
- No external dependencies

## Contribution

Contributions are welcome. Please fork the repository and submit pull requests for any enhancements.

## License

This project is licensed under the MIT License. See the LICENSE file in the repository for more details.
